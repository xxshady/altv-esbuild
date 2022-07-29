import type { FilledPluginOptions } from "@/shared"
import { PLUGIN_NAME } from "@/shared"
import { Logger } from "./logger"
import type {
  AltAddEvent,
  AltAddUserEvent,
  AltRemoveEvent,
  EventScope,
} from "./types"
import type { IServerEvent } from "alt-server"
import type { IClientEvent } from "alt-client"

type AltEventNames = keyof (IClientEvent & IServerEvent)
type AltEvents = (IClientEvent & IServerEvent)

// eslint-disable-next-line camelcase
const _alt = ___altvEsbuild_altvInject_alt___
// eslint-disable-next-line camelcase
const altShared = ___altvEsbuild_altvInject_altShared___

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class SharedSetup {
  private readonly log = new Logger("SharedSetup")

  private readonly resourceStopEvent = (): void => {
    this.log.debug("resourceStop")

    for (const key of this.metaKeys) _alt.deleteMeta(key)
  }

  public readonly origAltOn?: typeof _alt["on"]
  public readonly origAltOff?: typeof _alt["off"]
  public readonly origAltSetMeta?: typeof _alt["setMeta"]

  // first record key is scope, second is event name
  private readonly eventHandlers: Record<EventScope, Record<string, Set<(...args: unknown[]) => void>>> = {
    local: {},
    remote: {},
  }

  private readonly metaKeys = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/ban-types
  private readonly baseObjects = new Set<{ destroy(): void }>()
  private readonly hookedAltEvents: Partial<Record<AltEventNames, true>> = {}

  constructor(options: FilledPluginOptions) {
    if (options.dev.enabled) {
      this.origAltOn = this.hookAltEventAdd("local", "on", false)
      this.hookAltEventAdd("local", "once", true)
      this.origAltOff = this.hookAltEventRemove("local", "off")

      this.hookAlt("getEventListeners", (original, event) => {
        return (typeof event === "string")
          ? [...(this.eventHandlers.local[event] ?? [])]
          : original(event)
      })

      this.hookAlt("getRemoteEventListeners", (original, event) => {
        return (typeof event === "string")
          ? [...(this.eventHandlers.remote[event] ?? [])]
          : original(event)
      })

      this.origAltSetMeta = this.hookAlt("setMeta", (original, key, value) => {
        this.metaKeys.add(key)
        original(key, value)
      })

      this.origAltOn("resourceStop", this.resourceStopEvent)
    }
  }

  public hookAlt<K extends keyof typeof _alt, V = typeof _alt[K]>(
    property: K,
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
    replaceWith: V extends (...args: any) => any ? ((original: V, ...args: Parameters<V>) => ReturnType<V>) : Function,
  ): (typeof _alt)[K] {
    const original = (_alt)[property]
    if (original == null)
      throw new Error(`[hookAlt] original property is not defined: ${property}`)

    // this.log.debug(`hooking alt.${property}`)

    // eslint-disable-next-line @typescript-eslint/ban-types
    if (Object.hasOwn(original as object, "___hookAlt"))
      throw new Error(`[hookAlt] already hooked property: ${property}`)

    if (!replaceWith.prototype)
      replaceWith = replaceWith.bind(null, original) // replaceWith is arrow function

    Object.defineProperty(replaceWith, "___hookAlt", {
      enumerable: false,
      configurable: false,
      writable: false,
      value: true,
    });

    (_alt as Record<string, unknown>)[property] = replaceWith

    if ((altShared as Record<string, unknown>)[property] != null)
      (altShared as Record<string, unknown>)[property] = replaceWith

    return original
  }

  public hookAltEventAdd<K extends keyof typeof _alt>(scope: EventScope, funcName: K, once = false): AltAddUserEvent {
    return this.hookAlt<K, AltAddEvent>(funcName, (
      original,
      eventOrHandler,
      handler,
    ) => {
      if (typeof eventOrHandler === "function") {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        original(handler!)
        return
      }

      const eventHandlers = this.eventHandlers[scope];

      (
        eventHandlers[eventOrHandler] ??
        (eventHandlers[eventOrHandler] = new Set())
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ).add(handler!)

      original(eventOrHandler, (...args: unknown[]) => {
        if (once) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          eventHandlers[eventOrHandler]?.delete(handler!)
        }

        if (this.hookedAltEvents[eventOrHandler as AltEventNames]) {
          this.log.debug("skip calling user handler of hooked alt event:", eventOrHandler)
          return
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        handler!(...args)
      })

      // this.log.debug(`alt.${funcName} hook called with arguments:`, eventOrHandler, typeof handler)
    }) as AltAddUserEvent
  }

  public hookAltEventRemove<K extends keyof typeof _alt>(scope: EventScope, funcName: K): AltRemoveEvent {
    return this.hookAlt<K, AltRemoveEvent>(funcName, (
      original,
      event,
      handler,
    ) => {
      if (event === null) {
        original(null, handler)
        return
      }

      this.eventHandlers[scope][event]?.delete(handler)

      original(event, handler)

      this.log.debug(`hooked alt.${funcName} called with arguments:`, event, typeof handler)
    }) as AltRemoveEvent
  }

  public hookAltEvent<K extends AltEventNames>(
    event: K,
    handler: (...args: Parameters<AltEvents[K]>) => Parameters<AltEvents[K]>,
  ): void {
    this.hookedAltEvents[event] = true

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOn!(event as string, (...args: unknown[]) => {
      this.log.debug("received hooked alt event:", event)

      const patchedArgs = handler(...args as Parameters<AltEvents[K]>)
      this.emitAltEvent(event, ...patchedArgs)
    })
  }

  public emitAltEvent(event: AltEventNames, ...args: unknown[]): void {
    const handlers = this.eventHandlers.local[event]
    if (!handlers) {
      this.log.debug("callAltEvent:", event, "no handlers")
      return
    }

    for (const handler of handlers) {
      try {
        handler(...args)
      }
      catch (e) {
        const message = ((e as Error)?.stack ?? e) + ""
        _alt.logError(`Exception at resource ${_alt.resourceName} in listener of "${event}" event:\n  ${message}`)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public setPlayerObjectPrototype(player: object, playerClass: Function = _alt.Player): void {
    Object.setPrototypeOf(player, playerClass.prototype)
  }

  public generateEventName(name: string): string {
    return `___${PLUGIN_NAME}:${name}___`
  }
}

export const sharedSetup = new SharedSetup(___altvEsbuild_altvInject_pluginOptions___)
