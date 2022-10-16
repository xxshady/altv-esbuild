import type { FilledPluginOptions } from "@/shared"

const playersReconnect = true

export const OPTIONS_DEFAULTS: FilledPluginOptions = {
  mode: "client", // set by user anyway
  dev: {
    enabled: true,

    // with dev mode enabled values:
    hotReload: true,
    hotReloadServerPort: 8877,
    playersReconnect,
    playersReconnectDelay: 200,
    playersReconnectResetPos: playersReconnect,
    connectionCompleteEvent: true,
    disconnectEvent: true,
    restartCommand: true,
    topLevelExceptionHandling: true,
    moveExternalsOnTop: true,
    enhancedRestartCommand: false,
  },
  bugFixes: {
    webViewFlickering: true,
    playerPrototype: true,
  },
  altvEnums: false,
  enhancedAltLog: true,
}
