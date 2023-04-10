// src/resource-control/main.ts
import * as alt from "alt-server";

// src/shared/constants.ts
var PLUGIN_NAME = "altv-esbuild";

// src/resource-control/main.ts
var log2 = {
  debug: true ? (...args) => {
    alt.log("[DEBUG][altv-esbuild][resource-control]", ...args);
  } : () => {
  },
  error(...args) {
    alt.logError("[altv-esbuild][resource-control]", ...args);
  }
};
var generateEventName = (name) => {
  return `___${PLUGIN_NAME}:${name}___`;
};
var restartCommand = "res";
var mainResourceName = null;
alt.once(generateEventName("resourceControlInit"), (resourceName, commandName) => {
  log2.debug("resource name:", resourceName);
  log2.debug("restart command name:", commandName);
  mainResourceName = resourceName;
  restartCommand = commandName;
});
var triggerRestart = () => {
  if (!mainResourceName) {
    log2.error("main resource name is unknown, cannot restart");
    return;
  }
  let valid = true;
  try {
    alt.Resource.getByName(mainResourceName)?.isStarted;
  } catch {
    valid = false;
  }
  log2.debug("resource valid:", valid);
  if (!valid) {
    log2.debug("starting resource");
    alt.startResource(mainResourceName);
  } else {
    log2.debug("restarting resource");
    alt.restartResource(mainResourceName);
  }
};
alt.on("consoleCommand", (command) => {
  if (command !== restartCommand)
    return;
  triggerRestart();
});
alt.onClient(generateEventName("restartCommand"), () => {
  triggerRestart();
});
alt.emit(generateEventName("resourceControlReady"));
log2.debug("ready");
