import type { FilledPluginOptions, IFromNetEvent, INetEvent } from "@/shared"
import { EventManager } from "@/shared"
import type esbuild from "esbuild"
import type { IPatchedBuildOptions } from "../shared"
import { ALT_NATIVES_VAR, ALT_VAR, SharedSetup } from "../shared"
import net from "net"
import { Logger } from "../shared/util"
import { SocketConnect } from "@/shared/util"

export class ClientSetup extends SharedSetup {
  private readonly events: INetEvent = {
    buildEnd: () => {},
    buildStart: () => {},
    clientConnect: () => {},
    clientDisconnect: () => {},
  }

  private readonly onConnect = (): void => {
    this.log.info("connected to server")

    this.eventManager?.send("connect", "client")
  }

  private readonly log = new Logger("client")

  private socket?: net.Socket
  private eventManager?: EventManager<INetEvent, IFromNetEvent>
  private socketConnect?: SocketConnect

  constructor(
    options: FilledPluginOptions,
    build: esbuild.PluginBuild,
  ) {
    super(options, build)

    const { dev } = options
    if (dev.hotReload) {
      this.socketConnect = new SocketConnect(
        "plugin-client",
        net,
        this.options.dev.hotReloadServerPort,
        (socket) => {
          this.socket = socket
          this.eventManager = new EventManager(
            this.socket,
            this.events,
            (msg) => this.log.error("[events]", msg),
          )

          this.onConnect()
        })

      build.onStart(() => {
        this.eventManager?.send("clientBuildStart")
      })

      build.onEnd(({ errors }) => {
        if (errors.length) {
          this.log.debug("client build end errors")
          return
        }

        this.eventManager?.send("clientBuildEnd")
      })
    }

    this.addExternalImportHandling(build, "alt-client", ALT_VAR)
    this.addExternalImportHandling(build, "natives", ALT_NATIVES_VAR)
  }

  public handleBuildOptions(): IPatchedBuildOptions {
    const buildOptions = super.handleBuildOptions()

    const altClientIdx = buildOptions.external.indexOf("alt-client")
    if (altClientIdx !== -1)
      buildOptions.external.splice(altClientIdx, 1)

    const nativesIdx = buildOptions.external.indexOf("natives")
    if (nativesIdx !== -1)
      buildOptions.external.splice(nativesIdx, 1)

    if (this.options.dev.moveExternalsOnTop)
      this.enableMoveExternalImportsOnTop(buildOptions)

    this.endBannerJs(buildOptions)
    this.endFooterJs(buildOptions)

    return buildOptions
  }
}
