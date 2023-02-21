import { argv } from "process"

const [,, dev] = argv
const devMode = dev === "-dev"
export const watch = devMode

export const ESBUILD_OPTIONS = {
  bundle: true,
  target: "esnext",
  format: "esm",
  logLevel: "info",
  define: {
    "___DEVMODE": `${devMode}`
  },
  minify: !devMode,
}
