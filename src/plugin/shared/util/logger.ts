import { PLUGIN_NAME } from "@/shared"

export class Logger {
  private static readonly CONSOLE_BLUE = "\x1b[34m"
  private static readonly CONSOLE_RESET = "\x1b[0m"
  private static readonly CONSOLE_RED = "\x1b[31m"

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
    console.log(`${Logger.CONSOLE_BLUE}[${PLUGIN_NAME}][${this.name}]${Logger.CONSOLE_RESET}`, ...args)
  }

  public error(...args: unknown[]): void {
    console.error(`${Logger.CONSOLE_RED}[ERROR] [${PLUGIN_NAME}][${this.name}]`, ...args)
  }
}
