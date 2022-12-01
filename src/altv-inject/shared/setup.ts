import type { FilledPluginOptions } from "@/shared"
import { PLUGIN_NAME } from "@/shared"
import { Logger } from "./logger"
import type {
  AltAddEvent,
  AltAddUserEvent,
  AltRemoveEvent,
  BaseObjectClass,
  EventScope,
} from "./types"
import type { IServerEvent } from "alt-server"
import type { IClientEvent } from "alt-client"
import inspect from "./util-inspect"
import { DEFAULT_JS_FUNC_PROPS } from "./js-func"
import type alt from "alt-shared"

type AltEventNames = keyof (IClientEvent & IServerEvent)
type AltEvents = (IClientEvent & IServerEvent)

// eslint-disable-next-line camelcase
const _alt = ___altvEsbuild_altvInject_alt___
// eslint-disable-next-line camelcase
const altShared = ___altvEsbuild_altvInject_altShared___

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class SharedSetup {
  private readonly log = new Logger("shared")

  private readonly resourceStopEvent = (): void => {
    this.log.debug("resourceStop")

    for (const key of this.metaKeys) _alt.deleteMeta(key)
  }

  public readonly origAltOn?: typeof _alt["on"]
  public readonly origAltOnce?: typeof _alt["once"]
  public readonly origAltOff?: AltRemoveEvent
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
  /* eslint-disable @typescript-eslint/indent */
  private readonly eventHandlersWrappers = new Map<
    string,
    Map<(...args: unknown[]) => void, (...args: unknown[]) => void>
  >()
  /* eslint-enable @typescript-eslint/indent */

  constructor(options: FilledPluginOptions) {
    if (options.dev.enabled) {
      this.origAltOn = this.hookAltEventAdd("local", "on", 1) as typeof _alt["on"]
      this.origAltOnce = this.hookAltEventAdd("local", "once", 1, true)
      this.origAltOff = this.hookAltEventRemove("local", "off", 1)

      this.hookAlt("getEventListeners", (original, event) => {
        return (typeof event === "string")
          ? [...(this.eventHandlers.local[event] ?? [])]
          : original(event)
      }, 1)

      this.hookAlt("getRemoteEventListeners", (original, event) => {
        return (typeof event === "string")
          ? [...(this.eventHandlers.remote[event] ?? [])]
          : original(event)
      }, 1)

      this.origAltSetMeta = this.hookAlt("setMeta", (original, key, value) => {
        this.metaKeys.add(key)
        original(key, value)
      }, 2)

      this.origAltOn("resourceStop", this.resourceStopEvent)

      if (options.enhancedAltLog) this.hookAltLogging()
    }
  }

  public hookAlt<K extends keyof typeof _alt, V = typeof _alt[K]>(
    property: K,
    // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
    replaceWith: V extends (...args: any) => any ? ((original: V, ...args: Parameters<V>) => ReturnType<V>) : Function,
    expectedArgs: number,
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

    (_alt as Record<string, unknown>)[property] = (...args: unknown[]): unknown => {
      if (args.length < expectedArgs)
        throw new Error(`${expectedArgs} arguments expected`)

      return (replaceWith as (...args: unknown[]) => unknown)(...args)
    }

    if ((altShared as Record<string, unknown>)[property] != null)
      (altShared as Record<string, unknown>)[property] = replaceWith

    return original
  }

  public hookAltEventAdd<K extends keyof typeof _alt>(scope: EventScope, funcName: K, expectedArgs: number, once = false): AltAddUserEvent | AltAddEvent {
    return this.hookAlt<K, AltAddEvent>(funcName, (
      original,
      eventOrHandler,
      handler,
    ) => {
      if (!(typeof eventOrHandler === "string" || typeof eventOrHandler === "function"))
        throw new Error("Expected a string or function as first argument")

      if (typeof eventOrHandler === "function") {
        original(eventOrHandler)
        return
      }

      if (typeof handler !== "function")
        throw new Error("Expected a function as second argument")

      const eventHandlers = this.eventHandlers[scope];

      (
        eventHandlers[eventOrHandler] ??
        (eventHandlers[eventOrHandler] = new Set())
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      ).add(handler!)

      const wrapper = async (...args: unknown[]): Promise<void> => {
        if (once) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          eventHandlers[eventOrHandler]?.delete(handler!)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.eventHandlersWrappers.get(eventOrHandler)?.delete(handler!)
        }

        if (this.hookedAltEvents[eventOrHandler as AltEventNames]) {
          this.log.debug("skip calling user handler of hooked alt event:", eventOrHandler)
          return
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/await-thenable
          await handler!(...args)
        }
        catch (e) {
          _alt.logError(
            `Uncaught exception in event listener of event \"${eventOrHandler}\":\n`,
            (e as Error)?.stack ?? e,
          )

          throw e
        }
      }

      const handlers = this.eventHandlersWrappers.get(eventOrHandler) ?? new Map()
      this.eventHandlersWrappers.set(eventOrHandler, handlers)

      handlers.set(handler, wrapper)

      original(eventOrHandler, wrapper)

      // this.log.debug(`alt.${funcName} hook called with arguments:`, eventOrHandler, typeof handler)
    }, expectedArgs) as AltAddUserEvent | AltAddEvent
  }

  public hookAltEventRemove<K extends keyof typeof _alt>(scope: EventScope, funcName: K, expectedArgs: number): AltRemoveEvent {
    return this.hookAlt<K, AltRemoveEvent>(funcName, (
      original,
      eventOrHandler: string | ((...args: unknown[]) => void),
      handler,
    ) => {
      this.log.debug(`hooked alt.${funcName} called args:`, eventOrHandler, typeof handler)

      if (!(typeof eventOrHandler === "string" || typeof eventOrHandler === "function"))
        throw new Error("Expected a string or function as first argument")

      if (typeof eventOrHandler === "function") {
        (original as unknown as ((genericListener: (...args: unknown[]) => void) => void))(eventOrHandler)
        return
      }

      if (typeof handler !== "function")
        throw new Error("Expected a function as second argument")

      const handlers = this.eventHandlersWrappers.get(eventOrHandler)
      if (!handlers) {
        this.log.debug(`alt.${funcName} called but event handlers are not registered for event: ${eventOrHandler}`)
        return
      }

      const wrapper = handlers.get(handler)
      if (!wrapper) {
        this.log.debug(`alt.${funcName} called but event handler is not registered for event: ${eventOrHandler}`)
        return
      }

      this.eventHandlers[scope][eventOrHandler]?.delete(handler)
      handlers?.delete(handler)
      original(eventOrHandler, wrapper)
    }, expectedArgs) as AltRemoveEvent
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

  public wrapBaseObjectChildClass<T extends BaseObjectClass>(BaseObjectChild: T): T {
    // this.log.debug("wrapping baseobject class:", BaseObjectChild.name)

    const proto = BaseObjectChild.prototype
    const originalDestroy = Symbol("originalDestroy")
    const baseObjects = this.baseObjects
    const log = this.log

    proto[originalDestroy] = proto.destroy

    proto.destroy = function(): void {
      try {
        baseObjects.delete(this)
        this[originalDestroy]()
      }
      catch (error) {
        log.error(`failed to destroy alt.${BaseObjectChild.name} error:`)
        throw error
      }
    }

    // eslint-disable-next-line @typescript-eslint/ban-types
    const WrappedBaseObjectChild = function(this: object & { __proto__: object }, ...args: unknown[]): object {
      try {
        const baseObject = new BaseObjectChild(...args)

        baseObjects.add(baseObject as alt.BaseObject)

        // fix prototype in inherited from altv classes
        // eslint-disable-next-line no-proto
        Object.setPrototypeOf(baseObject, this.__proto__)

        return baseObject
      }
      catch (error) {
        log.error(`failed to create alt.${BaseObjectChild.name} error:`)
        throw error
      }
    }

    WrappedBaseObjectChild.prototype = BaseObjectChild.prototype
    Object.defineProperty(WrappedBaseObjectChild, "name", {
      value: BaseObjectChild.name,
    })

    try {
      const originalKeys = Object.keys(BaseObjectChild)

      // wrap all static stuff from original altv class
      for (const key of originalKeys) {
        if (DEFAULT_JS_FUNC_PROPS[key]) continue

        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const { value, set } = Object.getOwnPropertyDescriptor(BaseObjectChild, key)!

          // static method
          if (typeof value === "function") {
            (WrappedBaseObjectChild as unknown as Record<string, unknown>)[key] =
              (BaseObjectChild as unknown as Record<string, unknown>)[key]
          }

          // static getter/setter
          else {
            Object.defineProperty(WrappedBaseObjectChild, key, {
              get: () => (BaseObjectChild as unknown as Record<string, unknown>)[key],
              set: set?.bind(BaseObjectChild),
            })
          }
        }
        catch (e) {
          this.log.error(
            `detected broken alt.${BaseObjectChild.name} static property: ${key}. \n`,
            (e as Error)?.stack ?? e,
          )
        }
      }
    }
    catch (e) {
      this.log.error((e as Error).stack ?? e)
    }

    return WrappedBaseObjectChild as unknown as T
  }

  public destroyBaseObjects(): void {
    this.log.debug("destroyBaseObjects count:", this.baseObjects.size)
    for (const obj of this.baseObjects) obj.destroy()
  }

  public onResourceStop(handler: () => void): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOn!(
      "resourceStop",
      handler,
    )
  }

  public defineMetaSetter(proto: Record<symbol, unknown>, originalMethodKey: symbol, storeKey: symbol) {
    return function(this: typeof proto, key: string, value: unknown): void {
      if (arguments.length < 2)
        throw new Error("2 arguments expected");

      (this[originalMethodKey] as (key: string, value: unknown) => void)(key, value)

      this[storeKey] ??= {};
      (this[storeKey] as Record<string, unknown>)[key] = value
    }
  }

  private hookAltLogging(): void {
    const customLog = (original: (...args: unknown[]) => void, ...values: unknown[]): void => {
      original(
        ...values.map(v => {
          return (typeof v === "string") ? v : inspect(v, { colors: true })
        }),
      )
    }

    const original = this.hookAlt("log", customLog, 0)

    if (_alt.isClient) console.log = customLog.bind(null, original)

    // @ts-expect-error TODO: remove "if" when altv 13.0 will be released
    if (_alt.logDebug)
      this.hookAlt("logDebug", customLog, 0)
  }
}

export const sharedSetup = new SharedSetup(___altvEsbuild_altvInject_pluginOptions___)
