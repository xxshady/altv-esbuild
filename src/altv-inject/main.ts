import { ClientSetup } from "./client"
import { ServerSetup } from "./server"

// eslint-disable-next-line camelcase
const options = ___altvEsbuild_altvInject_pluginOptions___

if (options.mode === "client")
  new ClientSetup(options)
else
  new ServerSetup(options)
