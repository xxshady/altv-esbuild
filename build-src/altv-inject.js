import { ctxWrapper } from "./ctx-wrapper.js"

ctxWrapper({
  entryPoints: ["src/altv-inject/main.ts"],
  outfile: "dist/altv-inject/main.js",
  external: [
    "alt-shared",
    "alt-client",
    "alt-server",
    "natives",
    "net",
    "path",
    "fs",
    "crypto",
    "process",
  ],
})
