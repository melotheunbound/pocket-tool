import type { Collector, CollectorEvents, CollectorOptions } from '../types/types'
import { captureRejectionSymbol, EventEmitter } from 'events'
import { getTimestampFromSnowflake } from '../utils/utils'

export const collectors = new Set<Collector<unknown>>()

// interaction webhook tokens expire after 15 minutes, so leave time for the final edit
export const MAX_COLLECTOR_LIFETIME = 14 * 60 * 1000

export function getInteractionCollectorDeadline(interactionId: string): number {
  return getTimestampFromSnowflake(interactionId) + MAX_COLLECTOR_LIFETIME
}

export default function createCollector<Type>(options: CollectorOptions<Type>): Collector<Type> {
  const { duration, max, filter } = options
  const latestHardDeadline = Date.now() + MAX_COLLECTOR_LIFETIME
  const hardDeadline = Number.isFinite(options.hardDeadline)
    ? Math.min(options.hardDeadline!, latestHardDeadline)
    : latestHardDeadline

  let collectedCount = 0
  let stopped = false
  let idleTimeout: NodeJS.Timeout | undefined
  let hardTimeout: NodeJS.Timeout | undefined

  const emitter = new EventEmitter<CollectorEvents<Type>>({ captureRejections: true }) as Collector<Type>

  // handles rejected end listeners after removeAllListeners() has been run
  emitter[captureRejectionSymbol] = (error: Error, event: string | symbol) => {
    console.error(`Collector ${options.key} failed during ${String(event)}:`, error)
  }

  const resetTimeout = () => {
    if (!duration) return

    if (idleTimeout) clearTimeout(idleTimeout)

    idleTimeout = setTimeout(() => emitter.end('expired'), duration)
  }

  collectors.add(emitter)
  resetTimeout()
  hardTimeout = setTimeout(() => emitter.end('hard lifetime reached'), Math.max(0, hardDeadline - Date.now()))

  emitter.collect = async (item: Type) => {
    if (stopped) return

    if (max && collectedCount >= max) {
      emitter.end('max reached')

      return
    }

    const pass = filter ? await filter(item) : true

    if (stopped || !pass) return

    collectedCount++

    emitter.emit('collect', item)

    resetTimeout()
  }

  emitter.end = (reason?: string) => {
    if (stopped) return

    stopped = true

    if (idleTimeout) clearTimeout(idleTimeout)
    if (hardTimeout) clearTimeout(hardTimeout)
    idleTimeout = undefined
    hardTimeout = undefined

    try {
      emitter.emit('end', reason ?? '')
    } finally {
      collectors.delete(emitter)
      emitter.removeAllListeners()
    }
  }

  return emitter
}
