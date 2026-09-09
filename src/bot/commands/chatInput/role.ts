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
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'role',
    'pt-BR': 'cargo',
    "es-ES": 'cargo',
    "es-419": 'cargo',
  },
  description: {
    global: 'View information about a role',
    'pt-BR': 'Veja informações sobre um cargo',
    "es-ES": 'Ver información sobre un cargo',
    "es-419": 'Ver información sobre un cargo',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.Role,
      name: {
        global: 'role',
        'pt-BR': 'cargo',
        "es-ES": 'cargo',
        "es-419": 'cargo',
      },
      description: {
        global: 'The role to view',
        'pt-BR': 'O cargo a ser visualizado',
        "es-ES": 'El cargo a ser visualizado',
        "es-419": 'El cargo a ser visualizado',
      },
      required: true,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

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
              content: `${emoji('Calendar')} **${t(l, 'commands.role.created_at')}**\n${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.RelativeTime)})\n\n> ${t(l, 'commands.role.hoisted')} **${role.hoist ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}**\n> ${t(l, 'commands.role.mentionable')} **${role.mentionable ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}**\n> ${t(l, 'commands.role.managed')} **${role.managed ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}**\n> ${t(l, 'commands.role.position')} **${role.position}**\n> ${t(l, 'commands.role.colors')} **#${role.colors.primary_color.toString(16).padStart(6, '0')}${role.colors.secondary_color ? `, #${role.colors.secondary_color.toString(16).padStart(6, '0')}` : ''}${role.colors.tertiary_color ? `, #${role.colors.tertiary_color.toString(16).padStart(6, '0')}` : ''}**\n> ${t(l, 'commands.role.permissions')}: **${shownPermissions.join(', ') || 'None'}**${extraPermissions > 0 ? ` \`+${extraPermissions}\`` : ''}`,
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
