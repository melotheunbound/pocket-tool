export default class List<Type> extends Array<Type> {
  #current: Type | undefined
  #pointer: number
  #loop: boolean

  constructor(loop = false, ...items: Type[]) {
    super(...items)

    this.#loop = loop
    this.#pointer = 0
    this.#current = items[this.#pointer]
  }

  public get current() {
    return this.#current
  }

  public get pointer() {
    return this.#pointer
  }

  public goTo(index: number) {
    if (this.#loop) index = ((index % this.length) + this.length) % this.length
    else index = Math.min(Math.max(index, 0), this.length - 1)

    this.#pointer = index
    this.#current = this[index]

    return this
  }

  public next() {
    let prev = this.#current

    if (this.#pointer >= this.length - 1) this.#pointer = this.#loop ? 0 : this.length - 1
    else this.#pointer++

    this.#current = this[this.#pointer]

    return prev!
  }

  public back() {
    let prev = this.#current

    if (this.#pointer <= 0) this.#pointer = this.#loop ? this.length - 1 : 0
    else this.#pointer--

    this.#current = this[this.#pointer]

    return prev!
  }

  public hasNext() {
    return this.#pointer < this.length - 1
  }

  public hasPrevious() {
    return this.#pointer > 0
  }

  public getNext() {
    return this[this.#pointer + 1]!
  }

  public getPrevious() {
    return this[this.#pointer - 1]!
  }
}
