import { altvEsbuild } from "altv-esbuild"
import esbuild from "esbuild"
import { SHARED_ALTV_ESBUILD_OPTIONS } from "./watch-shared"

esbuild.build({
  watch: true,
  bundle: true,
  target: "esnext",
  logLevel: "info",
  format: "esm",
  entryPoints: ["./src/client/main.ts"],
  outfile: "./dist/client.js",
  plugins: [
    altvEsbuild({
      ...SHARED_ALTV_ESBUILD_OPTIONS,
      mode: "client",
    })
  ],
})
