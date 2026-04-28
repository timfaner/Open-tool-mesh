import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";

export async function findWorkspaceRoot(startDir = process.cwd()): Promise<string> {
  let current = resolve(startDir);

  while (true) {
    try {
      await access(resolve(current, "pnpm-workspace.yaml"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new Error(`Unable to locate OpenTool Mesh workspace root from ${startDir}`);
      }
      current = parent;
    }
  }
}

export function fileDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}
