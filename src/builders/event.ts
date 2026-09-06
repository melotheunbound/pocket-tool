import { GatewayDispatchEvents } from '@discordjs/core'
import type { GatewayEvent } from '../types/types.js'
import { Collection } from '@discordjs/collection'

export const events = new Collection<GatewayDispatchEvents, GatewayEvent>()

export default function createGatewayEvent<const Event extends GatewayDispatchEvents = GatewayDispatchEvents>(
  event: GatewayEvent<Event>,
): void {
  events.set(event.event, event as unknown as GatewayEvent)
}
