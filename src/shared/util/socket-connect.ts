import type net from "net"

export class SocketConnect {
  private static readonly RECONNECT_MS = 500

  private readonly logDebug = ___DEVMODE
    ? (info: string): void => console.log(`[${this.name}][DEBUG]`, info)
    : (): void => {}

  private readonly onError = (e: Error & { code?: string }): void => {
    if (!(e?.code === "ECONNRESET" || e?.code === "ECONNREFUSED")) return

    this.logDebug(`disconnected from server, trying reconnecting in ${SocketConnect.RECONNECT_MS}ms...`)

    setTimeout(
      () => this.connect(),
      SocketConnect.RECONNECT_MS,
    )
  }

  private readonly onConnect = (socket: net.Socket): void => {
    this.connectHandler(socket)
  }

  private _socket: net.Socket

  constructor(
    private readonly name: string,
    private readonly _net: typeof net,
    private readonly port: number,
    private readonly connectHandler: (socket: net.Socket) => void,
  ) {
    this._socket = this.connect()
  }

  public get socket(): net.Socket {
    return this._socket
  }

  private connect(): net.Socket {
    if (this._socket) this._socket.destroy()

    const socket = this._net.connect(this.port)

    socket.on("connect", this.onConnect.bind(this, socket))
    socket.on("error", this.onError)

    return socket
  }
}
