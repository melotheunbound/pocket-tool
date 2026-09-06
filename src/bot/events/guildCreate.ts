import { GatewayDispatchEvents } from '@discordjs/core'
import createGatewayEvent from '../../builders/event'

createGatewayEvent({
  event: GatewayDispatchEvents.GuildCreate,
  async run(guild, client) {
    if (guild.unavailable) return

    await client.rest.patch(`/guilds/${guild.id}/members/@me`, {
      body: {
        display_name_font_id: 3,
        display_name_effect_id: 2,
        display_name_colors: [6662399, 16777215],
      },
    })
  },
})
