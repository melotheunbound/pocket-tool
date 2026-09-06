import { WorkerBootstrapper } from '@discordjs/ws'
import { BroadcastChannel, parentPort } from 'worker_threads'
import { SHARD_MEMORY_CHANNEL } from '../utils/shard'

const worker = new WorkerBootstrapper()

// workaround to have extra utilities on the worker
worker.hasShard = function (shardId: number): boolean {
  return this.shards.has(shardId)
}

const channel = new BroadcastChannel(SHARD_MEMORY_CHANNEL)
channel.unref()
channel.onmessage = ({ data }) => {
  if (data?.type !== 'get-shard-memory' || typeof data.requestId !== 'string' || !worker.hasShard(data.shardId)) return

  parentPort!.postMessage({
    type: 'shard-memory',
    shardId: data.shardId,
    requestId: data.requestId,
    memory: process.memoryUsage(),
  })
}

// default forwarding preserves all gateway events, including dispatch and heartbeats
await worker.bootstrap()
