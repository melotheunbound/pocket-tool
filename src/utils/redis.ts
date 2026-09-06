import { createClient } from 'redis'
import env from './env'

export const redis = createClient({
  username: env.get('redis_username', true).toString(),
  password: env.get('redis_password', true).toString(),
  socket: {
    host: env.get('redis_host', true).toString(),
    port: env.get('redis_port', true).toNumber(),
  },
})

redis.on('error', e => console.log('redis client errored:', e))

await redis.connect()
