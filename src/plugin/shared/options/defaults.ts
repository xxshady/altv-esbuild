import type { FilledPluginOptions } from "@/shared"

export const OPTIONS_DEFAULTS: FilledPluginOptions = {
  mode: "client", // set by user anyway
  dev: {
    enabled: true,

    // with dev mode enabled values:
    hotReload: true,
    hotReloadServerPort: 8877,
    playersReconnect: true,
    playersReconnectDelay: 200,
    connectionCompleteEvent: true,
    disconnectEvent: true,
    restartCommand: true,
    topLevelExceptionHandling: true,
    moveExternalsOnTop: true,
  },
  bugFixes: {
    webViewFlickering: true,
    playerPrototype: true,
  },
}
