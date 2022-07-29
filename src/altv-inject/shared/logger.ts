import { PLUGIN_NAME } from "@/shared"

// eslint-disable-next-line camelcase
const alt = ___altvEsbuild_altvInject_alt___

export class Logger {
  public readonly debug: (...args: unknown[]) => void

  constructor(private readonly name: string) {
    if (___DEVMODE) {
      this.debug = (...args: unknown[]): void => {
        this.info("[DEBUG]", ...args)
      }
    }
    else
      this.debug = (): void => {}
  }

  public info(...args: unknown[]): void {
    alt.log(`~bl~[${PLUGIN_NAME}][${this.name}]~w~`, ...args)
  }

  public error(...args: unknown[]): void {
    alt.logError(`[${PLUGIN_NAME}][${this.name}]`, ...args)
  }

  public warn(...args: unknown[]): void {
    alt.logWarning(`[${PLUGIN_NAME}][${this.name}]`, ...args)
  }
}
