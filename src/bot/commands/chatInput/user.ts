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
        global: 'mention',
        'pt-BR': 'menção',
        'es-ES': 'mención',
      },
      description: {
        global: 'The mention or ID of the user',
        'pt-BR': 'A menção ou ID do usuário',
        'es-ES': 'La mención o ID del usuario',
      },
      required: false,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    let { mention } = options

    if (!mention) {
      mention = {
        user: (interaction.user ?? interaction.member?.user)!,
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      }
    }

    const { user, member } = mention

    const u = await client.api.users.get(user.id)
    const m = member && interaction.guild_id ? await client.api.guilds.getMember(interaction.guild_id, user.id) : null

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
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
                  content: `${t(l, 'commands.user.user_info')}\n${t(l, 'commands.user.id')} ${highlight(user.id, HighlightStyle.Bold)}\n${t(l, 'commands.user.mention')} **<@${user.id}>**\n${t(l, 'commands.user.username')} **${user.username}**\n${t(l, 'commands.user.display_name')} **${user.global_name}**\n${t(l, 'commands.user.created')} **${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.RelativeTime)})**${
                    member
                      ? `\n${t(l, 'commands.user.member_info')}${member.nick ? `\n${t(l, 'commands.user.nickname')} **${member.nick}**` : ''}\n${t(l, 'commands.user.joined')} **${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.RelativeTime)})**${member.premium_since ? `\n${t(l, 'commands.user.boosting')} **${timestamp(Temporal.Instant.from(member.premium_since!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(member.premium_since!).epochMilliseconds, TimestampStyle.RelativeTime)})**` : ``}${
                          member.roles.length
                            ? `\n${t(l, 'commands.user.roles')} **${member.roles
                                .slice(0, 5)
                                .map(r => `<@&${r}>`)
                                .join(
                                  ', ',
                                )}**${member.roles.length > 5 ? ` ${highlight(`+${(member.roles.length - 5).toLocaleString('en-US')}`, HighlightStyle.Bold)}` : ``}`
                            : ''
                        }`
                      : ''
                  }\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.user.footer.text', { profile: hyperlink(`discord://-/users/${user.id}`, t(l, 'commands.user.footer.profile')) })}`,
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
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
