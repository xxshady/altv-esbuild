import type {
  EventManager,
  IFromNetEvent,
  INetEvent,
  PluginMode,
} from "@/shared"
import type net from "net"

export interface ISocketInfo {
  socket: net.Socket
  eventManager: EventManager<IFromNetEvent, INetEvent>
}

export type Sockets = {
  [key in PluginMode]: ISocketInfo | null
}
