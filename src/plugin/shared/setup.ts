import type { FilledPluginOptions } from "@/shared"
import type esbuild from "esbuild"
import { PLUGIN_NAME } from "../../shared/constants"
import type { IPatchedBuildOptions } from "./types"
import { codeVarName, Logger } from "./util"
import fs from "fs"
import path from "path"
import { ALT_NATIVES_VAR, ALT_SHARED_VAR, ALT_VAR } from "./constants"

export abstract class SharedSetup {
  private readonly _log: Logger

  private bannerImportsCode = "// banner imports\n"

  constructor(
    protected readonly options: FilledPluginOptions,
    private readonly build: esbuild.PluginBuild,
  ) {
    this._log = new Logger(`shared: ${options.mode}`)

    this.addExternalImportHandling(build, "alt-shared", ALT_SHARED_VAR)
    this.addExternalImportHandling(build, "alt", ALT_VAR)

    if (options.altvEnums) {
      this.addCustomModule(
        build,
        "altv-enums",
        fs.readFileSync(
          new URL(
            "../../altv-enums/dist/enums.js",
            import.meta.url,
          ),
        ).toString() + `\n${ALT_VAR}.logWarning('[altv-esbuild] altvEnums feature is deprecated, use built-in JS enums instead: https://github.com/altmp/altv-js-module/pull/319')`,
      )
    }
  }

  public handleBuildOptions(): IPatchedBuildOptions {
    const {
      banner,
      footer,
      external,
    } = this.build.initialOptions

    const buildOptions: IPatchedBuildOptions = {
      banner: {
        ...banner,
        js: banner?.["js"] ?? "",
      },
      footer: {
        ...footer,
        js: footer?.["js"] ?? "",
      },
      external: external ? [...external] : [],
    }

    this.bannerImportsCode += `const ${codeVarName("altvInject_pluginOptions")} = ${JSON.stringify(this.options)};\n`

    if (this.options.dev.enhancedRestartCommand) {
      let pluginDistDir = import.meta.url.slice("file:///".length)
      pluginDistDir = path.join(pluginDistDir, "../../")
      pluginDistDir = pluginDistDir.replaceAll("\\", "/")

      // for example "C:/server_dir/node_modules/altv-esbuild/dist"
      this._log.debug({ pluginDistDir })

      this.bannerImportsCode += `const ${codeVarName("altvInject_pluginDistDir")} = "${pluginDistDir}";\n`
    }

    const altIdx = buildOptions.external.indexOf("alt")
    const altSharedIdx = buildOptions.external.indexOf("alt-shared")

    if (altIdx !== -1)
      buildOptions.external.splice(altIdx, 1)
    if (altSharedIdx !== -1)
      buildOptions.external.splice(altSharedIdx, 1)

    return buildOptions
  }

  protected endBannerJs(buildOptions: IPatchedBuildOptions): void {
    let topLevelExceptionCode = ""

    if (this.options.dev.topLevelExceptionHandling)
      topLevelExceptionCode += "try {"

    buildOptions.banner.js += (
      `// ------------------- ${PLUGIN_NAME} banner -------------------\n` +
      this.bannerImportsCode +
      "await (async () => { // start banner wrapper\n" +
      fs.readFileSync(new URL("../altv-inject/main.js", import.meta.url)).toString() +
      `})().catch(e => ${ALT_SHARED_VAR}.logError(\"[altv-esbuild] banner wrapper error:\", e?.stack ?? e?.message ?? e));\n` +
      topLevelExceptionCode +
      `// ------------------- ${PLUGIN_NAME} banner -------------------\n`
    )
  }

  protected endFooterJs(buildOptions: IPatchedBuildOptions): void {
    let topLevelExceptionCode = ""

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
      }`
    }

    buildOptions.footer.js += (
      `\n// ------------------- ${PLUGIN_NAME} footer -------------------\n` +
      topLevelExceptionCode +
      `\n// ------------------- ${PLUGIN_NAME} footer -------------------\n`
    )
  }

  protected addExternalImportHandling(build: esbuild.PluginBuild, moduleName: string, varName: string): void {
    const namespace = `${PLUGIN_NAME}:external-handling-${moduleName}`

    if (!this.bannerImportsCode.includes(`import ${varName} from`))
      this.bannerImportsCode += `import ${varName} from \"${moduleName}\";\n`

    build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, (args) => ({
      path: args.path,
      namespace,
    }))

    const useDefaultExport = this.options.altDefaultImport

    build.onLoad({ filter: /.*/, namespace }, () => {
      return {
        contents: useDefaultExport ? `export default ${varName}` : `module.exports = ${varName}`,
      }
    })
  }

  protected addCustomModule(build: esbuild.PluginBuild, moduleName: string, contents_: string | (() => string)): void {
    const namespace = `${PLUGIN_NAME}:custom-module-${moduleName}`

    build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, (args) => ({
      path: args.path,
      namespace,
    }))

    const contents = typeof contents_ === "string" ? (): string => contents_ : contents_

    build.onLoad({ filter: /.*/, namespace }, () => {
      return { contents: contents(), loader: "js" }
    })
  }

  protected enableMoveExternalImportsOnTop(
    ignore: readonly string[],
    { external }: IPatchedBuildOptions,
    additionalExternal?: string[],
    additionalTop?: string,
    moduleContents?: (path: string, externalVarName: string | null) => string,
    additionalExternalStart?: string, // used for nodejs built-in modules whose names begin with "node:"
  ): void {
    const externalsOnTopNamespace = `${PLUGIN_NAME}:externals-on-top`
    external = external.filter(e => !ignore.includes(e))
    const externalRegExpString = [...external, ...(additionalExternal ?? [])]
      .join("|")

    /** { [external original name]: external var name } */
    const externalVarNames: Record<string, string> = {}

    this.bannerImportsCode += "// ----------------- external imports on top -----------------\n"

    if (additionalTop) {
      this.bannerImportsCode += "// ----------- additional top -----------\n"
      this.bannerImportsCode += additionalTop
      this.bannerImportsCode += "// ----------- additional top -----------\n"
    }

    // saving custom module names in externalVarNames
    // in order to import these modules at once, at the top of the bundle
    for (const externalName of external) {
      if (externalName.includes("*")) {
        const errorMessage = `external name: ${externalName} "*" wildcard character is not supported yet`

        this._log.error(errorMessage)
        this._log.error("(this error came from plugin option moveExternalsOnTop")
        this._log.error("that can be disabled if you are not using externals with enabled topLevelExceptionHandling)")

        throw new Error(errorMessage)
      }

      const externalVarName = codeVarName(`externalOnTop_${externalName}`)

      externalVarNames[externalName] = externalVarName
      this.bannerImportsCode += `import * as ${externalVarName} from "${externalName}";\n`
    }

    for (const extern of additionalExternal ?? [])
      externalVarNames[extern] = codeVarName(`additional_externalOnTop_${extern}`)

    this.bannerImportsCode += "// ----------------- external imports on top -----------------\n"

    this.build.onResolve(
      {
        // eslint-disable-next-line prefer-regex-literals
        filter: new RegExp(`^(${externalRegExpString}|${additionalExternalStart}.+)$`),
      },
      ({ path }) => {
        this._log.debug("build.onResolve", { path })

        if (additionalExternalStart && path.startsWith(additionalExternalStart)) {
          this._log.debug("import additionalExternalStart path:", path)
          return {
            path,
            namespace: externalsOnTopNamespace,
            pluginData: null,
          }
        }

        const externalVarName = codeVarName(`externalOnTop_${path}`)
        this._log.debug(`resolve external import ${path}`)

        if (!externalVarName) {
          const errorMessage = `external: ${path} var name not found`

          this._log.error(errorMessage)
          throw new Error(errorMessage)
        }

        return {
          path,
          namespace: externalsOnTopNamespace,
          pluginData: externalVarName,
        }
      })

    this.build.onLoad({ filter: /.*/, namespace: externalsOnTopNamespace },
      ({ pluginData: externalVarName, path }) => {
        return {
          contents: moduleContents?.(path, (externalVarName ?? null) as string | null) ?? (`
            Object.defineProperty(exports, '__esModule', { value: true })
            for (const key in ${externalVarName}) {
              exports[key] = ${externalVarName}[key]
            }
        `),
        }
      })
  }
}
