import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
  type APIMessageTopLevelComponent,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji, highlight, timestamp } from '../../../utils/markdown'
import { getTimestampFromSnowflake } from '../../../utils/utils'
import { TimestampStyle } from '../../../types/types'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'role',
  description: 'View information about a role',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.Role,
      name: 'role',
      description: 'The role to view',
      required: true,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const { role } = options

    const permissions = formatPermissions(role.permissions)

    const shownPermissions = permissions.slice(0, 5)
    const extraPermissions = permissions.length - shownPermissions.length

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            ...(role.icon
              ? ([
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('Role')} **${role.name}** ${highlight(role.id)}`,
                      },
                    ],
                    accessory: {
                      type: ComponentType.Thumbnail,
                      media: {
                        url: cdn(`/role-icons/${role.id}/${role.icon}`, 4096, 'webp'),
                      },
                    },
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : ([
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Role')} **${role.name}** ${highlight(role.id)}`,
                  },
                ] satisfies APIMessageTopLevelComponent[])),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('Calendar')} **Created At:**\n${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.RelativeTime)})\n\n> Hoisted: **${role.hoist ? 'Yes' : 'No'}**\n> Mentionable: **${role.mentionable ? 'Yes' : 'No'}**\n> Managed: **${role.managed ? 'Yes' : 'No'}**\n> Position: **${role.position}**\n> Colors: **#${role.colors.primary_color.toString(16).padStart(6, '0')}${role.colors.secondary_color ? `, #${role.colors.secondary_color.toString(16).padStart(6, '0')}` : ''}${role.colors.tertiary_color ? `, #${role.colors.tertiary_color.toString(16).padStart(6, '0')}` : ''}**\n> Permissions: **${shownPermissions.join(', ') || 'None'}**${extraPermissions > 0 ? ` \`+${extraPermissions}\`` : ''}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})

function formatPermissions(bitfield: string): string[] {
  const bits = BigInt(bitfield)

  return Object.entries(PermissionFlagsBits)
    .filter(([_, value]) => (bits & BigInt(value)) === BigInt(value))
    .map(([name]) => name)
}
