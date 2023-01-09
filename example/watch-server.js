import { build } from "esbuild"
import { altvEsbuild } from "altv-esbuild"
import { SHARED_ALTV_ESBUILD_OPTIONS } from './watch-shared'

console.log('SHARED_ALTV_ESBUILD_OPTIONS:', SHARED_ALTV_ESBUILD_OPTIONS)

build({
  watch: true,
  bundle: true,
  target: "esnext",
  platform: "node",
  logLevel: "info",
  format: "esm",
  entryPoints: ["./src/server/main.ts"],
  outfile: "./dist/server.js",
  plugins: [
    altvEsbuild({
      ...SHARED_ALTV_ESBUILD_OPTIONS,
      mode: "server",
    })
  ],
})
