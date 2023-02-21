import { watch } from "./watch-shared"

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
