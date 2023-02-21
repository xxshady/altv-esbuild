import esbuild from "esbuild"
import * as shared from "./shared"
import { typesGenerator } from "./types-generator"

const watch = shared.watch && { onRebuild: typesGenerator() }

// esbuild.build({
// }).then(typesGenerator())

const ctx = await esbuild.context({
  ...shared.ESBUILD_OPTIONS,
  entryPoints: ["src/plugin/main.ts"],
  outfile: "dist/plugin/main.js",
  platform: 'node',
})

// TEST
console.log('build plugin watch:', watch)
if (watch) {
  console.log('build plugin yes watch')
  await ctx.watch()
}
