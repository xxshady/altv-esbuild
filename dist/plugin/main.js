var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/plugin/shared/options/defaults.ts
var playersReconnect = true;
var OPTIONS_DEFAULTS = {
  mode: "client",
  // set by user anyway
  dev: {
    enabled: true,
    // with dev mode enabled values:
    hotReload: true,
    hotReloadServerPort: 8877,
    playersReconnect,
    playersReconnectDelay: 200,
    playersReconnectResetPos: playersReconnect,
    connectionCompleteEvent: true,
    disconnectEvent: true,
    restartCommand: true,
    topLevelExceptionHandling: true,
    moveExternalsOnTop: true,
    enhancedRestartCommand: false,
    serverStartedEvent: true
  },
  bugFixes: {
    webViewFlickering: true,
    playerPrototype: true,
    playerDamageOnFirstConnect: false
  },
  altvEnums: false,
  enhancedAltLog: true
};

// src/plugin/shared/options/merge.ts
var mergeOptions = ({
  mode,
  dev,
  bugFixes,
  altvEnums,
  enhancedAltLog
}) => {
  if (typeof mode == null)
    throw new Error('mode option must be provided: "server" or "client"');
  dev ??= false;
  return {
    mode,
    dev: dev === true ? { ...OPTIONS_DEFAULTS.dev, enabled: true } : devIsDisabled(dev) ? {
      ...Object.fromEntries(
        Object.entries(
          OPTIONS_DEFAULTS.dev
        ).map(([key, value]) => [key, typeof value === "boolean" ? false : -1])
      ),
      enabled: false
    } : {
      ...OPTIONS_DEFAULTS.dev,
      ...dev,
      playersReconnectResetPos: dev.playersReconnectResetPos ?? dev.playersReconnect ?? OPTIONS_DEFAULTS.dev.playersReconnectResetPos
    },
    bugFixes: bugFixes === true ? OPTIONS_DEFAULTS.bugFixes : { ...OPTIONS_DEFAULTS.bugFixes, ...bugFixes },
    altvEnums: altvEnums ?? OPTIONS_DEFAULTS.altvEnums,
    enhancedAltLog: enhancedAltLog ?? OPTIONS_DEFAULTS.enhancedAltLog
  };
};
function devIsDisabled(dev) {
  return dev === false || dev.enabled === false;
}

// src/shared/constants.ts
var PLUGIN_NAME = "altv-esbuild";

// src/shared/net-event-manager/class.ts
var EventManager = class {
  receiver;
  sender;
  constructor(communicator, handlers, onError) {
    if (this.isCommunicatorSenderAndReceiver(communicator)) {
      this.sender = communicator.sender ?? null;
      this.receiver = communicator.receiver ?? null;
    } else {
      this.sender = communicator;
      this.receiver = communicator;
    }
    this.receiver?.on("data", (data) => {
      data = data.toString();
      for (const chunk of data.split("|")) {
        if (!chunk)
          continue;
        try {
          const {
            event,
            args
          } = JSON.parse(chunk);
          const handler = handlers[event];
          if (!handler) {
            onError(`received unknown event: ${event}`);
            return;
          }
          handler(...args);
        } catch (e) {
          onError(`failed to handle chunk: '${chunk}' error: ${e?.stack}`);
        }
      }
    });
    this.receiver?.on("error", (e) => {
      if (e?.code === "ECONNRESET" || e?.code === "ECONNREFUSED") {
        console.log("[DEBUG] [EventManager] socket disconnect");
        return;
      }
      onError(`socket error: ${e.stack}`, e);
    });
  }
  send(event, ...args) {
    if (!this.sender)
      throw new Error("EventManager cannot send since sender was not provided");
    const eventJSON = {
      args,
      event
    };
    this.sender.write(JSON.stringify(eventJSON) + "|");
  }
  destroy() {
    this.receiver?.removeAllListeners("data");
    this.receiver?.removeAllListeners("error");
  }
  isCommunicatorSenderAndReceiver(value) {
    return !!(value["sender"] || value["receiver"]);
  }
};

// src/plugin/shared/util/logger.ts
var _Logger = class {
  constructor(name) {
    this.name = name;
    if (true) {
      this.debug = (...args) => {
        this.info("[DEBUG]", ...args);
      };
    } else
      this.debug = () => {
      };
  }
  debug;
  info(...args) {
    console.log(`${_Logger.CONSOLE_BLUE}[${PLUGIN_NAME}][${this.name}]${_Logger.CONSOLE_RESET}`, ...args);
  }
  error(...args) {
    console.error(`${_Logger.CONSOLE_RED}[ERROR] [${PLUGIN_NAME}][${this.name}]`, ...args);
  }
};
var Logger = _Logger;
__publicField(Logger, "CONSOLE_BLUE", "\x1B[34m");
__publicField(Logger, "CONSOLE_RESET", "\x1B[0m");
__publicField(Logger, "CONSOLE_RED", "\x1B[31m");

// src/plugin/shared/util/var-name.ts
var codeVarName = (name) => {
  return "___altvEsbuild_" + name.replace(/[-/\\ @.:]/g, "_x_") + "___";
};

// src/plugin/shared/setup.ts
import fs from "fs";

// src/plugin/shared/constants.ts
var ALT_SHARED_VAR = codeVarName("altvInject_altShared");
var ALT_VAR = codeVarName("altvInject_alt");
var ALT_NATIVES_VAR = codeVarName("altvInject_native");
var BuildState = /* @__PURE__ */ ((BuildState2) => {
  BuildState2[BuildState2["None"] = 0] = "None";
  BuildState2[BuildState2["Start"] = 1] = "Start";
  BuildState2[BuildState2["End"] = 2] = "End";
  return BuildState2;
})(BuildState || {});

// src/plugin/shared/setup.ts
var SharedSetup = class {
  constructor(options, build) {
    this.options = options;
    this.build = build;
    this._log = new Logger(`shared: ${options.mode}`);
    this.addExternalImportHandling(build, "alt-shared", ALT_SHARED_VAR);
    this.addExternalImportHandling(build, "alt", ALT_VAR);
    if (options.altvEnums) {
      this.addCustomModule(
        build,
        "altv-enums",
        fs.readFileSync(new URL("../../altv-enums/dist/enums.js", import.meta.url)).toString()
      );
    }
  }
  _log;
  bannerImportsCode = "// banner imports\n";
  bannerBodyCode = "// banner body\n";
  handleBuildOptions() {
    const {
      banner,
      footer,
      external
    } = this.build.initialOptions;
    const buildOptions = {
      banner: {
        ...banner,
        js: banner?.["js"] ?? ""
      },
      footer: {
        ...footer,
        js: footer?.["js"] ?? ""
      },
      external: external ? [...external] : []
    };
    this.bannerImportsCode += `const ${codeVarName("altvInject_pluginOptions")} = ${JSON.stringify(this.options)};
`;
    const altIdx = buildOptions.external.indexOf("alt");
    const altSharedIdx = buildOptions.external.indexOf("alt-shared");
    if (altIdx !== -1)
      buildOptions.external.splice(altIdx, 1);
    if (altSharedIdx !== -1)
      buildOptions.external.splice(altSharedIdx, 1);
    return buildOptions;
  }
  appendBannerJs(buildOptions, code, semicolon, comment) {
    this.appendCodeTo(buildOptions, "banner", code, semicolon, comment);
  }
  appendCodeTo(buildOptions, option, code, semicolon = true, comment = "") {
    buildOptions[option].js += `${code}${semicolon ? ";" : ""}${comment ? ` // ${comment}` : ""}
`;
  }
  endBannerJs(buildOptions) {
    let topLevelExceptionCode = "";
    if (this.options.dev.topLevelExceptionHandling)
      topLevelExceptionCode += "try {";
    buildOptions.banner.js += `// ------------------- ${PLUGIN_NAME} banner -------------------
` + this.bannerImportsCode + "await (async () => { // start banner wrapper\n" + fs.readFileSync(new URL("../altv-inject/main.js", import.meta.url)).toString() + `})().catch(e => ${ALT_SHARED_VAR}.logError("[altv-esbuild] banner wrapper error:", e?.stack ?? e?.message ?? e));
` + topLevelExceptionCode + `// ------------------- ${PLUGIN_NAME} banner -------------------
`;
  }
  endFooterJs(buildOptions) {
    let topLevelExceptionCode = "";
    if (this.options.dev.topLevelExceptionHandling) {
      topLevelExceptionCode += `} catch (e) {
        const error = ${ALT_SHARED_VAR}.logError;

        // hide all other user logs to show error at a glance
        ${ALT_SHARED_VAR}.log = () => {};
        ${ALT_SHARED_VAR}.logWarning = () => {};
        ${ALT_SHARED_VAR}.logError = () => {};
        ${ALT_VAR}.log = () => {};
        ${ALT_VAR}.logWarning = () => {};
        ${ALT_VAR}.logError = () => {};
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};

        ${ALT_SHARED_VAR}.setTimeout(() => {
          error(
            "[${PLUGIN_NAME}] Top-level exception:\\n  ",
            e?.stack ?? e
          );
        }, 500);
        if (${ALT_VAR}.isClient) {
          drawError("TOP-LEVEL EXCEPTION", "see client console", "(it's message from altv-esbuild)");
          function drawError(title,text,text2){
            const alt = ${ALT_VAR};
            alt.addGxtText("warning_error",title);
            alt.addGxtText("warning_text",text);
            alt.addGxtText("warning_text2",text2);
            let state=!alt.isConsoleOpen();
            const timeout=alt.setInterval(()=>{state=!alt.isConsoleOpen()},50);
            const tick=alt.everyTick(()=>{
              if (state) {
                ${ALT_NATIVES_VAR}.setWarningMessageWithHeader(
                  "warning_error",
                  "warning_text",
                  0,
                  "warning_text2",
                  false, -1,
                  null, null,
                  true, 0
                );
              }
            });
            return()=>{alt.clearInterval(timeout);alt.clearEveryTick(tick)}
          }
        }
      }`;
    }
    buildOptions.footer.js += `
// ------------------- ${PLUGIN_NAME} footer -------------------
` + topLevelExceptionCode + `
// ------------------- ${PLUGIN_NAME} footer -------------------
`;
  }
  addExternalImportHandling(build, moduleName, varName, useDefaultExport = false) {
    const namespace = `${PLUGIN_NAME}:external-handling-${moduleName}`;
    if (!this.bannerImportsCode.includes(`import ${varName} from`))
      this.bannerImportsCode += `import ${varName} from "${moduleName}";
`;
    build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, (args) => ({
      path: args.path,
      namespace
    }));
    build.onLoad({ filter: /.*/, namespace }, () => {
      return {
        contents: useDefaultExport ? `export default ${varName}` : `module.exports = ${varName}`
      };
    });
  }
  addCustomModule(build, moduleName, contents) {
    const namespace = `${PLUGIN_NAME}:custom-module-${moduleName}`;
    build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, (args) => ({
      path: args.path,
      namespace
    }));
    build.onLoad({ filter: /.*/, namespace }, () => {
      return { contents, loader: "js" };
    });
  }
  enableMoveExternalImportsOnTop({ external }, additionalExternal, additionalTop, moduleContents, additionalExternalStart) {
    const externalsOnTopNamespace = `${PLUGIN_NAME}:externals-on-top`;
    const externalRegExpString = [...external, ...additionalExternal ?? []].join("|");
    const externalVarNames = {};
    this.bannerImportsCode += "// ----------------- external imports on top -----------------\n";
    if (additionalTop) {
      this.bannerImportsCode += "// ----------- additional top -----------\n";
      this.bannerImportsCode += additionalTop;
      this.bannerImportsCode += "// ----------- additional top -----------\n";
    }
    for (const externalName of external) {
      if (externalName.includes("*")) {
        const errorMessage = `external name: ${externalName} "*" wildcard character is not supported yet`;
        this._log.error(errorMessage);
        this._log.error("(this error came from plugin option moveExternalsOnTop");
        this._log.error("that can be disabled if you are not using externals with enabled topLevelExceptionHandling)");
        throw new Error(errorMessage);
      }
      const externalVarName = codeVarName(`externalOnTop_${externalName}`);
      externalVarNames[externalName] = externalVarName;
      this.bannerImportsCode += `import * as ${externalVarName} from "${externalName}";
`;
    }
    for (const extern of additionalExternal ?? [])
      externalVarNames[extern] = codeVarName(`additional_externalOnTop_${extern}`);
    this.bannerImportsCode += "// ----------------- external imports on top -----------------\n";
    this.build.onResolve(
      {
        // eslint-disable-next-line prefer-regex-literals
        filter: new RegExp(`^(${externalRegExpString}|${additionalExternalStart}.+)$`)
      },
      ({ path }) => {
        if (additionalExternalStart && path.startsWith(additionalExternalStart)) {
          this._log.debug("import additionalExternalStart path:", path);
          return {
            path,
            namespace: externalsOnTopNamespace,
            pluginData: null
          };
        }
        const externalVarName = codeVarName(`externalOnTop_${path}`);
        if (!externalVarName) {
          const errorMessage = `external: ${path} var name not found`;
          this._log.error(errorMessage);
          throw new Error(errorMessage);
        }
        return {
          path,
          namespace: externalsOnTopNamespace,
          pluginData: externalVarName
        };
      }
    );
    this.build.onLoad(
      { filter: /.*/, namespace: externalsOnTopNamespace },
      ({ pluginData: externalVarName, path }) => {
        return {
          contents: moduleContents?.(path, externalVarName ?? null) ?? `
            Object.defineProperty(exports, '__esModule', { value: true })
            for (const key in ${externalVarName}) {
              exports[key] = ${externalVarName}[key]
            }
        `
        };
      }
    );
  }
};

// src/plugin/client/setup.ts
import net from "net";

// src/shared/util/socket-connect.ts
var _SocketConnect = class {
  constructor(name, _net, port, connectHandler) {
    this.name = name;
    this._net = _net;
    this.port = port;
    this.connectHandler = connectHandler;
    this._socket = this.connect();
  }
  logDebug = true ? (info) => console.log(`[${this.name}][DEBUG]`, info) : () => {
  };
  onError = (e) => {
    if (!(e?.code === "ECONNRESET" || e?.code === "ECONNREFUSED"))
      return;
    this.logDebug(`disconnected from server, trying reconnecting in ${_SocketConnect.RECONNECT_MS}ms...`);
    setTimeout(
      () => this.connect(),
      _SocketConnect.RECONNECT_MS
    );
  };
  onConnect = (socket) => {
    this.connectHandler(socket);
  };
  _socket;
  get socket() {
    return this._socket;
  }
  connect() {
    if (this._socket)
      this._socket.destroy();
    const socket = this._net.connect(this.port);
    socket.on("connect", this.onConnect.bind(this, socket));
    socket.on("error", this.onError);
    return socket;
  }
};
var SocketConnect = _SocketConnect;
__publicField(SocketConnect, "RECONNECT_MS", 500);

// src/plugin/client/setup.ts
var ClientSetup = class extends SharedSetup {
  events = {
    buildEnd: () => {
    },
    buildStart: () => {
    },
    clientConnect: () => {
    },
    clientDisconnect: () => {
    }
  };
  onConnect = () => {
    this.log.info("connected to server");
    this.eventManager?.send("connect", "client");
  };
  log = new Logger("client");
  socket;
  eventManager;
  socketConnect;
  constructor(options, build) {
    super(options, build);
    const { dev } = options;
    if (dev.hotReload) {
      this.socketConnect = new SocketConnect(
        "plugin-client",
        net,
        this.options.dev.hotReloadServerPort,
        (socket) => {
          this.socket = socket;
          this.eventManager = new EventManager(
            this.socket,
            this.events,
            (msg) => this.log.error("[events]", msg)
          );
          this.onConnect();
        }
      );
      build.onStart(() => {
        this.eventManager?.send("clientBuildStart");
      });
      build.onEnd(({ errors }) => {
        if (errors.length) {
          this.log.debug("client build end errors");
          return;
        }
        this.eventManager?.send("clientBuildEnd");
      });
    }
    this.addExternalImportHandling(build, "alt-client", ALT_VAR, true);
    this.addExternalImportHandling(build, "natives", ALT_NATIVES_VAR, true);
  }
  handleBuildOptions() {
    const buildOptions = super.handleBuildOptions();
    const altClientIdx = buildOptions.external.indexOf("alt-client");
    if (altClientIdx !== -1)
      buildOptions.external.splice(altClientIdx, 1);
    const nativesIdx = buildOptions.external.indexOf("natives");
    if (nativesIdx !== -1)
      buildOptions.external.splice(nativesIdx, 1);
    if (this.options.dev.moveExternalsOnTop)
      this.enableMoveExternalImportsOnTop(buildOptions);
    this.endBannerJs(buildOptions);
    this.endFooterJs(buildOptions);
    return buildOptions;
  }
};

// src/plugin/server/net-server/class.ts
import net2 from "net";
var NetServer = class {
  constructor(mode, port, connectModeHandler, clientBuildStartHandler, clientBuildEndHandler) {
    this.mode = mode;
    this.port = port;
    this.connectModeHandler = connectModeHandler;
    this.clientBuildStartHandler = clientBuildStartHandler;
    this.clientBuildEndHandler = clientBuildEndHandler;
    this.tryListen(port);
    this.server.on("error", this.onError);
    this.server.on("listening", this.onStartListening);
    this.onErrorAddrInUse = () => {
      this.log.error("port:", this.port, "already in use");
      process.exit();
    };
  }
  onStartListening = () => {
    this.log.info("started listening on port:", this.port);
  };
  onConnect = (socket) => {
    this.log.debug("some client connected");
    let socketMode = "unknown";
    const eventManager = new EventManager(
      socket,
      {
        connect: (mode) => {
          if (this._sockets[mode]) {
            this.log.error(`another socket mode: ${mode} is connected currently`);
            socket.destroy();
            eventManager.destroy();
            return;
          }
          socketMode = mode;
          this.log.info(`connected socket mode: ${mode}`);
          this._sockets[mode] = { socket, eventManager };
          socket.on("close", this.onSocketClose.bind(this, mode));
          if (mode === "client" || mode === "server" && this._sockets.client)
            this._sockets.server?.eventManager.send("clientConnect");
          this.connectModeHandler(mode);
        },
        clientBuildStart: () => {
          this.clientBuildStartHandler();
        },
        clientBuildEnd: () => {
          this.clientBuildEndHandler();
        }
      },
      (msg, e) => this.onSocketError(socketMode, msg, e)
    );
  };
  onError = (e) => {
    if (e.code === "EADDRINUSE")
      this.onErrorAddrInUse();
    this.log.error("server error:", e);
  };
  onSocketError = (mode, msg, e) => {
    if (e?.code === "ECONNRESET") {
      this.log.debug(`disconnected socket mode: ${mode}`);
      return;
    }
    this.log.error(`socket mode: ${mode} error:`, e);
  };
  onSocketClose = (mode) => {
    this._sockets[mode]?.eventManager.destroy();
    this._sockets[mode] = null;
    this.log.info(`disconnected socket mode: ${mode}`);
  };
  log = new Logger("NetServer");
  server = new net2.Server(this.onConnect);
  onErrorAddrInUse;
  _sockets = {
    client: null,
    server: null
  };
  get sockets() {
    return this._sockets;
  }
  sendEvent(mode, event, ...args) {
    const targetSocket = this._sockets[mode];
    if (!targetSocket) {
      this.log.error(`[sendEvent] event: ${event} no target socket mode: ${mode}`);
      return;
    }
    targetSocket.eventManager.send(event, ...args);
  }
  tryListen(port) {
    this.server.listen(port);
  }
};

// src/plugin/server/nodeBuiltins.ts
var nodeBuiltins = [
  "_http_agent",
  "_http_client",
  "_http_common",
  "_http_incoming",
  "_http_outgoing",
  "_http_server",
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_wrap",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
];

// src/plugin/server/setup.ts
var ServerSetup = class extends SharedSetup {
  hotReloadServer;
  log = new Logger("server");
  cachedBuildState = {
    client: 0 /* None */,
    server: 0 /* None */
  };
  wasConnectedOnce = {
    client: false,
    server: false
  };
  onConnectSomeMode = (mode) => {
    if (!this.wasConnectedOnce[mode]) {
      this.wasConnectedOnce[mode] = true;
      return;
    }
    const currentState = this.cachedBuildState[mode];
    if (currentState === 0 /* None */)
      return;
    this.log.debug("onConnectSomeMode:", mode, "-> sending cached build event:", BuildState[currentState]);
    switch (currentState) {
      case 1 /* Start */:
        this.sendBuildStart(mode, true);
        break;
      case 2 /* End */:
        this.sendBuildEnd(mode, true);
        break;
    }
    this.cachedBuildState[mode] = 0 /* None */;
  };
  onClientBuildStart = () => {
    this.log.debug("onClientBuildStart");
    if (this.cacheBuildStateIfNeeded("client", 2 /* End */)) {
      this.log.debug("onClientBuildStart but server socket is not connected -> send it on connect");
      return;
    }
    if (!this.hotReloadServer?.sockets.server)
      return;
    this.log.debug("onClientBuildStart, send server altv-inject buildStart event");
    this.sendBuildStart("client");
  };
  onClientBuildEnd = () => {
    this.log.debug("onClientBuildEnd");
    if (this.cacheBuildStateIfNeeded("client", 2 /* End */)) {
      this.log.debug("onClientBuildEnd but server socket is not connected -> send it on connect");
      return;
    }
    if (!this.hotReloadServer?.sockets.server)
      return;
    this.log.debug("onClientBuildEnd, send server altv-inject BuildEnd event");
    this.sendBuildEnd("client");
  };
  constructor(options, build) {
    super(options, build);
    const { mode, dev } = options;
    if (dev.enabled) {
      if (dev.hotReload) {
        const server = new NetServer(
          mode,
          dev.hotReloadServerPort,
          this.onConnectSomeMode,
          this.onClientBuildStart,
          this.onClientBuildEnd
        );
        this.hotReloadServer = server;
        const cacheBuildStateIfNeeded = this.cacheBuildStateIfNeeded.bind(
          this,
          "server"
        );
        build.onEnd(({ errors }) => {
          if (errors.length) {
            this.log.debug("build.onEnd errors");
            return;
          }
          this.log.debug("server buildEnd");
          if (cacheBuildStateIfNeeded(2 /* End */)) {
            this.log.debug("buildEnd but server socket is not connected -> send it on connect");
            return;
          }
          if (!server.sockets.server)
            return;
          this.log.debug("send buildEnd");
          this.sendBuildEnd("server");
        });
        build.onStart(() => {
          if (cacheBuildStateIfNeeded(1 /* Start */)) {
            this.log.debug("buildStart but server socket is not connected -> send it on connect");
            return;
          }
          if (!server.sockets.server)
            return;
          this.log.debug("send buildStart");
          this.sendBuildStart("server");
        });
      }
    }
    this.addExternalImportHandling(build, "alt-server", ALT_VAR);
  }
  handleBuildOptions() {
    const buildOptions = super.handleBuildOptions();
    const altServerIdx = buildOptions.external.indexOf("alt-server");
    if (altServerIdx !== -1)
      buildOptions.external.splice(altServerIdx, 1);
    if (this.options.dev.moveExternalsOnTop) {
      const createRequireVar = codeVarName("createRequire");
      const customRequireVar = codeVarName("customRequire");
      this.enableMoveExternalImportsOnTop(
        buildOptions,
        nodeBuiltins,
        `import { createRequire as ${createRequireVar} } from 'module';
const ${customRequireVar} = ${createRequireVar}(import.meta.url);
`,
        // who wrote this demonic fuckery?
        (path, externalVarName) => `
            try {
              module.exports = ${customRequireVar}('${path}')
            } catch (e) {
              ${/* eslint-disable @typescript-eslint/indent */
        externalVarName ? `
                        if (!(
                          e.code === 'ERR_REQUIRE_ESM' ||
                          e.code === 'MODULE_NOT_FOUND' // altv resource import error fix
                        )) {
                          try {
                            ${ALT_SHARED_VAR}.nextTick(() => ${ALT_SHARED_VAR}.logError(e?.stack))
                          } catch {}
                        }
                        Object.defineProperty(exports, '__esModule', { value: true })
                        for (const key in ${externalVarName}) {
                          exports[key] = ${externalVarName}[key]
                        }` : `${ALT_SHARED_VAR}.nextTick(() => ${ALT_SHARED_VAR}.logError("Failed to import nodejs built in module name: '${path}'", e?.stack))`}
              }
        `,
        /* eslint-enable @typescript-eslint/indent */
        "node:"
      );
    }
    this.endBannerJs(buildOptions);
    this.endFooterJs(buildOptions);
    return buildOptions;
  }
  sendBuildStart(mode, cached = false) {
    this.hotReloadServer?.sendEvent("server", "buildStart", mode, cached);
  }
  sendBuildEnd(mode, cached = false) {
    this.hotReloadServer?.sendEvent("server", "buildEnd", mode, cached);
  }
  cacheBuildStateIfNeeded(mode, buildState) {
    if (this.hotReloadServer?.sockets.server)
      return false;
    if (!this.wasConnectedOnce[mode])
      return false;
    if (this.cachedBuildState[mode] === buildState) {
      this.log.debug("[cacheBuildStateIfNeeded] mode:", mode, BuildState[buildState], "already cached");
      return true;
    }
    this.log.debug("cache mode:", mode, "buildState:", BuildState[buildState]);
    this.cachedBuildState[mode] = buildState;
    return true;
  }
};

// src/plugin/main.ts
var altvEsbuild = (userOptions) => {
  const options = mergeOptions(userOptions);
  const log = new Logger("plugin");
  log.debug("merged options:", options);
  return {
    name: PLUGIN_NAME,
    setup(build) {
      const {
        initialOptions
      } = build;
      const modeSetup = options.mode === "client" ? new ClientSetup(options, build) : new ServerSetup(options, build);
      const buildOptions = modeSetup.handleBuildOptions();
      Object.assign(initialOptions, buildOptions);
    }
  };
};
export {
  altvEsbuild
};
