import type { IFromNetEvent, INetEvent, PluginMode } from "@/shared"
import { EventManager } from "@/shared"
import net from "net"
import { Logger } from "../../shared/util"
import type { Sockets } from "./types"

export class NetServer {
  private readonly onStartListening = (): void => {
    // this.log.info("start listening on port:", this.currentPort)
    this.log.info("started listening on port:", this.port)
  }

  private readonly onConnect = (socket: net.Socket): void => {
    this.log.debug("some client connected")

    let socketMode = "unknown"

    const eventManager = new EventManager<IFromNetEvent, INetEvent>(
      socket,
      {
        connect: (mode): void => {
          if (this._sockets[mode]) {
            this.log.error(`another socket mode: ${mode} is connected currently`)
            socket.destroy()
            eventManager.destroy()
            return
          }

          socketMode = mode

          this.log.info(`connected socket mode: ${mode}`)

          this._sockets[mode] = { socket, eventManager }
          socket.on("close", this.onSocketClose.bind(this, mode))

          if (mode === "client" || (mode === "server" && this._sockets.client))
            this._sockets.server?.eventManager.send("clientConnect")

          this.connectModeHandler(mode)
        },
        clientBuildStart: (): void => {
          this.clientBuildStartHandler()
        },
        clientBuildEnd: (): void => {
          this.clientBuildEndHandler()
        },
      },
      (msg, e) => this.onSocketError(socketMode as PluginMode, msg, e),
    )
  }

  private readonly onError = (e: Error): void => {
    if ((e as { code?: string }).code === "EADDRINUSE")
      this.onErrorAddrInUse()

    this.log.error("server error:", e)
  }

  private readonly onSocketError = (
    mode: PluginMode,
    msg: string,
    e?: Error & { code?: string },
  ): void => {
    if (e?.code === "ECONNRESET") {
      this.log.debug(`disconnected socket mode: ${mode}`)
      return
    }
    this.log.error(`socket mode: '${mode}' msg: '${msg}' error:`, e)
  }

  private readonly onSocketClose = (mode: PluginMode): void => {
    this._sockets[mode]?.eventManager.destroy()
    this._sockets[mode] = null
    this.log.info(`disconnected socket mode: ${mode}`)
  }

  private readonly log = new Logger("NetServer")
  private readonly server = new net.Server(this.onConnect)
  private readonly onErrorAddrInUse: () => void
  private readonly _sockets: Sockets = {
    client: null,
    server: null,
  }

  constructor(
    private readonly mode: PluginMode,
    private readonly port: number,
    private readonly host: string,
    private readonly connectModeHandler: (mode: PluginMode) => void,
    private readonly clientBuildStartHandler: () => void,
    private readonly clientBuildEndHandler: () => void,
  ) {
    this.tryListen(port, host)
    this.server.on("error", this.onError)
    this.server.on("listening", this.onStartListening)

    this.onErrorAddrInUse = (): void => {
      this.log.error("port:", this.port, "already in use")
      process.exit()
    }
  }

  public get sockets(): Readonly<Sockets> {
    return this._sockets
  }

  public sendEvent<K extends keyof INetEvent>(mode: PluginMode, event: K, ...args: Parameters<INetEvent[K]>): void {
    const targetSocket = this._sockets[mode]

    if (!targetSocket) {
      this.log.error(`[sendEvent] event: ${event} no target socket mode: ${mode}`)
      return
    }

    targetSocket.eventManager.send(event, ...args)
  }

  private tryListen(port: number, host: string): void {
    this.server.listen(
      port,
      host === "" ? undefined : host,
    )
  }
}
