/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SomeObject = Record<string, any>

export type DeepRequired<T> = {
  [K in keyof T]-?: T[K] extends SomeObject | boolean | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (T[K] extends (...args: any[]) => any ? T[K] : DeepRequired<T[K]>)
    : T[K]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConvertBoolsToObjects<T extends SomeObject> = {
  [K in keyof T]: (boolean | SomeObject | undefined) extends T[K] ? Extract<T[K], SomeObject> : T[K]
}

export type PluginMode = "client" | "server"

export type FilledPluginOptions = Readonly<DeepRequired<ConvertBoolsToObjects<IPluginOptions>>>

export interface IPluginDevOption {
  /**
   * If set to false disables every dev option, such as {@link hotReload} or {@link topLevelExceptionHandling}
   *
   * `true` by default.
   */
  enabled?: boolean

  /**
   * Enables resource restart at source code rebuild.
   *
   * `true` by default if `dev` enabled.
   */
  hotReload?: boolean

  /**
   * TCP port that will be used for hot reload server (communication between altv server and esbuild plugin).
   *
   * `8877` by default.
   */
  hotReloadServerPort?: number

  /**
   * TCP host that will be used for hot reload server (communication between altv server and esbuild plugin).
   *
   * Defined automatically by nodejs by default.
   */
  hotReloadServerHost?: string

  /**
   * Enables players reconnect emulation (clearing some player stuff on resourceStop and emitting playerConnect).
   *
   * `true` by default if `dev` enabled.
   */
  playersReconnect?: boolean

  /**
   * Milliseconds delay before connecting players for {@link playersReconnect}
   * (this value is ignored if `playersReconnect` is disabled).
   *
   * `200` by default if `dev` enabled..
   */
  playersReconnectDelay?: number

  /**
   * Should the player position be reset when emulating a reconnect?
   *
   * Equals `playersReconnect` by default.
   */
  playersReconnectResetPos?: boolean

  /**
   * Enables command for restarting resource (destroying everything, reconnecting client, etc.).
   *
   * The command name is "res" if `true` specified, otherwise your passed value.
   *
   * `true` by default if `dev` enabled.
   */
  restartCommand?: boolean | string

  /**
   * Enables emulation of clientside
   * {@link https://xxshady.github.io/custom-altv-types/interfaces/_alt_client_.iclientevent.html#connectioncomplete connectionComplete}
   * event in dev mode.
   *
   * @remarks If you want to change it set value for both "client" and "server" plugin modes!
   *
   * `true` by default if `dev` enabled.
   */
  connectionCompleteEvent?: boolean

  /**
   * Enables emulation of clientside
   * {@link https://xxshady.github.io/custom-altv-types/interfaces/_alt_client_.iclientevent.html#disconnect disconnect}
   * event in dev mode.
   *
   * `true` by default if `dev` enabled.
   */
  disconnectEvent?: boolean

  /**
   * Enables handling of top level exceptions.
   *
   * `true` by default if `dev` enabled..
   */
  topLevelExceptionHandling?: boolean

  /**
   * Enables moving import of the modules included in esbuild option `external`
   * (as well as nodejs built-in modules) to the top of the bundle.
   *
   * Equals `topLevelExceptionHandling` by default.
   */
  moveExternalsOnTop?: boolean

  /**
   * Which modules to not move to the top when {@link moveExternalsOnTop} is enabled.
   *
   * It's useful if you want to conditionally import something AND still use {@link moveExternalsOnTop} (because it's needed for {@link topLevelExceptionHandling})
   * @example
   * ```ts
   * let mod
   * if (something)
   *   mod = await('a')
   * else
   *   mod = await('b')
   * ```
   *
   * Empty by default.
   */
  moveExternalsOnTopIgnore?: readonly string[]

  /**
   * Enables enhanced version of {@link restartCommand} option, that works even when script resource is stopped
   * (when resource is stopped this command only works on serverside).
   *
   * The command name is "res" if `true` specified, otherwise your passed value.
   *
   * @remarks Overrides {@link restartCommand} option.
   *
   * `false` by default.
   */
  enhancedRestartCommand?: boolean | string

  /**
   * Enables emulation of serverside
   * {@link https://xxshady.github.io/custom-altv-types/interfaces/_alt_server_.iserverevent.html#serverstarted serverStarted}
   * event in dev mode.
   *
   * `true` by default if `dev` enabled.
   */
  serverStartedEvent?: boolean

  /**
   * **Experimental** feature.
   *
   * Ensures client and server code versions are same between hot reloads.
   * Affects `playerConnect` event emit ({@link playersReconnect}).
   *
   * `false` by default.
   */
  clientServerInstanceValidation?: boolean
}

export interface IPluginFixesOption {
  /**
   * https://github.com/altmp/altv-issues/issues/644
   *
   * `true` by default.
   */
  webViewFlickering?: boolean

  /**
   * https://github.com/altmp/altv-js-module/issues/106
   *
   * Works only with enabled `dev` option.
   *
   * `true` by default.
   */
  playerPrototype?: boolean
}

export interface IPluginOptions {
  mode: PluginMode

  /**
   * Enables dev mode and hot reload if not disabled.
   *
   * (some cleaning stuff on resource stop,
   * such as destroying vehicles or clearing all metadata set by resource,
   * players reconnect emulation, etc.).
   *
   * `false` by default.
   */
  dev?: boolean | IPluginDevOption

  /**
   * Enables alt:V or GTA bug fixes.
   *
   * `true` by default.
   */
  bugFixes?: boolean | IPluginFixesOption

  /**
   * Enables built-in "altv-enums" module that exports enums from
   * alt-shared, alt-server, alt-client.
   *
   * To use it, you first need to add altv-enums
   * to tsconfig [typeRoots](https://www.typescriptlang.org/tsconfig#typeRoots) as follows:
   * ```json
   * "typeRoots": [
   *   "./node_modules/altv-esbuild/altv-enums/types",
   * ],
   * ```
   *
   * And disable [isolatedModules](https://www.typescriptlang.org/tsconfig#isolatedModules)
   * so that your code editor does not complain when using enums from this module.
   *
   * `false` by default.
   *
   * @example
   * ```ts
   * import alt from "alt-server"
   * import { RadioStation } from "altv-enums"
   *
   * const vehicle = new alt.Vehicle(...)
   * vehicle.activeRadioStation = RadioStation.Space // works without any TS errors
   * ```
   */
  altvEnums?: boolean

  /**
   * @deprecated Now this is a useless option because
   * [it was integrated](https://github.com/altmp/altv-js-module/pull/170#issuecomment-1273613155) into the alt:V JS module.
   *
   * Adds better value formatting to alt.log, alt.logDebug and console.log if code is executed on the clientside
   * (uses util.inspect ported from nodejs).
   *
   * `true` by default.
   *
   * @example
   * ```
   * alt.log(
   *   new Set([1, 2, 3]), // Set(3) { 1, 2, 3 }
   *   [1, 2, { a: 10 }] // [ 1, 2, { a: 10 } ]
   * )
   * ```
   */
  enhancedAltLog?: boolean

  /**
   * Import alt-client, alt-server, etc. as normal ES modules
   * and export them using default export.
   *
   * Temp fix for high memory usage.
   *
   * `false` by default.
   */
  altDefaultImport?: boolean
}
