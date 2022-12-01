import type {
  FilledPluginOptions,
  IFromNetEvent,
  INetEvent,
  PluginMode,
} from "@/shared"
import {
  RESOURCE_CONTROL_ALTV_NAME,
  PLUGIN_NAME,
  EventManager,
} from "@/shared"
import type { AltRemoveUserEvent, BaseObjectClass } from "../shared"
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  Logger,
  sharedSetup,
} from "../shared"
import type net from "net"
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type alt from "alt-server"
import { ControlledPromise, SocketConnect } from "@/shared/util"

// eslint-disable-next-line camelcase
const _alt = ___altvEsbuild_altvInject_alt___
let _net!: typeof net

if (_alt.isServer)
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  _net = await (async () => await import("net"))()

export class ServerSetup {
  // TODO: need to do something with this shit: (e.g. when only server changes it takes time to restart)
  private static readonly MAX_ANOTHER_BUILD_START_MS = 500
  private static readonly RECONNECT_MS = 500

  private readonly events: INetEvent = {
    buildStart: (mode: PluginMode): void => {
      this.log.debug(`[buildStart] ms: ${new Date().getMilliseconds()} mode:`, mode)

      this.onBuildStart(mode)
    },

    buildEnd: (mode: PluginMode, cached?: boolean): void => {
      this.log.debug("[buildEnd] received:", mode)

      if (cached) {
        this.log.debug("received cached buildEnd -> emulate buildStart first")

        this.onBuildStart(mode)
      }

      if (!this.buildsInProgress.delete(mode)) {
        this.log.debug(`received unknown buildEnd: ${mode}, do nothing`)
        return
      }

      if (this.buildsInProgress.size) {
        this.log.debug("remaining builds in progress:", this.buildsInProgress.size)

        if (this.waitingForBuildEnd === mode)
          this.waitingForBuildEnd = this.flipMode(mode)
        return
      }

      if (this.waitingForBuildEnd !== mode) {
        this.log.debug("received not what we waiting for")
        return
      }

      this.log.debug("no builds in progress -> restart")
      this.restartResource()
    },

    clientConnect: (): void => {
      this.log.debug("clientConnect")
      this.clientConnected = true
    },

    // TODO: TEST IT
    clientDisconnect: (): void => {
      this.log.debug("clientDisconnect")
      this.clientConnected = false
    },
  }

  private readonly onConnect = (): void => {
    if (this.connectedAgain) {
      this.restartResource()
      return
    }

    this.log.debug("net socket connected, sending connect server event")

    this.sendEvent("connect", "server")
  }

  private readonly onSocketError = (msg: string, e?: Error): void => {
    this.log.error("[events]", msg, e)
  }

  private readonly onResourceStop = (
    clearPlayerMeta: () => void,
    despawnPlayers: () => void,
  ): void => {
    this.log.debug("resourceStop")
    for (const key of this.syncedMetaKeys) {
      this.log.debug("deleting synced meta key:", key)
      _alt.deleteSyncedMeta(key)
    }
    clearPlayerMeta()
    despawnPlayers()
    sharedSetup.destroyBaseObjects()
  }

  private socket?: net.Socket
  private eventManager?: EventManager<INetEvent, IFromNetEvent>
  private readonly log = new Logger("server")
  private clientConnected = false
  private anotherBuildStartTimeout: NodeJS.Timeout | null = null
  private waitingForBuildEnd: PluginMode | null = null
  private restartInProgress = false
  private connectedAgain = false

  private readonly buildsInProgress = new Set<PluginMode>()
  private readonly syncedMetaKeys = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly origAltOnClient?: typeof alt.onClient
  private socketConnect?: SocketConnect
  private readonly playerReadyEvents = new Map<alt.Player, ControlledPromise<boolean>>()

  constructor(private readonly options: FilledPluginOptions) {
    const { dev, bugFixes } = options

    if (dev.enabled) {
      this.origAltOnClient = sharedSetup.hookAltEventAdd("remote", "onClient", 1) as typeof alt.onClient
      sharedSetup.hookAltEventAdd("remote", "onceClient", 1, true)
      sharedSetup.hookAltEventRemove("remote", "offClient", 1)

      sharedSetup.hookAlt("setSyncedMeta", (original, key, value) => {
        this.syncedMetaKeys.add(key)
        original(key, value)
      }, 2)

      this.hookBaseObjects()
      const clearPlayerMeta = this.hookAltPlayer()

      let despawnPlayers = (): void => {}
      if (dev.playersReconnect) {
        this.initPlayersReconnect(options)
        despawnPlayers = this.despawnPlayers.bind(this)
      }

      sharedSetup.onResourceStop(
        this.onResourceStop.bind(
          this,
          clearPlayerMeta,
          despawnPlayers,
        ),
      )

      if (dev.hotReload) {
        this.socketConnect = new SocketConnect(
          _net,
          this.options.dev.hotReloadServerPort,
          (socket) => {
            this.socket = socket
            this.eventManager = this.initEventManager(socket)

            this.onConnect()

            this.connectedAgain = true
          })
      }

      if (dev.enhancedRestartCommand)
        this.initEnhancedRestartCommand(options)
      else if (dev.restartCommand)
        this.initRestartConsoleCommand(options)

      if (dev.connectionCompleteEvent)
        this.initConnectionCompleteEvent()

      if (bugFixes.playerPrototype)
        this.initPlayerPrototypeTempFix()
    }
  }

  public sendEvent <K extends keyof IFromNetEvent>(event: K, ...args: Parameters<IFromNetEvent[K]>): void {
    if (!this.eventManager) {
      this.log.error("[sendEvent] no event manager")
      return
    }

    this.eventManager?.send(event, ...args)
  }

  private restartResource(): void {
    if (this.restartInProgress) {
      this.log.error("resource restart already in progress")
      return
    }
    this.restartInProgress = true

    this.clearCurrentBuild()

    const name = this.getFullResourceName()
    this.log.info(`restarting resource ${name}...`)

    _alt.restartResource(name)
  }

  private clearCurrentBuild(): void {
    this.waitingForBuildEnd = null
    this.buildsInProgress.clear()
  }

  private flipMode(mode: PluginMode): PluginMode {
    return (mode === "client") ? "server" : "client"
  }

  private initEventManager(socket: net.Socket): EventManager<INetEvent, IFromNetEvent> {
    return new EventManager(
      socket,
      this.events,
      this.onSocketError,
    )
  }

  private hookAltPlayer(): () => void {
    const proto = _alt.Player.prototype

    const metaStoreKey = Symbol("metaStoreKey")
    const syncedMetaStoreKey = Symbol("syncedMetaStoreKey")
    const streamSyncedMetaStoreKey = Symbol("streamSyncedMetaStoreKey")
    const localMetaStoreKey = Symbol("localMetaStoreKey")

    const originalSetMeta = Symbol("originalSetMeta")
    const originalSetSyncedMeta = Symbol("originalSetSyncedMeta")
    const originalSetStreamSyncedMeta = Symbol("originalSetStreamSyncedMeta")
    const originalSetLocalMeta = Symbol("originalSetLocalMeta")

    const _proto = (proto as unknown as Record<symbol, unknown>)

    _proto[originalSetMeta] = proto.setMeta
    _proto[originalSetSyncedMeta] = proto.setSyncedMeta
    _proto[originalSetStreamSyncedMeta] = proto.setStreamSyncedMeta
    _proto[originalSetLocalMeta] = proto.setLocalMeta

    proto.setMeta = sharedSetup.defineMetaSetter(_proto, originalSetMeta, metaStoreKey)
    proto.setSyncedMeta = sharedSetup.defineMetaSetter(_proto, originalSetSyncedMeta, syncedMetaStoreKey)
    proto.setStreamSyncedMeta = sharedSetup.defineMetaSetter(_proto, originalSetStreamSyncedMeta, streamSyncedMetaStoreKey)
    proto.setLocalMeta = sharedSetup.defineMetaSetter(_proto, originalSetLocalMeta, localMetaStoreKey)

    return (): void => {
      for (const player of _alt.Player.all) {
        if (!player?.valid) continue // idk how is that possible here

        const _player = (player as unknown as Record<symbol, Record<string, unknown>>)

        for (const key in _player[metaStoreKey])
          player.deleteMeta(key)

        for (const key in _player[syncedMetaStoreKey])
          player.deleteSyncedMeta(key)

        for (const key in _player[streamSyncedMetaStoreKey])
          player.deleteStreamSyncedMeta(key)

        for (const key in _player[localMetaStoreKey])
          player.deleteLocalMeta(key)
      }
    }
  }

  private initPlayersReconnect({ dev: { playersReconnectDelay, playersReconnectResetPos } }: FilledPluginOptions): void {
    const initialPos = new _alt.Vector3(0, 0, 72)
    const resourceRestartedKey = `${PLUGIN_NAME}:resourceRestarted`

    this.log.debug("_alt.getMeta(resourceRestartedKey):", _alt.getMeta(resourceRestartedKey))

    if (!_alt.getMeta(resourceRestartedKey)) {
      this.log.debug("set resource restarted")
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      sharedSetup.origAltSetMeta!(resourceRestartedKey, true)
      return
    }

    const players = _alt.Player.all
    if (!players.length) {
      this.log.debug("no players to reconnect")
      return
    }

    for (const p of players) {
      if (!p.valid) continue
      this.initPlayerReadyEvent(p)
    }

    this.log.info(`start a timer for ~cl~${playersReconnectDelay}~w~ ms to reconnect players (${players.length})`)

    setTimeout(() => {
      for (const p of players) {
        if (!p.valid) continue

        p.dimension = _alt.defaultDimension
        p.streamed = true
        p.collision = true
        p.invincible = false
        p.visible = true
        p.frozen = false

        if (playersReconnectResetPos) p.pos = initialPos

        this.waitForPlayerReadyEvent(p)
          .then((res) => {
            if (!res) {
              this.log.debug("waitForPlayerReadyEvent promise resolved false, player disconnected")
              return
            }

            this.log.debug("waitForPlayerReadyEvent success player:", p.name, p.id)

            _alt.emit("playerConnect", p)
          })
          .catch(e => {
            this.log.error(e.stack)
          })
      }
    }, playersReconnectDelay)
  }

  private despawnPlayers(): void {
    this.log.debug("despawn players")

    for (const p of _alt.Player.all) {
      if (!p.valid) continue

      p.removeAllWeapons()
      p.clearBloodDamage()
      // despawn doesnt call detach now (see alt:V issue https://github.com/altmp/altv-issues/issues/1456)
      p.detach()
      p.despawn()
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
        sharedSetup.setPlayerObjectPrototype(p)
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sharedSetup.origAltOn!("playerConnect", (player: alt.Player) => {
      sharedSetup.setPlayerObjectPrototype(player)
    })
  }

  private initRestartConsoleCommand(options: FilledPluginOptions): void {
    const restartCommand = options.dev.restartCommand === true ? "res" : options.dev.restartCommand as string

    const triggerRestart = (): void => {
      this.restartResource()
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sharedSetup.origAltOn!("consoleCommand", (command) => {
      if (command !== restartCommand) return
      triggerRestart()
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOnClient!(SERVER_EVENTS.restartCommand, () => {
      triggerRestart()
    })
  }

  private initEnhancedRestartCommand({ dev: { enhancedRestartCommand } }: FilledPluginOptions): void {
    const commandName = enhancedRestartCommand === true ? "res" : enhancedRestartCommand as string

    if (!_alt.hasResource(RESOURCE_CONTROL_ALTV_NAME)) {
      this.log.debug("control resource is not started", RESOURCE_CONTROL_ALTV_NAME)

      const pathForStarting = `../node_modules/altv-esbuild/dist/${RESOURCE_CONTROL_ALTV_NAME}`
      this.log.debug("resource control path:", pathForStarting)

      _alt.nextTick(() => {
        sharedSetup.origAltOnce!(
          sharedSetup.generateEventName("resourceControlReady"),
          () => {
            _alt.emit(
              sharedSetup.generateEventName("resourceControlInit"),
              this.getFullResourceName(),
              commandName,
            )
          })
        _alt.startResource(pathForStarting)
      })
    }
    else
      this.log.debug("control resource already started", RESOURCE_CONTROL_ALTV_NAME)
  }

  private initConnectionCompleteEvent(): void {
    this.log.debug("initConnectionCompleteEvent")

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOnClient!(SERVER_EVENTS.clientReady, (player: alt.Player) => {
      this.log.debug("received clientReady player:", player.name, player.id)
      player.emitRaw(CLIENT_EVENTS.connectionComplete)

      const ready = this.playerReadyEvents.get(player)
      if (!ready) {
        this.log.debug("cant get ready event, skip")
        return
      }
      ready.resolve(true)
    })
  }

  private hookBaseObjects(): void {
    for (const _key in _alt) {
      const key = _key as keyof typeof _alt

      const BaseObjectClass = _alt[key]
      if (!this.isBaseObjectClass(BaseObjectClass)) continue

      let isClassAbstract = false
      try {
        new BaseObjectClass()
        // this shit works by altv js module bug
        isClassAbstract = true
      }
      catch (e) {
        if ((e as Error)?.message?.includes("abstract")) isClassAbstract = true
      }
      if (isClassAbstract) continue

      (_alt[key] as unknown) = sharedSetup.wrapBaseObjectChildClass(BaseObjectClass)
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  private isBaseObjectClass(value: unknown): value is BaseObjectClass {
    return (
      ((value as { prototype?: unknown }).prototype instanceof _alt.BaseObject) &&
      // Player class is bugged, see function initPlayerPrototypeTempFix
      value !== _alt.Player
    )
  }

  private onBuildStart(mode: PluginMode): void {
    const flippedMode = this.flipMode(mode)

    this.buildsInProgress.add(mode)

    if (
      this.buildsInProgress.size === 1 &&
        this.waitingForBuildEnd === flippedMode &&
        this.buildsInProgress.has(flippedMode)
    ) {
      this.log.debug(`waiting currently for first build, change waitingForBuildEnd to: ${mode}`)
      this.waitingForBuildEnd = mode
      return
    }

    if (this.anotherBuildStartTimeout) {
      this.log.debug("[buildStart] received another build:", mode, "clear timeout")

      clearTimeout(this.anotherBuildStartTimeout)
      this.anotherBuildStartTimeout = null

      return
    }

    if (mode === "server") {
      // TODO: TEST IT
      if (!this.clientConnected) {
        this.log.debug("[buildStart] client is not connected, skip waiting for another build")
        this.waitingForBuildEnd = mode
        return
      }
    }

    this.waitingForBuildEnd = flippedMode
    this.log.debug(`[buildStart] waiting for another build: ${this.waitingForBuildEnd} to start...`)

    this.anotherBuildStartTimeout = setTimeout(() => {
      this.anotherBuildStartTimeout = null

      this.log.debug(`another build didnt started after ${ServerSetup.MAX_ANOTHER_BUILD_START_MS}ms`)

      if (this.buildsInProgress.has(mode)) {
        this.log.debug(`waiting for build: ${mode} to end now...`)

        this.waitingForBuildEnd = mode
      }
      else {
        this.log.debug(`first build: ${mode} ended -> restart`)
        this.restartResource()
      }
    }, ServerSetup.MAX_ANOTHER_BUILD_START_MS)
  }

  private initPlayerReadyEvent(player: alt.Player): void {
    const ready = new ControlledPromise<boolean>()
    this.playerReadyEvents.set(player, ready)

    const handler: alt.IServerEvent["playerDisconnect"] = (_player) => {
      if (_player !== player) return

      this.playerReadyEvents.delete(player)
      ready.resolve(false)
    }

    ready.promise.finally(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (sharedSetup.origAltOff! as AltRemoveUserEvent)("playerDisconnect", handler)
    })

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    sharedSetup.origAltOn!("playerDisconnect", handler)

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.origAltOnClient!(sharedSetup.generateEventName("playerReady"), handler)
  }

  private async waitForPlayerReadyEvent(player: alt.Player): Promise<boolean> {
    const ready = this.playerReadyEvents.get(player)
    if (!ready) {
      this.log.warn("waitForPlayerReadyEvent unknown player:", player.name, player.id)
      return false
    }

    return await ready.promise
  }

  private getFullResourceName(): string {
    const { path } = _alt.Resource.current as unknown as { path: string } // <server root>\resources\test\subfolder
    const resourcesDir = `${_alt.rootDir}\\resources\\` // <server root>\resources

    // returned path will be "test/subfolder"
    return path
      .slice(resourcesDir.length)
      .replaceAll("\\", "/")
  }
}
