import type { FilledPluginOptions, IPluginDevOption, IPluginOptions } from "@/shared"
import { OPTIONS_DEFAULTS } from "./defaults"

export const mergeOptions = ({
  mode,
  dev,
  bugFixes,
  altvEnums,
  enhancedAltLog,
  altDefaultImport,
}: Readonly<IPluginOptions>): FilledPluginOptions => {
  if (typeof mode == null)
    throw new Error("mode option must be provided: \"server\" or \"client\"")

  dev ??= false

  return {
    mode,

    dev: (dev === true
      ? { ...OPTIONS_DEFAULTS.dev, enabled: true }
      : (devIsDisabled(dev)
        // set all options to false or -1
        ? {
          ...Object.fromEntries(
            Object.entries(
              OPTIONS_DEFAULTS.dev,
            ).map(([key, value]) => [key, typeof value === "boolean" ? false : -1]),
          ) as FilledPluginOptions["dev"],
          enabled: false,
        }
        : {
          ...OPTIONS_DEFAULTS.dev,
          ...dev,
          playersReconnectResetPos:
            (dev as IPluginDevOption).playersReconnectResetPos ??
            (dev as IPluginDevOption).playersReconnect ??
            OPTIONS_DEFAULTS.dev.playersReconnectResetPos,
        })
    ),

    bugFixes: bugFixes === true
      ? OPTIONS_DEFAULTS.bugFixes
      : { ...OPTIONS_DEFAULTS.bugFixes, ...bugFixes },

    altvEnums: altvEnums ?? OPTIONS_DEFAULTS.altvEnums,

    enhancedAltLog: enhancedAltLog ?? OPTIONS_DEFAULTS.enhancedAltLog,

    altDefaultImport: altDefaultImport ?? OPTIONS_DEFAULTS.altDefaultImport,
  }
}

function devIsDisabled(dev: boolean | IPluginDevOption): boolean {
  return dev === false || (dev as IPluginDevOption).enabled === false
}
