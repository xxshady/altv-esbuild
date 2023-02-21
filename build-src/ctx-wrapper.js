import esbuild from "esbuild"
import * as shared from "./shared"

export const ctxWrapper = async (buildOptions) => {
  const ctx = await esbuild.context({
    ...shared.ESBUILD_OPTIONS,
    ...buildOptions
  })
  
  console.log('watch:', shared.watch)
  if (shared.watch) {
    console.log('starting watch')
    await ctx.watch()
  } else {
    console.log('building')
    ctx.rebuild()
    console.log('disposing')
    ctx.dispose()
  }
}
