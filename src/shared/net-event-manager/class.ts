import type { INetEventJSON } from "../net-events"
import type {
  EventInterface,
  ICommunicator,
  ISeparatedCommunicator,
} from "./types"

export class EventManager<TFrom extends EventInterface, TTo extends EventInterface> {
  private readonly receiver: ICommunicator | null
  private readonly sender: ICommunicator | null

  constructor(
    communicator: ICommunicator | ISeparatedCommunicator,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers: TFrom,
    onError: (message: string, e?: Error & { code?: string }) => void,
  ) {
    if (this.isCommunicatorSenderAndReceiver(communicator)) {
      this.sender = communicator.sender ?? null
      this.receiver = communicator.receiver ?? null
    }
    else {
      this.sender = communicator
      this.receiver = communicator
    }

    this.receiver?.on("data", (data: Buffer | string) => {
      data = data.toString()

      for (const chunk of data.split("|")) {
        if (!chunk) continue

        try {
          const {
            event,
            args,
          } = JSON.parse(chunk) as INetEventJSON<Record<string, (...args: unknown[]) => void>, string>

          const handler = handlers[event] as ((...args: unknown[]) => void) | undefined
          if (!handler) {
            onError(`received unknown event: ${event}`)
            return
          }

          handler(...args)
        }
        catch (e) {
          onError(`failed to handle chunk: '${chunk}' error: ${(e as Error)?.stack}`)
        }
      }
    })

    this.receiver?.on("error", (e: Error & { code?: string }) => {
      if (
        e?.code === "ECONNRESET" ||
        e?.code === "ECONNREFUSED"
      ) {
        ___DEVMODE && console.log("[DEBUG] [EventManager] socket disconnect")
        return
      }

      onError(`socket error: ${e.stack}`, e)
    })
  }

  public send<K extends keyof TTo>(event: K, ...args: Parameters<TTo[K]>): void {
    if (!this.sender)
      throw new Error("EventManager cannot send since sender was not provided")

    const eventJSON: INetEventJSON<TTo, keyof TTo> = {
      args,
      event,
    }

    this.sender.write(JSON.stringify(eventJSON) + "|")
  }

  public destroy(): void {
    this.receiver?.removeAllListeners("data")
    this.receiver?.removeAllListeners("error")
  }

  private isCommunicatorSenderAndReceiver(value: unknown): value is ISeparatedCommunicator {
    return !!((value as Record<string, unknown>)["sender"] || (value as Record<string, unknown>)["receiver"])
  }
}
