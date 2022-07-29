import { altvEsbuild } from "altv-esbuild"
import esbuild from "esbuild"

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
      mode: "client",
      dev: true, // enables hot reload automatically
    })
  ],
})
