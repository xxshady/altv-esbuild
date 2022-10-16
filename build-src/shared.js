import { argv } from "process"

const [,, dev] = argv
const devMode = dev === "-dev"
const watch = devMode

export const ESBUILD_OPTIONS = {
  bundle: true,
  watch,
  target: "esnext",
  format: "esm",
  logLevel: "info",
  define: {
    "___DEVMODE": devMode
  },
  minify: !devMode,
}
