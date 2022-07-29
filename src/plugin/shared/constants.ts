import { codeVarName } from "./util"

export const ALT_SHARED_VAR = codeVarName("altvInject_altShared")

export enum BuildState {
  None,
  Start,
  End,
}
