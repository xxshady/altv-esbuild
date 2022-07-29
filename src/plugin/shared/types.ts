import type * as esbuild from "esbuild"

export interface IPatchedBuildOptions extends esbuild.BuildOptions {
  banner: { js: string }
  footer: { js: string }
  external: string[]
}
