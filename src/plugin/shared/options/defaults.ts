// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { FilledPluginOptions } from "@/shared"

const playersReconnect = true

export const OPTIONS_DEFAULTS = {
  mode: "client", // set by user anyway
  dev: {
    enabled: true,

    // with dev mode enabled values:
    hotReload: true,
    hotReloadServerPort: 8877,
    hotReloadServerHost: "",
    playersReconnect,
    playersReconnectDelay: 200,
    playersReconnectResetPos: playersReconnect,
    connectionCompleteEvent: true,
    disconnectEvent: true,
    restartCommand: true,
    topLevelExceptionHandling: true,
    moveExternalsOnTop: true,
    moveExternalsOnTopIgnore: [],
    enhancedRestartCommand: false,
    serverStartedEvent: true,
    clientServerInstanceValidation: false,
    baseObjectCreateEventEmulation: true,
  },
  bugFixes: {
    webViewFlickering: true,
    playerPrototype: true,
  },
  altvEnums: false,
  enhancedAltLog: false,
  altDefaultImport: false,
} as const satisfies FilledPluginOptions
