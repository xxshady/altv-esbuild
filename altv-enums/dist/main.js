// altv-enums/src/main.ts
import fs from "fs";
import esbuild from "esbuild";
var OUTPUT_JS_FILE = "dist/enums.js";
var OUTPUT_TYPES_FILE = "types/types/index.d.ts";
var BASE_TYPES_URL = "https://raw.githubusercontent.com/altmp/altv-types/master/";
var files = {
  ["shared" /* Shared */]: BASE_TYPES_URL + `${"shared" /* Shared */}/index.d.ts`,
  ["server" /* Server */]: BASE_TYPES_URL + `${"server" /* Server */}/index.d.ts`,
  ["client" /* Client */]: BASE_TYPES_URL + `${"client" /* Client */}/index.d.ts`
};
var ENUM_START_CODE_REGEX = /export.+enum/;
var ENUM_END_CODE_LINE = "}";
var enumsContents = "";
var enumNamesMap = {};
var enumNamesModules = {
  ["shared" /* Shared */]: [],
  ["server" /* Server */]: [],
  ["client" /* Client */]: []
};
var fetchAltvTypes = async () => {
  const promises = [];
  const texts = [];
  for (const [altModule, url] of Object.entries(files)) {
    promises.push((async () => {
      const text = await (await fetch(url)).text();
      texts.push({
        text,
        module: altModule
      });
      console.log("loaded file:", altModule);
    })());
  }
  await Promise.all(promises);
  for (const { text, module } of texts) {
    const lines = text.split("\n");
    let currentReadingEnum = "";
    for (const line of lines) {
      const enumStart = ENUM_START_CODE_REGEX.test(line);
      const enumEndIdx = line.indexOf(ENUM_END_CODE_LINE);
      if (enumStart) {
        if (currentReadingEnum)
          throw new Error(`enum reading already started: ${currentReadingEnum}, but another beginning of enum is found`);
        const enumName = line.slice(line.indexOf("enum") + 5, line.lastIndexOf(" {"));
        if (enumNamesMap[enumName]) {
          console.log(`!!! [${module}] detected duplicated enum:`, enumName, "!!!");
          continue;
        }
        enumNamesMap[enumName] = true;
        currentReadingEnum = enumName;
        enumsContents += `export enum ${enumName} {
`;
        enumNamesModules[module].push(enumName);
        console.log(`[${enumName}]`);
      } else if (enumEndIdx !== -1) {
        if (!currentReadingEnum) {
          continue;
        }
        currentReadingEnum = "";
        enumsContents += "}\n";
      } else if (currentReadingEnum)
        enumsContents += `${line}
`;
    }
  }
};
var writeFile = (outputPath, contents, banner = "", footer = "") => {
  try {
    fs.mkdirSync(`altv-enums/${outputPath.slice(0, outputPath.indexOf("/"))}`);
  } catch {
  }
  fs.writeFileSync(`altv-enums/${outputPath}`, `// automatically generated from altv-types
${banner}
${contents.split("\n").map((l) => "  " + l).join("\n")}
${footer}
`);
};
await fetchAltvTypes();
var { code } = esbuild.transformSync(enumsContents, {
  loader: "ts"
});
writeFile(OUTPUT_JS_FILE, code);
var typesContents = "";
for (const [altModule, enums] of Object.entries(enumNamesModules)) {
  let altExports = "export { ";
  for (const e of enums)
    altExports += `${e}, `;
  altExports += `} from "alt-${altModule}";
`;
  typesContents += altExports;
}
writeFile(OUTPUT_TYPES_FILE, typesContents, '/// <reference types="@altv/types-client"/>\n/// <reference types="@altv/types-server"/>\n/// <reference types="@altv/types-shared"/>\ndeclare module "altv-enums" {', "}");
console.log("enumNamesModules:", enumNamesModules);
