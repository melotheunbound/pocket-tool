import { WorkerBootstrapper } from '@discordjs/ws';
import { BroadcastChannel, parentPort } from 'node:worker_threads';
import { SHARD_MEMORY_CHANNEL } from '../utils/shardMemory';

class PocketWorkerBootstrapper extends WorkerBootstrapper {
  hasShard(shardId: number): boolean {
    return this.shards.has(shardId);
  }
}

const bootstrapper = new PocketWorkerBootstrapper();
const channel = new BroadcastChannel(SHARD_MEMORY_CHANNEL);
channel.unref();
channel.onmessage = ({ data }) => {
  if (data?.type !== 'get-shard-memory' || typeof data.requestId !== 'string' || !bootstrapper.hasShard(data.shardId))
    return;

  parentPort!.postMessage({
    type: 'shard-memory',
    shardId: data.shardId,
    requestId: data.requestId,
    memory: process.memoryUsage(),
  });
};

// Default forwarding preserves all gateway events, including dispatch and heartbeats.
await bootstrapper.bootstrap();
