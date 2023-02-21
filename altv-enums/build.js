import esbuild from "esbuild"
import * as shared from "../build-src/shared"

const watch = shared.watch

const ctx = await esbuild.context({
  ...shared.ESBUILD_OPTIONS,
  entryPoints: ["altv-enums/src/main.ts"],
  outfile: "altv-enums/dist/main.js",
  platform: 'node',
  external: [
    'esbuild'
  ],
})

if (watch) {
  await ctx.watch()
}
