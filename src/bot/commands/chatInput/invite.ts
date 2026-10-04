import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIComponentInContainer,
  type APIMediaGalleryItem,
  type APIMessageTopLevelComponent,
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
    'es-ES': 'invitacion',
  },
  description: {
    global: 'View information about an invite',
    'pt-BR': 'Veja informações sobre um convite',
    'es-ES': 'Ver información sobre una invitacion',
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
        'es-ES': 'El link de la invitacion para visualizar',
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
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
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
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
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

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
      components: [
        ...(invite.guild.banner
          ? ([
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.MediaGallery,
                    items: [
                      {
                        media: {
                          url: cdn(`/banners/${invite.guild.id}/${invite.guild.banner}`, 4096, 'webp', true),
                        },
                      },
                    ] satisfies APIMediaGalleryItem[],
                  },
                ],
              },
            ] satisfies APIMessageTopLevelComponent[])
          : []),
        {
          type: ComponentType.Container,
          components: [
            ...(invite.guild.icon
              ? ([
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${t(l, 'commands.invite.invite_info')}\n${t(l, 'commands.invite.code')} ${highlight(invite.code, HighlightStyle.Bold)}\n${t(l, 'commands.invite.expires')} **${timestamp(Temporal.Instant.from(invite.expires_at!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(invite.expires_at!).epochMilliseconds, TimestampStyle.RelativeTime)})**\n${t(l, 'commands.invite.inviter')} **@${invite.inviter?.username}**\n${t(l, 'commands.invite.guild_info')}\n${t(l, 'commands.invite.id')} ${highlight(invite.guild.id, HighlightStyle.Bold)}\n${t(l, 'commands.invite.name')} **${invite.guild.name}**\n${t(l, 'commands.invite.description')} **${invite.guild.description}**\n${t(l, 'commands.invite.members')} **${invite.approximate_member_count?.toLocaleString('en-US')}**\n${t(l, 'commands.invite.boosts')} **${invite.guild.premium_subscription_count?.toLocaleString('en-US')}**`,
                      },
                    ],
                    accessory: {
                      type: ComponentType.Thumbnail,
                      media: {
                        url: cdn(`/icons/${invite.guild.id}/${invite.guild.icon}`, 4096, 'webp', true),
                      },
                    },
                  },
                ] satisfies APIComponentInContainer[])
              : ([
                  {
                    type: ComponentType.TextDisplay,
                    content: `${t(l, 'commands.invite.invite_info')}\n${t(l, 'commands.invite.code')} ${highlight(invite.code, HighlightStyle.Bold)}\n${t(l, 'commands.invite.created')} **${timestamp(getTimestampFromSnowflake(invite.code), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(invite.code), TimestampStyle.RelativeTime)})**\n${t(l, 'commands.invite.expires')} **${timestamp(Temporal.Instant.from(invite.expires_at!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(invite.expires_at!).epochMilliseconds, TimestampStyle.RelativeTime)})**\n${t(l, 'commands.invite.inviter')} **@${invite.inviter?.username}**\n${t(l, 'commands.invite.guild_info')}\n${t(l, 'commands.invite.id')} ${highlight(invite.guild.id, HighlightStyle.Bold)}\n${t(l, 'commands.invite.name')} **${invite.guild.name}**\n${t(l, 'commands.invite.description')} **${invite.guild.description}**\n${t(l, 'commands.invite.members')} **${invite.approximate_member_count?.toLocaleString('en-US')}**\n${t(l, 'commands.invite.boosts')} **${invite.guild.premium_subscription_count?.toLocaleString('en-US')}**`,
                  },
                ] satisfies APIComponentInContainer[])),
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
