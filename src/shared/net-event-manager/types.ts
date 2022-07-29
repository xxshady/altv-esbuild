export interface ICommunicator {
  on(event: "data", handler: (data: Buffer) => void): void
  on(event: "error", handler: (e: Error) => void): void
  write(data: string): void
  removeAllListeners(event: string): void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventInterface = Record<string, any>

export interface ISeparatedCommunicator {
  sender?: ICommunicator
  receiver?: ICommunicator
}
