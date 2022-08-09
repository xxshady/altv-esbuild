import esbuild from "esbuild"
import * as shared from "../build-src/shared"

const watch = shared.ESBUILD_OPTIONS.watch

esbuild.build({
  ...shared.ESBUILD_OPTIONS,
  watch,
  entryPoints: ["altv-enums/src/main.ts"],
  outfile: "altv-enums/dist/main.js",
  platform: 'node',
  external: [
    'esbuild'
  ],
})
