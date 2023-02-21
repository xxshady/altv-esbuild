import { watch } from "./watch-shared"

watch({
  esbuild: {
    entryPoints: ["./src/client/main.ts"],
    outfile: "./dist/client.js",
  },
  altvEsbuild: {
    mode: "client",
  }
})
