import esbuild from "esbuild"
import * as shared from "./shared"
import { typesGenerator } from "./types-generator"
import { onBuildEnd } from "./on-build-end"

// esbuild.build({
// }).then(typesGenerator())

const ctx = await esbuild.context({
  ...shared.ESBUILD_OPTIONS,
  entryPoints: ["src/plugin/main.ts"],
  outfile: "dist/plugin/main.js",
  platform: 'node',
  plugins: [
    onBuildEnd(typesGenerator())
  ],
})

if (shared.watch) {
  await ctx.watch()
}
