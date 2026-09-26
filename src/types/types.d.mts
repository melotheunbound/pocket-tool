import type { Collection } from '@discordjs/collection'
import type { Collector, CollectorOptions, GatewayShard } from './types'
import type {
  APIMessage,
  CreateInteractionResponseOptions,
  EditInteractionResponseOptions,
  RESTPostAPIInteractionCallbackWithResponseResult,
  Snowflake,
} from '@discordjs/core'
import type { RequestData } from '@discordjs/rest'

declare module '@discordjs/core' {
  interface Gateway {
    shards: Collection<number, GatewayShard>
    getShardWorkerMemory(shardId: number): Promise<NodeJS.MemoryUsage>
  }

  interface InteractionsAPI {
    createCollector<Type>(options: CollectorOptions<Type>): Collector<Type>
    respond(
      applicationId: Snowflake,
      interactionId: Snowflake,
      interactionToken: string,
      body:
        | (CreateInteractionResponseOptions & {
            with_response: true
          })
        | EditInteractionResponseOptions
        | CreateInteractionFollowUpResponseOptions,
      messageId?: Snowflake | '@original',
      { signal }?: Pick<RequestData, 'signal'>,
    ): Promise<APIMessage>
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
