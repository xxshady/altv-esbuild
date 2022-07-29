import type { FilledPluginOptions, IPluginOptions } from "@/shared"
import { OPTIONS_DEFAULTS } from "./defaults"

export const mergeOptions = ({
  mode,
  dev,
  bugFixes,
}: Readonly<IPluginOptions>): FilledPluginOptions => {
  if (typeof mode == null)
    throw new Error("mode option must be provided: \"server\" or \"client\"")

  dev ??= false

  return {
    mode,

    dev: (dev === true
      ? { ...OPTIONS_DEFAULTS.dev, enabled: true }
      : (dev === false

        // set all options to false or -1
        ? {
          ...Object.fromEntries(
            Object.entries(
              OPTIONS_DEFAULTS.dev,
            ).map(([key, value]) => [key, typeof value === "boolean" ? false : -1]),
          ) as typeof OPTIONS_DEFAULTS.dev,
          enabled: false,
        }
        : { ...OPTIONS_DEFAULTS.dev, ...dev })
    ),

    bugFixes: bugFixes === true
      ? OPTIONS_DEFAULTS.bugFixes
      : { ...OPTIONS_DEFAULTS.bugFixes, ...bugFixes },
  }
}
