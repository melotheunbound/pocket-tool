import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { getShardIdForGuildId } from '../../../utils/utils'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'ping',
  description: 'Pong!',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, client) {
    // gateway
    const shardId = interaction.guild_id ? getShardIdForGuildId(interaction.guild_id, client.gateway.shards.size) : 0
    const wsPing = client.gateway.shards.get(shardId)?.ping

    // rest
    const restPing = await client.rest.ping()

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `Pong!\n-# Gateway (shard #${shardId}): **${wsPing}ms** • REST: **${restPing}ms**`,
    })
  },
})
