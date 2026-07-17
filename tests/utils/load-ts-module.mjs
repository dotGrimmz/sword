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

const IMPORT_RE =
  /(?<=(?:^|\n)import\s+(?!type\b)[^"'`]*?\sfrom\s+)["'](@\/[^"']+|\.{1,2}\/[^"']+)["']/g;

const resolveImportPath = (fromFile, specifier) => {
  if (specifier.startsWith("@/")) {
    return path.resolve(ROOT_DIR, specifier.slice(2));
  }
  return path.resolve(path.dirname(fromFile), specifier);
};

const withTsExtension = (absolutePath) => {
  if (absolutePath.endsWith(".ts") || absolutePath.endsWith(".tsx")) {
    return absolutePath;
  }
  return `${absolutePath}.ts`;
};

/**
 * Transpile a TS module and recursively rewrite local/@ imports to data URLs
 * so node:test can load split modules without a bundler.
 */
export const loadTsModule = async (relativePath, cache = new Map()) => {
  const loaded = await loadTsModuleEntry(relativePath, cache);
  return loaded.module;
};

const loadTsModuleEntry = async (relativePath, cache) => {
  const absolutePath = withTsExtension(path.resolve(ROOT_DIR, relativePath));

  if (cache.has(absolutePath)) {
    return cache.get(absolutePath);
  }

  let settle;
  const pending = new Promise((resolve, reject) => {
    settle = { resolve, reject };
  });
  // Store the promise so concurrent loads share one build.
  cache.set(absolutePath, pending);

  try {
    let source = await readFile(absolutePath, "utf8");
    source = source.replace(/^import\s+type\s+[^;]+;?\s*$/gm, "");

    const specifiers = [...source.matchAll(IMPORT_RE)].map((match) => match[1]);
    const rewrittenSpecifiers = new Map();

    for (const specifier of specifiers) {
      const depAbsolute = withTsExtension(
        resolveImportPath(absolutePath, specifier)
      );
      const depEntry = await loadTsModuleEntry(
        path.relative(ROOT_DIR, depAbsolute),
        cache
      );
      rewrittenSpecifiers.set(specifier, depEntry.moduleUrl);
    }

    let rewrittenSource = source;
    for (const [specifier, moduleUrl] of rewrittenSpecifiers) {
      rewrittenSource = rewrittenSource.replaceAll(
        `"${specifier}"`,
        `"${moduleUrl}"`
      );
      rewrittenSource = rewrittenSource.replaceAll(
        `'${specifier}'`,
        `"${moduleUrl}"`
      );
    }

    const transpiled = ts.transpileModule(rewrittenSource, {
      compilerOptions: COMPILER_OPTIONS,
      fileName: path.basename(absolutePath),
    });

    const moduleUrl = `data:text/javascript;base64,${Buffer.from(
      transpiled.outputText
    ).toString("base64")}`;

    const imported = await import(moduleUrl);
    const entry = { module: imported, moduleUrl };
    cache.set(absolutePath, entry);
    settle.resolve(entry);
    return entry;
  } catch (error) {
    cache.delete(absolutePath);
    settle.reject(error);
    throw error;
  }
};
