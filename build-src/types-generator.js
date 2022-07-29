import { exec } from "child_process"
import process from "process"

export const typesGenerator = () => 
  (errorInfo, result) => {
    if (errorInfo?.errors?.length) {
      console.log('typesGenerator build errors -> skip')
      return
    }
    
    if (typesGenerator.child) {
      typesGenerator.child.kill()
    }

    const child = exec("yarn types")
    typesGenerator.child = child

    child.stdout.pipe(process.stdout)
    child.stderr.pipe(process.stderr)

    child.stdout.on("data", (chunk) => {
      chunk = chunk + ""
      if (!chunk.startsWith("Done in")) return
      child.kill()
    })

    process.on("SIGINT", () => {
      child.kill()
    })
  }
