export const codeVarName = (name: string): string => {
  return (
    "___altvEsbuild_" +
    (name.replace(/[-/\\ @.:]/g, "_x_")) +
    "___"
  )
}
