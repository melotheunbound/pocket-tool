import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIMediaGalleryItem,
  type APIMessageTopLevelComponent,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji, highlight, hyperlink, timestamp } from '../../../utils/markdown'
import { getTimestampFromSnowflake } from '../../../utils/utils'
import { HighlightStyle, TimestampStyle } from '../../../types/types'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.User,
  name: {
    global: 'View User Profile',
    'pt-BR': 'Ver Perfil do Usuário',
    'es-ES': 'Ver Perfil del Usuario',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, client) {
    const l = interaction.locale

    const userId = interaction.data.target_id
    const user = interaction.data.resolved.users[userId]
    const member = interaction.data.resolved.members?.[userId]

    if (!user) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.user.no_user')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const u = await client.api.users.get(user.id)
    const m = member && interaction.guild_id ? await client.api.guilds.getMember(interaction.guild_id, user.id) : null

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        ...(m?.banner || u.banner
          ? ([
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.MediaGallery,
                    items: [
                      m && m.banner
                        ? {
                            media: {
                              url: cdn(
                                `/guilds/${interaction.guild_id}/users/${user.id}/banners/${m.banner}`,
                                4096,
                                'webp',
                                true,
                              ),
                            },
                          }
                        : {
                            media: {
                              url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'webp', true),
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
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `## ${emoji('Ping')} ${member?.nick ?? user.global_name}\n-# @${user.username} ${highlight(user.id)}`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: member?.avatar
                    ? cdn(
                        `guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                        4096,
                        'webp',
                        true,
                      )
                    : user.avatar
                      ? cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true)
                      : cdn(`/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}`, 4096, 'png'),
                },
              },
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${t(l, 'commands.user.created')} **${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.RelativeTime)})**${
                member
                  ? `\n${t(l, 'commands.user.joined')} **${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.RelativeTime)})**${member.premium_since ? `\n${t(l, 'commands.user.boosting')} **${timestamp(Temporal.Instant.from(member.premium_since!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(member.premium_since!).epochMilliseconds, TimestampStyle.RelativeTime)})**` : ''}${
                      member.roles.length > 0
                        ? `\n${t(l, 'commands.user.roles')} **${member.roles
                            .slice(0, 5)
                            .map(id => `<@&${id}>`)
                            .join(', ')}**`
                        : ''
                    }${member.roles.length > 5 ? ` ${highlight(`+${(member.roles.length - 5).toLocaleString('en-US')}`, HighlightStyle.Bold)}` : ``}`
                  : ''
              }`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `-# ${emoji('Exclamation')} ${t(l, 'commands.user.footer.text', { profile: hyperlink(`discord://-/users/${user.id}`, t(l, 'commands.user.footer.profile')) })}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
