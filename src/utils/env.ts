import { Collection } from '@discordjs/collection'
import fs from 'fs'
import path from 'path'

class EnvParser {
  constructor(
    private value: string,
    private key: string,
  ) {}

  toString(): string {
    return this.value
  }

  toNumber(): number {
    if (isNaN(this.value as any)) throw new Error(`Item '${this.key}' is not a valid number`)

    return Number(this.value)
  }

  toBoolean(): boolean {
    return this.value == 'true' || this.value == 'True'
  }

  toArray(): any[] {
    if (this.value[0] !== '[' || this.value[this.value.length - 1] !== ']')
      throw new Error(`Item '${this.key}' is not a valid array`)

    return JSON.parse(this.value)
  }

  toObject(): object {
    if (this.value[0] !== '{' || this.value[this.value.length - 1] !== '}')
      throw new Error(`Item '${this.key}' is not a valid object`)

    return JSON.parse(this.value)
  }
}

class Env {
  #cache = new Collection<string, string>()

  constructor() {
    const envPath = path.resolve(process.cwd(), '.env')

    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf-8').replace(/^(.+?)=(.+?)$/gm, (_, key, name) => {
        this.#cache.set(key, name)

        return ''
      })
    }
  }

  public has(key: string) {
    return this.#cache.has(key)
  }

  public get(key: string, required: true): EnvParser
  public get(key: string, required?: false): EnvParser | undefined
  public get(key: string, required = false): EnvParser | undefined {
    const value = this.#cache.get(key)

    if (required && value === undefined) throw new Error(`Env error: '${key}' is required`)

    if (value === undefined) return undefined

    return new EnvParser(value, key)
  }
}

export default new Env()
