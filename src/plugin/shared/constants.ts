import { codeVarName } from "./util"

export const ALT_SHARED_VAR = codeVarName("altvInject_altShared")
export const ALT_VAR = codeVarName("altvInject_alt")
export const ALT_NATIVES_VAR = codeVarName("altvInject_native")

export enum BuildState {
  None,
  Start,
  End,
}
