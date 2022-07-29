import type * as esbuild from "esbuild"
import { mergeOptions } from "./shared"
import { ClientSetup } from "./client"
import { ServerSetup } from "./server"
import type { IPluginOptions } from "@/shared"
import { PLUGIN_NAME } from "@/shared"
import { Logger } from "./shared/util"

export const altvEsbuild = (userOptions: Readonly<IPluginOptions>): esbuild.Plugin => {
  const options = mergeOptions(userOptions)

  const log = new Logger("plugin")
  log.debug("merged options:", options)

  return {
    name: PLUGIN_NAME,
    setup(build: esbuild.PluginBuild): void {
      const {
        initialOptions,
      } = build

      const modeSetup = (options.mode === "client")
        ? new ClientSetup(options, build)
        : new ServerSetup(options, build)

      const buildOptions = modeSetup.handleBuildOptions()

      Object.assign(initialOptions, buildOptions)
    },
  }
}
