import { altvEsbuild } from "altv-esbuild"
import esbuild from "esbuild"

export const watch = async ({
  esbuild: esbuildOptions,
  altvEsbuild: altvEsbuildOptions,
}) => {
  const ctx = await esbuild.context({
    bundle: true,
    target: "esnext",
    logLevel: "info",
    format: "esm",
    plugins: [
      altvEsbuild({
        // hot reload is enabled by default
        dev: {
          enhancedRestartCommand: true,
        },

        ...altvEsbuildOptions,
      })
    ],

    ...esbuildOptions,
  })

  ctx.watch()
}
