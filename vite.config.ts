import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
  run: {
    // `cache: true` 会开启对 package.json 脚本的缓存；`astro dev` 等常驻进程不应被缓存，否则会卡住。
    cache: { scripts: false, tasks: true },
  },
});
