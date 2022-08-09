import { build } from "esbuild"
import { altvEsbuild } from "altv-esbuild"

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
      mode: "server",
      dev: true, // enables hot reload automatically
      altvEnums: true,
    })
  ],
})
