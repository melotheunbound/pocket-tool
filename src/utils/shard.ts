import { Collection } from '@discordjs/collection'
import { randomUUID } from 'node:crypto'
import { BroadcastChannel, isMainThread } from 'node:worker_threads'

export const SHARD_MEMORY_CHANNEL = 'pocket-tool:shard-memory'
const REQUEST_TIMEOUT_MS = 5 * 1000

const pending = new Collection<
  string,
  {
    shardId: number
    resolve: (memory: NodeJS.MemoryUsage) => void
    timeout: ReturnType<typeof setTimeout>
  }
>()

let channel: BroadcastChannel | undefined

export async function getShardMemory(shardId: number): Promise<NodeJS.MemoryUsage> {
  if (!isMainThread) throw new Error('Shard memory requests must originate on the main thread')
  if (!Number.isSafeInteger(shardId) || shardId < 0) throw new RangeError('Invalid shard ID')

  channel ??= new BroadcastChannel(SHARD_MEMORY_CHANNEL)
  channel.unref()

  const requestId = randomUUID()

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId)
      reject(new Error(`Timed out requesting memory for shard #${shardId}`))
    }, REQUEST_TIMEOUT_MS)

    pending.set(requestId, { shardId, resolve, timeout })

    try {
      channel!.postMessage({ type: 'get-shard-memory', shardId, requestId })
    } catch (error) {
      clearTimeout(timeout)
      pending.delete(requestId)
      reject(error)
    }
  })
}

export function handleShardMemoryResponse(payload: unknown): void {
  if (!payload || typeof payload !== 'object') return

  const response = payload as Record<string, unknown>

  if (response.type !== 'shard-memory' || typeof response.requestId !== 'string') return

  const request = pending.get(response.requestId)

  if (!request || request.shardId !== response.shardId) return

  const memory = response.memory as NodeJS.MemoryUsage | undefined

  if (
    !memory ||
    !['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers'].every(
      key =>
        typeof memory[key as keyof NodeJS.MemoryUsage] === 'number' &&
        Number.isFinite(memory[key as keyof NodeJS.MemoryUsage]) &&
        memory[key as keyof NodeJS.MemoryUsage] >= 0,
    )
  )
    return

  clearTimeout(request.timeout)
  pending.delete(response.requestId)
  request.resolve(memory)
}
