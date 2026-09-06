import type { Collection } from '@discordjs/collection'
import type { Collector, CollectorOptions, GatewayShard } from './types'

declare module '@discordjs/core' {
  interface Gateway {
    shards: Collection<number, GatewayShard>
    getShardWorkerMemory(shardId: number): Promise<NodeJS.MemoryUsage>
  }

  interface InteractionsAPI {
    createCollector<Type>(options: CollectorOptions<Type>): Collector<Type>
  }
}

declare module '@discordjs/ws' {
  interface WorkerBootstrapper {
    hasShard(shardId: number): boolean
  }
}

declare module '@discordjs/rest' {
  interface REST {
    ping(): Promise<number>
  }
}
