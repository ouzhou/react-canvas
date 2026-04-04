import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { vi } from "vite-plus/test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const testsDir = dirname(fileURLToPath(import.meta.url));
const coreDir = join(testsDir, "../../core");
const requireFromCore = createRequire(join(coreDir, "package.json"));

vi.mock("../../core/src/canvaskit-locate.ts", () => {
  const wasmPath = requireFromCore.resolve("canvaskit-wasm/bin/canvaskit.wasm");
  const dir = wasmPath.slice(0, wasmPath.lastIndexOf("/") + 1);
  const base = pathToFileURL(dir).href;
  return {
    canvasKitLocateFile(file: string): string {
      return `${base}${file}`;
    },
  };
});
