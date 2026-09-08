import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji, highlight, timestamp } from '../../../utils/markdown'
import { getTimestampFromSnowflake } from '../../../utils/utils'
import { HighlightStyle, TimestampStyle } from '../../../types/types'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'invite',
    'pt-BR': 'convite',
    "es-ES": 'convite',
    "es-419": 'convite',
  },
  description: {
    global: 'View information about an invite',
    'pt-BR': 'Veja informações sobre um convite',
    "es-ES": 'Ver información sobre un convite',
    "es-419": 'Ver información sobre un convite',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'link',
      description: {
        global: 'The invite link to view',
        'pt-BR': 'O link do convite para visualizar',
        "es-ES": 'El link del convite para visualizar',
        "es-419": 'El link del convite para visualizar',
      },
      required: true,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    const { link } = options

    const code = link
      .trim()
      .match(/^(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9-]{2,64})\/?$/i)?.[1]

    if (!code) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.invite.invalid_link')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const invite = await client.api.invites.get(code, { with_counts: true })

    if (!invite || !invite.guild) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.invite.invalid_link')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Home')} **${invite.guild.name}** ${highlight(invite.guild.id)}\n${invite.guild.description ? `*${invite.guild.description}*` : ''}`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: cdn(`/icons/${invite.guild.id}/${invite.guild.icon}`, 4096, 'webp', true),
                },
              },
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('Calendar')} **${t(l, 'invite.created_at')}**\n${timestamp(getTimestampFromSnowflake(invite.guild.id), TimestampStyle.LongDate)}\n\n${emoji('People')} ${highlight(invite.approximate_member_count?.toLocaleString('en-US'), HighlightStyle.Bold)}   ${emoji('Boost')} ${highlight(invite.guild.premium_subscription_count?.toLocaleString('en-US'))}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
