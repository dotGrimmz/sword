import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2020,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
};

export const loadTsModule = async (relativePath) => {
  const absolutePath = path.resolve(ROOT_DIR, relativePath);
  const source = await readFile(absolutePath, "utf8");

  const transpiled = ts.transpileModule(source, {
    compilerOptions: COMPILER_OPTIONS,
    fileName: path.basename(relativePath),
  });

  const moduleUrl = new URL(
    `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString(
      "base64"
    )}`
  );

  return import(moduleUrl.href, {
    assert: { type: "javascript" },
  });
};
