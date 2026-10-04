import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIMessageTopLevelComponent,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, highlight, timestamp } from '../../../utils/markdown'
import { formatRolePermissions, getTimestampFromSnowflake } from '../../../utils/utils'
import { HighlightStyle, TimestampStyle } from '../../../types/types'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'role',
    'pt-BR': 'cargo',
    'es-ES': 'rol',
  },
  description: {
    global: 'View information about a role',
    'pt-BR': 'Veja informações sobre um cargo',
    'es-ES': 'Ver información sobre un rol',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.Role,
      name: {
        global: 'mention',
        'pt-BR': 'menção',
        'es-ES': 'mención',
      },
      description: {
        global: 'The mention or ID of the role',
        'pt-BR': 'A menção ou ID do cargo',
        'es-ES': 'La mención o ID del rol',
      },
      required: true,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    const { mention: role } = options

    const permissions = formatRolePermissions(role.permissions)

    const shownPermissions = permissions.slice(0, 5)
    const extraPermissions = permissions.length - shownPermissions.length

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
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
                        content: `${t(l, 'commands.role.role_info')}\n${t(l, 'commands.role.id')} ${highlight(role.id, HighlightStyle.Bold)}\n${t(l, 'commands.role.mention')} **<@&${role.id}>**\n${t(l, 'commands.role.name')} **${role.name}**\n${t(l, 'commands.role.created')} **${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.RelativeTime)})**\n${t(l, 'commands.role.hoisted')} ${role.hoist ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}\n${t(l, 'commands.role.mentionable')} ${role.mentionable ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}\n${t(l, 'commands.role.managed')} ${role.managed ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}\n${t(l, 'commands.role.position')} **${role.position}**\n${t(l, 'commands.role.colors')} **#${role.colors.primary_color.toString(16).padStart(6, '0')}${role.colors.secondary_color ? `, #${role.colors.secondary_color.toString(16).padStart(6, '0')}` : ''}${role.colors.tertiary_color ? `, #${role.colors.tertiary_color.toString(16).padStart(6, '0')}` : ''}**\n${t(l, 'commands.role.permissions')} **${shownPermissions.join(', ') || 'None'}**${extraPermissions > 0 ? ` \`+${extraPermissions}\`` : ''}`,
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
                    content: `${t(l, 'commands.role.role_info')}\n${t(l, 'commands.role.id')} ${highlight(role.id, HighlightStyle.Bold)}\n${t(l, 'commands.role.mention')} **<@&${role.id}>**\n${t(l, 'commands.role.name')} **${role.name}**\n${t(l, 'commands.role.created')} **${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.RelativeTime)})**\n${t(l, 'commands.role.hoisted')} ${role.hoist ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}\n${t(l, 'commands.role.mentionable')} ${role.mentionable ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}\n${t(l, 'commands.role.managed')} ${role.managed ? t(l, 'commands.role.yes') : t(l, 'commands.role.no')}\n${t(l, 'commands.role.position')} **${role.position}**\n${t(l, 'commands.role.colors')} **#${role.colors.primary_color.toString(16).padStart(6, '0')}${role.colors.secondary_color ? `, #${role.colors.secondary_color.toString(16).padStart(6, '0')}` : ''}${role.colors.tertiary_color ? `, #${role.colors.tertiary_color.toString(16).padStart(6, '0')}` : ''}**\n${t(l, 'commands.role.permissions')} **${shownPermissions.join(', ') || 'None'}**${extraPermissions > 0 ? ` \`+${extraPermissions}\`` : ''}`,
                  },
                ] satisfies APIMessageTopLevelComponent[])),
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
