#!/usr/bin/env node
const replaceInFiles = require("replace-in-files");
const prompt = require("prompt-sync")();

replaceInFiles({
  files: ["./package.json", "./src/index.ts"],
  from: /TModule/g,
  to: prompt("Enter your module name: "),
});