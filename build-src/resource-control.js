import * as shared from "./shared"
import copyStaticFiles from "esbuild-copy-static-files"
import { ctxWrapper } from "./ctx-wrapper"

await ctxWrapper({
  platform: "node",
  entryPoints: ["src/resource-control/main.ts"],
  outfile: "dist/__altv-esbuild-resource-control/main.js",
  external: [
    "alt-shared",
    "alt-server", 
  ],
  plugins: [
    copyStaticFiles({
      src: "src/resource-control/resource.toml",
      dest: "dist/__altv-esbuild-resource-control/resource.toml",
    })
  ],
})
