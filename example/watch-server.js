import { watch } from "./watch-shared.js"

watch({
  esbuild: {
    platform: "node",
    entryPoints: ["./src/server/main.ts"],
    outfile: "./dist/server.js",
  },
  altvEsbuild: {
    mode: "server",
  }
})
