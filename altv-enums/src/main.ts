import fs from "fs"
import esbuild from "esbuild"

const OUTPUT_JS_FILE = "dist/enums.js"
const OUTPUT_TYPES_FILE = "types/types/index.d.ts"
const BASE_TYPES_URL = "https://raw.githubusercontent.com/altmp/altv-types/master/"

enum AltModule {
  Shared = "shared",
  Server = "server",
  Client = "client",
}

const files: Record<AltModule, string> = {
  [AltModule.Shared]: BASE_TYPES_URL + `${AltModule.Shared}/index.d.ts`,
  [AltModule.Server]: BASE_TYPES_URL + `${AltModule.Server}/index.d.ts`,
  [AltModule.Client]: BASE_TYPES_URL + `${AltModule.Client}/index.d.ts`,
}

const ENUM_START_CODE_REGEX = /export.+enum/
const ENUM_END_CODE_LINE = "}"

let enumsContents = ""
const enumNamesMap: Record<string, true> = {}
const enumNamesModules: Record<AltModule, string[]> = {
  [AltModule.Shared]: [],
  [AltModule.Server]: [],
  [AltModule.Client]: [],
}

const fetchAltvTypes = async (): Promise<void> => {
  const promises: Promise<void>[] = []
  const texts: { text: string; module: AltModule }[] = []

  for (const [altModule, url] of Object.entries(files)) {
    promises.push((async (): Promise<void> => {
      const text = await (await fetch(url)).text()
      texts.push({
        text,
        module: altModule as AltModule,
      })

      console.log("loaded file:", altModule)
    })())
  }
  await Promise.all(promises)

  for (const { text, module } of texts) {
    const lines = text.split("\n")
    let currentReadingEnum = ""

    for (const line of lines) {
      const enumStart = ENUM_START_CODE_REGEX.test(line)
      const enumEndIdx = line.indexOf(ENUM_END_CODE_LINE)

      if (enumStart) {
        if (currentReadingEnum)
          throw new Error(`enum reading already started: ${currentReadingEnum}, but another beginning of enum is found`)

        const enumName = line.slice(
          line.indexOf("enum") + 5,
          line.lastIndexOf(" {"),
        )

        if (enumNamesMap[enumName]) {
          console.log(`!!! [${module}] detected duplicated enum:`, enumName, "!!!")
          continue
        }

        enumNamesMap[enumName] = true
        currentReadingEnum = enumName
        enumsContents += `export enum ${enumName} {\n`

        enumNamesModules[module].push(enumName)

        console.log(`[${enumName}]`)
      }
      else if (enumEndIdx !== -1) {
        if (!currentReadingEnum) {
          // console.log("enum read already ended, but found another enum end")
          continue
        }
        currentReadingEnum = ""
        enumsContents += "}\n"
      }
      else if (currentReadingEnum)
        enumsContents += `${line}\n`
    }
  }
}

const writeFile = (
  outputPath: string,
  contents: string,
  banner = "",
  footer = "",
): void => {
  try {
    fs.mkdirSync(`altv-enums/${outputPath.slice(0, outputPath.indexOf("/"))}`)
  }
  catch {}
  fs.writeFileSync(`altv-enums/${outputPath}`, `// automatically generated from altv-types
${banner}
${contents.split("\n").map(l => "  " + l).join("\n")}
${footer}
`)
}

await fetchAltvTypes()

const { code } = esbuild.transformSync(
  enumsContents,
  {
    loader: "ts",
  },
)
writeFile(OUTPUT_JS_FILE, code)

let typesContents = ""
for (const [altModule, enums] of Object.entries(enumNamesModules)) {
  let altExports = "export { "

  for (const e of enums)
    altExports += `${e}, `

  altExports += `} from "alt-${altModule}";\n`

  typesContents += altExports
}

writeFile(
  OUTPUT_TYPES_FILE,
  typesContents,
  "\
/// <reference types=\"@altv/types-client\"/>\n\
/// <reference types=\"@altv/types-server\"/>\n\
/// <reference types=\"@altv/types-shared\"/>\n\
declare module \"altv-enums\" {",
  "}",
)

console.log("enumNamesModules:", enumNamesModules)
