import { sharedSetup } from "./setup"

export const SERVER_EVENTS = {
  restartCommand: sharedSetup.generateEventName("restartCommand"),
  clientReady: sharedSetup.generateEventName("clientReady"),

  // playerDamageOnFirstConnect altv bug fix
  playerModelsLoaded: sharedSetup.generateEventName("playerModelsLoaded"),
} as const

export const CLIENT_EVENTS = {
  playerConnect: sharedSetup.generateEventName("playerConnect"),
  connectionComplete: sharedSetup.generateEventName("connectionComplete"),

  // playerDamageOnFirstConnect altv bug fix
  loadPlayerModels: sharedSetup.generateEventName("loadPlayerModels"),
} as const
