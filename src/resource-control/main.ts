import * as alt from "alt-server"
import { PLUGIN_NAME } from "@/shared/constants"

const log = {
  debug: ___DEVMODE
    ? (...args: unknown[]): void => {
      alt.log("[DEBUG][altv-esbuild][resource-control]", ...args)
    }
    : (): void => {},
  error(...args: unknown[]): void {
    alt.logError("[altv-esbuild][resource-control]", ...args)
  },
}

const generateEventName = (name: string): string => {
  return `___${PLUGIN_NAME}:${name}___`
}

let restartCommand = "res"
let mainResourceName: string | null = null

alt.once(generateEventName("resourceControlInit"), (resourceName, commandName) => {
  log.debug("resource name:", resourceName)
  log.debug("restart command name:", commandName)

  mainResourceName = resourceName
  restartCommand = commandName
})

const triggerRestart = (): void => {
  if (!mainResourceName) {
    log.error("main resource name is unknown, cannot restart")
    return
  }

  const valid = alt.Resource.getByName(mainResourceName)?.valid

  log.debug("resource valid:", valid)
  if (!valid) {
    log.debug("starting resource")
    alt.startResource(mainResourceName)
  }
  else {
    log.debug("restarting resource")
    alt.restartResource(mainResourceName)
  }
}

new alt.Utils.ConsoleCommand(restartCommand, triggerRestart)

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
alt.onClient(generateEventName("restartCommand"), () => {
  triggerRestart()
})

alt.emit(generateEventName("resourceControlReady"))
log.debug("ready")
