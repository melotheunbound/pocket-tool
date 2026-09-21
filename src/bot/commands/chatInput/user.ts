import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIInteractionDataResolvedGuildMember,
  type APIMediaGalleryItem,
  type APIMessageTopLevelComponent,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji, highlight, hyperlink, timestamp } from '../../../utils/markdown'
import { getTimestampFromSnowflake } from '../../../utils/utils'
import { HighlightStyle, TimestampStyle } from '../../../types/types'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'user',
    'pt-BR': 'usuário',
    'es-ES': 'usuario',
  },
  description: {
    global: 'View information about a user or yourself',
    'pt-BR': 'Veja informações sobre um usuário ou você mesmo',
    'es-ES': 'Vea información sobre un usuario o usted mismo',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: {
        global: 'target',
        'pt-BR': 'alvo',
        'es-ES': 'objetivo',
      },
      description: {
        global: 'The user to view',
        'pt-BR': 'O usuário a ser visualizado',
        'es-ES': 'El usuario a visualizar',
      },
      required: false,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    let { target } = options

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      }
    }

    const { user, member } = target

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
                  content: `## ${emoji('Person')} ${member?.nick ?? user.global_name}\n-# @${user.username} • ${highlight(user.id)}`,
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
              }\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.user.footer.text', { profile: hyperlink(`discord://-/users/${user.id}`, t(l, 'commands.user.footer.profile')) })}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
