import { typesGenerator } from "./types-generator"
import { onBuildEnd } from "./on-build-end"
import { ctxWrapper } from "./ctx-wrapper"

ctxWrapper({
  entryPoints: ["src/plugin/main.ts"],
  outfile: "dist/plugin/main.js",
  platform: 'node',
  plugins: [
    onBuildEnd(typesGenerator())
  ],
})
