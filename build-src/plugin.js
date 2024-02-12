import { typesGenerator } from "./types-generator.js"
import { onBuildEnd } from "./on-build-end.js"
import { ctxWrapper } from "./ctx-wrapper.js"

ctxWrapper({
  entryPoints: ["src/plugin/main.ts"],
  outfile: "dist/plugin/main.js",
  platform: 'node',
  plugins: [
    onBuildEnd(typesGenerator())
  ],
})
