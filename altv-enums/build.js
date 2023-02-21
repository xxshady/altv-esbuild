import { ctxWrapper } from "../build-src/ctx-wrapper"

ctxWrapper({
  entryPoints: ["altv-enums/src/main.ts"],
  outfile: "altv-enums/dist/main.js",
  platform: 'node',
  external: [
    'esbuild'
  ],
})
