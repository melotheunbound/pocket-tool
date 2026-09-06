import type { API } from '@discordjs/core'
import type { WebSocketManager } from '@discordjs/ws'

export async function checkForReshard(gateway: WebSocketManager, recommended: number, current: number): Promise<void> {
  if (recommended !== current) {
    console.log(`resharding ${current} -> ${recommended}`)

    await gateway.updateShardCount(null)
  }
}

export function scheduleReshardCheck(gateway: WebSocketManager, api: API): void {
  const check = async () => {
    console.log('running reshard check...')

    const recommended = (await api.gateway.getBot()).shards
    const current = await gateway.getShardCount()

    await checkForReshard(gateway, recommended, current)
  }

  let running = false

  const runCheck = async () => {
    if (running) return
    running = true
    try {
      await check()
    } catch (error) {
      console.error('reshard check failed:', error)
    } finally {
      running = false
    }
  }

  void runCheck()

  setInterval(() => void runCheck(), 12 * 60 * 60 * 1000)
}
