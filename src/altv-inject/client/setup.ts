import type { FilledPluginOptions } from "@/shared"
import {
  Logger,
  sharedSetup,
  CLIENT_EVENTS,
  SERVER_EVENTS,
} from "../shared"
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type alt from "alt-client"

// eslint-disable-next-line camelcase
const _alt = ___altvEsbuild_altvInject_alt___

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let native!: typeof import("natives")

if (_alt.isClient) {
  // eslint-disable-next-line camelcase
  native = ___altvEsbuild_altvInject_native___
}

export class ClientSetup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly origAltOnServer?: (event: string, handler: (...args: any[]) => void) => void
  private readonly log = new Logger("client")
  private readonly clearPlayerMeta?: () => void

  private readonly onResourceStop = (): void => {
    this.clearGame()
    sharedSetup.destroyBaseObjects()
    this.clearPlayerMeta?.()
  }

  constructor(options: FilledPluginOptions) {
    const { bugFixes, dev } = options

    if (bugFixes.webViewFlickering)
      this.initWebViewFlickeringBugFix()

    if (dev.enabled) {
      this.origAltOnServer = sharedSetup.hookAltEventAdd("remote", "onServer", 1)
      sharedSetup.hookAltEventAdd("remote", "onceServer", 1, true)
      sharedSetup.hookAltEventRemove("remote", "offServer", 1)

      if (bugFixes.playerPrototype)
        this.initPlayerPrototypeTempFix()

      if (dev.restartCommand)
        this.initRestartConsoleCommand(options)

      if (dev.disconnectEvent)
        this.initDisconnectEvent()

      if (dev.connectionCompleteEvent) {
        this.log.debug("dev.connectionCompleteEvent:", dev.connectionCompleteEvent)
        this.initConnectionCompleteEvent()
      }

      this.initClientReady()
      this.hookBaseObjects()
      this.clearPlayerMeta = this.initPlayerMetaCleanup()

      sharedSetup.onResourceStop(this.onResourceStop)
    }
  }

  /**
   * a temp fix for alt:V prototype bug https://github.com/altmp/altv-js-module/issues/106
   */
  private initPlayerPrototypeTempFix(): void {
    // fix prototype of players objects in alt.Player.all after restart as close to resource start as possible
    _alt.nextTick(() => {
      for (const p of _alt.Player.all) {
        if (!p.valid) continue

        if ((p as alt.Player | alt.LocalPlayer) !== _alt.Player.local)
          sharedSetup.setPlayerObjectPrototype(p)
        else {
          this.log.debug("set local player prototype")
          sharedSetup.setPlayerObjectPrototype(p, _alt.LocalPlayer)
        }
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOnServer!(CLIENT_EVENTS.playerConnect, (player: alt.Player): void => {
      sharedSetup.setPlayerObjectPrototype(player)
    })
  }

  private initRestartConsoleCommand(options: FilledPluginOptions): void {
    const restartCommand = options.dev.restartCommand === true ? "res" : options.dev.restartCommand as string

    this.log.debug("initRestartConsoleCommand command:", restartCommand)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sharedSetup.origAltOn!("consoleCommand", (command) => {
      if (command !== restartCommand) return

      this.log.info("~gl~restarting resource")
      _alt.emitServerRaw(SERVER_EVENTS.restartCommand)
    })
  }

  private initWebViewFlickeringBugFix(): void {
    _alt.everyTick(() => native.drawRect(0, 0, 0, 0, 0, 0, 0, 0, false))
  }

  private initDisconnectEvent(): void {
    this.log.debug("initDisconnectEvent")

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sharedSetup.origAltOn!(
      "resourceStop",
      () => sharedSetup.emitAltEvent("disconnect"),
    )
  }

  private initConnectionCompleteEvent(): void {
    this.log.debug("initConnectionCompleteEvent")

    let connectionCompleteCalled = false
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sharedSetup.origAltOn!("connectionComplete", () => {
      connectionCompleteCalled = true
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOnServer!(CLIENT_EVENTS.connectionComplete, () => {
      this.log.debug("received connectionComplete")
      if (connectionCompleteCalled) return

      sharedSetup.emitAltEvent("connectionComplete")
    })
  }

  private initClientReady(): void {
    _alt.emitServerRaw(SERVER_EVENTS.clientReady)
  }

  private clearGame(): void {
    const player = _alt.Player.local
    native.freezeEntityPosition(player, false)
    native.setEntityVisible(player, true, false)

    native.doScreenFadeIn(0)
    native.triggerScreenblurFadeOut(0)
    native.stopAudioScenes()
    native.newLoadSceneStop()
    native.destroyAllCams(false)
    native.animpostfxStopAll()
    native.setCamDeathFailEffectState(0)
    native.displayHud(true)
    native.displayRadar(true)
    _alt.FocusData.clearFocus()
    native.setFrontendActive(false) // force exit pause menu
  }

  private hookBaseObjects(): void {
    for (const _key in _alt) {
      const key = _key as keyof typeof _alt
      const value = _alt[key]

      if (!(this.isAltBlipClass(value) || this.isAltObjectClass(value))) continue

      this.log.debug("hooking class:", value.name);
      (_alt[key] as typeof value) = sharedSetup.wrapBaseObjectChildClass(value)
    }
  }

  private isAltBlipClass(value: unknown): value is new () => alt.Blip {
    // eslint-disable-next-line @typescript-eslint/ban-types
    return (value as Function).prototype instanceof _alt.Blip
  }

  private isAltObjectClass(value: unknown): value is new () => alt.Object {
    return (
      /* eslint-disable @typescript-eslint/ban-types */
      (value as Function).prototype instanceof _alt.Entity &&
      (value as Function).name === "Object"
      /* eslint-enable */
    )
  }

  private initPlayerMetaCleanup(): () => void {
    const proto = _alt.Player.prototype
    const _proto = (proto as unknown as Record<symbol, unknown>)
    const metaStoreKey = Symbol("metaStoreKey")
    const originalSetMeta = Symbol("originalSetMeta")

    _proto[originalSetMeta] = proto.setMeta

    proto.setMeta = sharedSetup.defineMetaSetter(_proto, originalSetMeta, metaStoreKey)

    return (): void => {
      for (const player of _alt.Player.all) {
        if (!player?.valid) continue // idk how is that possible here

        const _player = (player as unknown as Record<symbol, Record<string, unknown>>)

        for (const key in _player[metaStoreKey])
          player.deleteMeta(key)
      }
    }
  }
}
