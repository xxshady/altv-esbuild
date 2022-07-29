# altv-esbuild

## How to use?

```
npm i altv-esbuild
```

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
