import type { PluginMode } from "./types"

export interface INetEvent {
  "buildStart": (mode: PluginMode, cached?: boolean) => void
  "buildEnd": (mode: PluginMode, cached?: boolean) => void
  "clientConnect": () => void
  "clientDisconnect": () => void
}

export interface IFromNetEvent {
  "connect": (mode: PluginMode) => void
  "clientBuildStart": () => void
  "clientBuildEnd": () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface INetEventJSON<T extends Record<string, any>, K extends keyof T> {
  event: K
  args: Parameters<T[K]>
}
