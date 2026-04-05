const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const ROOT = process.argv[2] || ".";

function scanFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true
  );

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart()
      );

      console.log(`${filePath}:${line + 1}:${character + 1} -> any`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (file === "node_modules" || file === ".git") continue;
      walk(full);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      scanFile(full);
    }
  }
}

walk(ROOT);