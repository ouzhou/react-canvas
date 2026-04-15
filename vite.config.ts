import { defineConfig } from "vite-plus";

export default defineConfig({
  /**
   * 根目录 `vp test` 不会自动合并子包里的 `vite.config`，因此须在此声明 `setupFiles`，
   * 否则 `packages/react-v2` 的 WASM mock 不执行，会出现 canvaskit.wasm ENOENT。
   */
  test: {
    setupFiles: ["./packages/react-v2/tests/setup.ts"],
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  run: {
    // // `cache: true` 会开启对 package.json 脚本的缓存；`astro dev` 等常驻进程不应被缓存，否则会卡住。
    // cache: { scripts: false, tasks: true },
  },
});
