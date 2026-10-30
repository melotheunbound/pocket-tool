import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { emoji, timestamp } from '../../../utils/markdown'
import { t } from '../../../utils/localization'
import { resolveSnowflake } from '../../../utils/utils'
import { TimestampStyle } from '../../../types/types'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: {
    global: 'Snowflake',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  defer: true,
  async run(interaction, client) {
    const l = interaction.locale

    const message = interaction.data.resolved.messages[interaction.data.target_id]

    const text = (
      message?.content?.trim() ? message.content : (message?.message_snapshots?.[0]?.message?.content ?? '')
    ).trim()

    if (!text) {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.snowflake.missing_text')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const isSnowflake = /^\d{17,20}$/.test(text)

    if (!isSnowflake) {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.snowflake.invalid')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const snowflake = BigInt(text)

    const mentions = {
      user: `<@${text}>`,
      role: `<@&${text}>`,
      channel: `<#${text}>`,
      scheduledEvent: `<#${text}>`,
      emoji: `<:emoji:${text}>`,
      animatedEmoji: `<a:emoji:${text}>`,
      message: `https://discord.com/channels/${interaction.guild_id ?? '@me'}/${interaction.channel.id}/${text}`,
    }

    const resolvers: (() => Promise<string | null>)[] = [
      async () => {
        await client.api.users.get(text)
        return mentions.user
      },
      async () => {
        await client.api.channels.get(text)
        return mentions.channel
      },
      async () => {
        await client.api.channels.getMessage(interaction.channel.id, text)
        return mentions.message
      },
    ]

    if (interaction.guild_id) {
      const guildId = interaction.guild_id

      resolvers.push(
        async () => {
          const roles = await client.api.guilds.getRoles(guildId)
          return roles.some(role => role.id === text) ? mentions.role : null
        },
        async () => {
          const events = await client.api.guilds.getScheduledEvents(guildId)
          return events.some(event => event.id === text) ? mentions.scheduledEvent : null
        },
        async () => {
          const emojis = await client.api.guilds.getEmojis(guildId)
          const found = emojis.find(emoji => emoji.id === text)

          return found ? (found.animated ? mentions.animatedEmoji : mentions.emoji) : null
        },
      )
    }

    const result = await resolveSnowflake(resolvers)

    if (result) {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${result} **(${timestamp(Number((snowflake >> 22n) + 1420070400000n), TimestampStyle.RelativeTime)})**`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })
    } else {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.snowflake.not_found')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })
    }
  },
})
