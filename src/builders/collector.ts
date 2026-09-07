import type { Collector, CollectorEvents, CollectorOptions } from '../types/types'
import { captureRejectionSymbol, EventEmitter } from 'events'

export const collectors = new Set<Collector<unknown>>()

export default function createCollector<Type>(options: CollectorOptions<Type>): Collector<Type> {
  const { duration, max, filter } = options

  let collectedCount = 0
  let stopped = false
  let timeout: NodeJS.Timeout | undefined

  const emitter = new EventEmitter<CollectorEvents<Type>>({ captureRejections: true }) as Collector<Type>

  // handles rejected end listeners after removeAllListeners() has been run
  emitter[captureRejectionSymbol] = (error: Error, event: string | symbol) => {
    console.error(`Collector ${options.key} failed during ${String(event)}:`, error)
  }

  const resetTimeout = () => {
    if (!duration) return

    if (timeout) clearTimeout(timeout)

    timeout = setTimeout(() => emitter.end('expired'), duration)
  }

  collectors.add(emitter)
  resetTimeout()

  emitter.collect = (item: Type) => {
    if (stopped) return

    if (max && collectedCount >= max) {
      emitter.end('max reached')
      return
    }

    const pass = filter ? filter(item) : true

    if (!pass) return

    collectedCount++

    emitter.emit('collect', item)

    resetTimeout()
  }

  emitter.end = (reason?: string) => {
    if (stopped) return

    stopped = true

    if (timeout) clearTimeout(timeout)
    timeout = undefined

    try {
      emitter.emit('end', reason ?? '')
    } finally {
      collectors.delete(emitter)
      emitter.removeAllListeners()
    }
  }

  return emitter
}
