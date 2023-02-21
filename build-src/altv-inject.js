import esbuild from "esbuild"
import * as shared from "./shared"

const ctx = await esbuild.context({
  ...shared.ESBUILD_OPTIONS,
  entryPoints: ["src/altv-inject/main.ts"],
  outfile: "dist/altv-inject/main.js",
  external: [
    "alt-shared",
    "alt-client", 
    "alt-server", 
    "natives",
    "net",
  ],
})

if (shared.watch) {
  await ctx.watch()
}
