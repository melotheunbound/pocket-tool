import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji, highlight, hyperlink, timestamp } from '../../../utils/markdown'
import { getTimestampFromSnowflake } from '../../../utils/utils'
import { TimestampStyle } from '../../../types/types'

createApplicationCommand({
  type: ApplicationCommandType.User,
  name: 'View User Profile',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, client) {
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
                content: `${emoji('Exclamation')} Please select a valid user to view information for.`,
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
                  content: `${emoji('Ping')} **${member?.nick ?? user.global_name} (@${user.username})** ${highlight(user.id)}`,
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
              content: `${emoji('Calendar')} **Created:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.RelativeTime)})${
                member
                  ? `\n\n${emoji('Newbie')} **Joined:**\n${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.LongDate)} (${timestamp(Temporal.Instant.from(member.joined_at!).epochMilliseconds, TimestampStyle.RelativeTime)})${
                      member.roles.length > 0
                        ? `\n\n${emoji('Role')} **Roles:**\n${member.roles
                            .slice(0, 5)
                            .map(id => `<@&${id}>`)
                            .join(', ')}`
                        : ''
                    }${member.roles.length > 5 ? ` ${highlight(`+${(member.roles.length - 5).toLocaleString('en-US')}`)}` : ``}`
                  : ''
              }\n\n-# ${emoji('Exclamation')} Due to Discord limitations, this profile can't be fully displayed. ${hyperlink(`discord://-/users/${user.id}`, 'Open it in Discord.')}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
