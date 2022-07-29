import { sharedSetup } from "./setup"

export const SERVER_EVENTS = {
  restartCommand: sharedSetup.generateEventName("restartCommand"),
  clientReady: sharedSetup.generateEventName("clientReady"),
} as const

export const CLIENT_EVENTS = {
  playerConnect: sharedSetup.generateEventName("playerConnect"),
  connectionComplete: sharedSetup.generateEventName("connectionComplete"),
} as const
