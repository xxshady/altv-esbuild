export const codeVarName = (name: string): string => {
  return (
    "___altvEsbuild_" +
    (name.replace(/[-/\\ ]/g, "_")) +
    "___"
  )
}
