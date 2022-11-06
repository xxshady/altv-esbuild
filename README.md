# altv-esbuild

Special thanks ❤️ to [innxz](https://github.com/innxz) for financially supporting me and this library.

A plugin that greatly simplifies server/client JS and TS development (as well as production) on the [alt:V](https://altv.mp) platform.

(extended and improved version of the previous [esbuild dev plugin](https://github.com/xxshady/esbuild-plugin-altv-dev-server)).

## Features

- Write your scripts in JS/TS with enabled 5-million-polygon cars and mlo without client crashes
- Hot reload without server restart or client reconnect (using alt:V [resource restart](https://docs.altv.mp/articles/commandlineargs.html#server-commands))
- Full client and server support
- Restart console command for client and server ("res" by default)
- Improved top-level exception output during development
- Direct support for alt:V enums, even in JS code ([documentation](https://xxshady.github.io/altv-esbuild/interfaces/ipluginoptions.html#altvenums))
- Enhanced alt.log value formatting ([documentation](https://xxshady.github.io/altv-esbuild/interfaces/ipluginoptions.html#enhancedaltlog))

## Docs

Docs web page: <https://xxshady.github.io/altv-esbuild>

## How to use?

Example resource can be found [here](https://github.com/xxshady/altv-esbuild/tree/main/example).

### Install from npm

```cli
npm i altv-esbuild
```

### Add to your build code of the server and client

Example of the build server code:

```js
import esbuild from "esbuild"
import { altvEsbuild } from "altv-esbuild"

esbuild.build({
  entryPoints: ["src/main.js"],
  outfile: "dist/bundle.js",
  bundle: true,
  watch: dev,
  plugins: [
    altvEsbuild({
      mode: "server", // use "server" for server code, and "client" for client code

      dev: true, // see docs for more info
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

## How to find exact source location of any exception?

You can use [esbuild source-maps](https://esbuild.github.io/api/#sourcemap) like this: `sourcemap: "inline"`

### serverside

Enable source-maps in [server.cfg](https://docs.altv.mp/articles/configs/server.html)
and [here you go](https://imgur.com/HJYM0y1).

### clientside

Here its a bit complicated. If you use vscode [Source maps navigator](https://marketplace.visualstudio.com/items?itemName=vlkoti.vscode-sourcemaps-navigator) extension can help you jump to your source code.

## Contributions

All contributions are greatly appreciated. If there are any questions or you would like to discuss a feature, you can always [open issue](https://github.com/xxshady/altv-esbuild/issues).
