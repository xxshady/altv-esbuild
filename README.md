# altv-esbuild
A plugin that greatly simplifies server/client JS and TS development (as well as production) on the [alt:V](https://altv.mp) platform.

(extended and improved version of the previous [esbuild dev plugin](https://github.com/xxshady/esbuild-plugin-altv-dev-server))

## Features
- Hot reload without server restart or client reconnect (using alt:V [resource restart](https://docs.altv.mp/articles/commandlineargs.html#server-commands))
- Full client and server support
- Restart console command for client and server ("res" by default)
- Improved top-level exception output during development

## How to use?

### Install from npm
```
npm i altv-esbuild
```
### Add to your build code of the server and client
Example of the build server code:
```js
import esbuild from "esbuild"
import { altvEsbuild } from "altv-esbuild"

// change this depending on the build mode of the code
const dev = true

esbuild.build({
  entryPoints: ["src/main.js"],
  outfile: "dist/bundle.js",
  bundle: true,
  watch: dev,
  plugins: [
    altvEsbuild({
      mode: "server", // use "server" for server code, and "client" for client code
      dev,
    }),
  ],
  
  external: [
    // none of the following is required, the plugin handles all alt:V modules automatically
    // "alt-server",
    // "alt-client",
    // "alt-shared",
    // "natives"
  ]
})
```
