import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIInteractionDataResolvedGuildMember,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji, highlight, hyperlink, timestamp } from '../../../utils/markdown'
import { getTimestampFromSnowflake } from '../../../utils/utils'
import { TimestampStyle } from '../../../types/types'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'user',
    'pt-BR': 'usuário',
  },
  description: {
    global: 'View information about a user or yourself',
    'pt-BR': 'Veja informações sobre um usuário ou você mesmo',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: {
        global: 'target',
        'pt-BR': 'alvo',
      },
      description: {
        global: 'The user to view',
        'pt-BR': 'O usuário a ser visualizado',
      },
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'scope',
        'pt-BR': 'escopo',
      },
      description: {
        global: 'The scope of the information to display',
        'pt-BR': 'O escopo da informação a ser exibida',
      },
      choices: [
        {
          name: {
            global: 'Global',
            'pt-BR': 'Global',
          },
          value: 'global',
        },
        {
          name: {
            global: 'Server',
            'pt-BR': 'Servidor',
          },
          value: 'server',
        },
      ],
      required: false,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    let { target, scope } = options

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      }
    }

    scope ??= 'global'

    const { user, member } = target

    if (scope === 'server' && member) {
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
                    content: `${emoji('Ping')} **${member.nick ?? user.global_name} (@${user.username})** ${highlight(user.id)}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url: member.avatar
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
                content: `${emoji('Calendar')} **${t(l, 'commands.user.created_at')}**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.RelativeTime)})\n\n${emoji('Newbie')} **${t(l, 'commands.user.joined_at')}:**\n${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.RelativeTime)})${
                  member.roles.length > 0
                    ? `\n\n${emoji('Role')} **${t(l, 'commands.user.roles')}**\n${member.roles
                        .slice(0, 5)
                        .map(id => `<@&${id}>`)
                        .join(', ')}`
                    : ''
                }${member.roles.length > 5 ? ` ${highlight(`+${(member.roles.length - 5).toLocaleString('en-US')}`)}` : ``}\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.user.footer.text', { profile: hyperlink(`discord://-/users/${user.id}`, t(l, 'commands.user.footer.profile')) })}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })
    } else {
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
                    content: `${emoji('Ping')} **${user.global_name} (@${user.username})** ${highlight(user.id)}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url: user.avatar
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
                content: `${emoji('Calendar')} **${t(l, 'commands.user.created_at')}**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.RelativeTime)})\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.user.footer.text', { profile: hyperlink(`discord://-/users/${user.id}`, t(l, 'commands.user.footer.profile')) })}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })
    }
  },
})
