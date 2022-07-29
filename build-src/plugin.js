import esbuild from "esbuild"
import * as shared from "./shared"
import { typesGenerator } from "./types-generator"

const watch = shared.ESBUILD_OPTIONS.watch && { onRebuild: typesGenerator() }

esbuild.build({
  ...shared.ESBUILD_OPTIONS,
  watch,
  entryPoints: ["src/plugin/main.ts"],
  outfile: "dist/plugin/main.js",
  platform: 'node',
}).then(typesGenerator())
