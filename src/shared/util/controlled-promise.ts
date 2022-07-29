export class ControlledPromise<T> {
  private readonly _promise: Promise<T>

  private _resolve!: (value: T) => void
  private _reject!: (e: Error) => void

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve
      this._reject = reject
    })
  }

  public get promise(): Promise<T> {
    return this._promise
  }

  public resolve(value: T): void {
    this._resolve(value)
  }

  public reject(error: string | Error): void {
    this._reject(error instanceof Error ? error : new Error(error))
  }
}
