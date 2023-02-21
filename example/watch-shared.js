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
        dev: true, // enables hot reload automatically

        // see docs for more info about these options:
        altvEnums: true, 
        bugFixes: {
          playerDamageOnFirstConnect: true,
        },
        
        ...altvEsbuildOptions,
      })
    ],

    ...esbuildOptions,
  })

  ctx.watch()
}
