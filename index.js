#!/usr/bin/env node

import { readFileSync, writeFileSync, appendFileSync, existsSync, statSync, readdirSync } from "fs";
import { join, basename } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let showAll = false;
let directory = "";
let maxDepth = -1;

function showUsage() {
  console.log("Usage: generate-tree [--A | --F] [--<number>] /path/to/directory");
  console.log("Options:");
  console.log("  --A         Show all files and folders");
  console.log("  --F         Show only folders (default)");
  console.log("  --<number>  Maximum depth level (e.g., --3 for 3 levels)");
  process.exit(1);
}

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--A") {
    showAll = true;
  } else if (arg === "--F") {
    showAll = false;
  } else if (arg.match(/^--\d+$/)) {
    maxDepth = parseInt(arg.slice(2));
  } else if (arg === "-h" || arg === "--help") {
    showUsage();
  } else if (!directory) {
    directory = arg;
  } else {
    console.error("Error: Multiple directory paths provided");
    showUsage();
  }
}

if (!directory) {
  console.error("Error: No directory path provided");
  showUsage();
}

const outputFile = "directory_structure.txt";

if (!existsSync(directory) || !statSync(directory).isDirectory()) {
  console.error("Error: Directory does not exist");
  process.exit(1);
}

function findDescription(dir) {
  const files = ["README.md", "description.txt", "package.json"];

  for (const file of files) {
    const filePath = join(dir, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, "utf8");

      if (file === "README.md") {
        const lines = content.split("\n");
        const firstNonEmptyLine = lines.find((line) => line.trim());
        if (firstNonEmptyLine) {
          return `# ${firstNonEmptyLine.replace(/^#*\s*/, "")}`;
        }
      } else if (file === "description.txt") {
        const firstLine = content.split("\n")[0];
        return `# ${firstLine}`;
      } else if (file === "package.json") {
        try {
          const pkg = JSON.parse(content);
          if (pkg.description) {
            return `# ${pkg.description}`;
          }
        } catch (e) {}
      }
    }
  }

  const sourceFiles = readdirSync(dir).filter((file) => /\.(js|ts|jsx|tsx|css|scss)$/.test(file));

  for (const file of sourceFiles) {
    const filePath = join(dir, file);
    const content = readFileSync(filePath, "utf8");
    const lines = content.split("\n");
    const commentLine = lines.find((line) => line.trim().startsWith("//"));
    if (commentLine) {
      return `# ${commentLine.replace(/^\/\/\s*/, "")}`;
    }
  }

  return "";
}

writeFileSync(outputFile, "");

function printTree(prefix, dir, currentDepth = 1) {
  if (maxDepth !== -1 && currentDepth > maxDepth) {
    return;
  }

  let items = readdirSync(dir)
    .filter((item) => !item.startsWith("."))
    .map((item) => join(dir, item))
    .sort();

  if (!showAll) {
    items = items.filter((item) => statSync(item).isDirectory());
  }

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const name = basename(item);
    const isDirectory = statSync(item).isDirectory();
    const connector = isLast ? "└──" : "├──";

    if (isDirectory || showAll) {
      appendFileSync(outputFile, `${prefix}${connector} ${name}${isDirectory ? "/" : ""}\n`);

      if (isDirectory) {
        const newPrefix = prefix + (isLast ? "    " : "│   ");
        printTree(newPrefix, item, currentDepth + 1);
      }
    }
  });
}

const rootName = basename(directory);
const rootComment = findDescription(directory);
appendFileSync(outputFile, rootComment ? `${rootName}/         ${rootComment}\n` : `${rootName}/\n`);

printTree("", directory);

console.log(`Directory structure has been saved to ${outputFile}`);
