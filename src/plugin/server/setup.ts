import type { FilledPluginOptions, PluginMode } from "@/shared"
import type esbuild from "esbuild"
import { SharedSetup, ALT_SHARED_VAR, BuildState, ALT_VAR } from "../shared"
import type { IPatchedBuildOptions } from "../shared"
import { codeVarName, Logger } from "../shared/util"
import { NetServer } from "./net-server"
import { nodeBuiltins } from "./nodeBuiltins"

export class ServerSetup extends SharedSetup {
  private readonly hotReloadServer?: NetServer
  private readonly log = new Logger("server")

  private cachedBuildState: Record<PluginMode, BuildState> = {
    client: BuildState.None,
    server: BuildState.None,
  }

  private readonly wasConnectedOnce: Record<PluginMode, boolean> = {
    client: false,
    server: false,
  }

  private readonly onConnectSomeMode = (mode: PluginMode): void => {
    if (!this.wasConnectedOnce[mode]) {
      this.wasConnectedOnce[mode] = true
      return
    }

    const currentState = this.cachedBuildState[mode]
    if (currentState === BuildState.None) return

    this.log.debug("onConnectSomeMode:", mode, "-> sending cached build event:", BuildState[currentState])

    switch (currentState) {
      case BuildState.Start:
        this.sendBuildStart(mode, true)
        break
      case BuildState.End:
        this.sendBuildEnd(mode, true)
        break
    }

    this.cachedBuildState[mode] = BuildState.None
  }

  private readonly onClientBuildStart = (): void => {
    this.log.debug("onClientBuildStart")

    if (this.cacheBuildStateIfNeeded("client", BuildState.End)) {
      this.log.debug("onClientBuildStart but server socket is not connected -> send it on connect")
      return
    }
    if (!this.hotReloadServer?.sockets.server)

      return

    this.log.debug("onClientBuildStart, send server altv-inject buildStart event")

    this.sendBuildStart("client")
  }

  private readonly onClientBuildEnd = (): void => {
    this.log.debug("onClientBuildEnd")

    if (this.cacheBuildStateIfNeeded("client", BuildState.End)) {
      this.log.debug("onClientBuildEnd but server socket is not connected -> send it on connect")
      return
    }
    if (!this.hotReloadServer?.sockets.server) return

    this.log.debug("onClientBuildEnd, send server altv-inject BuildEnd event")

    this.sendBuildEnd("client")
  }

  constructor(
    options: FilledPluginOptions,
    build: esbuild.PluginBuild,
  ) {
    super(options, build)

    const { mode, dev } = options
    if (dev.enabled) {
      if (dev.hotReload) {
        const server = new NetServer(
          mode,
          dev.hotReloadServerPort,
          this.onConnectSomeMode,
          this.onClientBuildStart,
          this.onClientBuildEnd,
        )
        this.hotReloadServer = server

        const cacheBuildStateIfNeeded = this.cacheBuildStateIfNeeded.bind(
          this,
          "server",
        )

        build.onEnd(({ errors }) => {
          if (errors.length) {
            this.log.debug("build.onEnd errors")
            return
          }

          this.log.debug("server buildEnd")

          if (cacheBuildStateIfNeeded(BuildState.End)) {
            this.log.debug("buildEnd but server socket is not connected -> send it on connect")
            return
          }
          if (!server.sockets.server) return

          this.log.debug("send buildEnd")
          this.sendBuildEnd("server")
        })

        build.onStart(() => {
          if (cacheBuildStateIfNeeded(BuildState.Start)) {
            this.log.debug("buildStart but server socket is not connected -> send it on connect")
            return
          }
          if (!server.sockets.server) return

          this.log.debug("send buildStart")
          this.sendBuildStart("server")
        })
      }
    }

    this.addExternalImportHandling(build, "alt-server", ALT_VAR)
  }

  public handleBuildOptions(): IPatchedBuildOptions {
    const buildOptions = super.handleBuildOptions()

    const altServerIdx = buildOptions.external.indexOf("alt-server")
    if (altServerIdx !== -1)
      buildOptions.external.splice(altServerIdx, 1)

    if (this.options.dev.moveExternalsOnTop) {
      const createRequireVar = codeVarName("createRequire")
      const customRequireVar = codeVarName("customRequire")

      this.enableMoveExternalImportsOnTop(
        buildOptions,
        nodeBuiltins,
        (`import { createRequire as ${createRequireVar} } from 'module';
const ${customRequireVar} = ${createRequireVar}(import.meta.url);
`),

        // who wrote this demonic fuckery?
        (
          path,
          externalVarName, // if its null its built-in node js module whose name starts with "node:"
        ) => (`
            try {
              module.exports = ${customRequireVar}('${path}')
            } catch (e) {
              ${
  /* eslint-disable @typescript-eslint/indent */
                externalVarName
                  ? `
                        if (!(
                          e.code === 'ERR_REQUIRE_ESM' ||
                          e.code === 'MODULE_NOT_FOUND' // altv resource import error fix
                        )) {
                          try {
                            ${ALT_SHARED_VAR}.nextTick(() => ${ALT_SHARED_VAR}.logError(e?.stack))
                          } catch {}
                        }
                        Object.defineProperty(exports, '__esModule', { value: true })
                        for (const key in ${externalVarName}) {
                          exports[key] = ${externalVarName}[key]
                        }`
                  : `${ALT_SHARED_VAR}.nextTick(() => ${ALT_SHARED_VAR}.logError("Failed to import nodejs built in module name: '${path}'", e?.stack))`
                }
              }
        `),
          /* eslint-enable @typescript-eslint/indent */
        "node:",
      )
    }

    this.endBannerJs(buildOptions)
    this.endFooterJs(buildOptions)

    return buildOptions
  }

  private sendBuildStart(mode: PluginMode, cached = false): void {
    this.hotReloadServer?.sendEvent("server", "buildStart", mode, cached)
  }

  private sendBuildEnd(mode: PluginMode, cached = false): void {
    this.hotReloadServer?.sendEvent("server", "buildEnd", mode, cached)
  }

  private cacheBuildStateIfNeeded(mode: PluginMode, buildState: BuildState): boolean {
    if (this.hotReloadServer?.sockets.server) return false
    if (!this.wasConnectedOnce[mode]) return false

    if (this.cachedBuildState[mode] === buildState) {
      this.log.debug("[cacheBuildStateIfNeeded] mode:", mode, BuildState[buildState], "already cached")
      return true
    }

    this.log.debug("cache mode:", mode, "buildState:", BuildState[buildState])

    this.cachedBuildState[mode] = buildState

    return true
  }
}
