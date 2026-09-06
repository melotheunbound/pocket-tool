import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { getAutocompleteFocusedOption } from '../../../utils/utils'
import { emoji } from '../../../utils/markdown'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'timezone',
  description: 'View the current time for a specific timezone',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'zone',
      description: 'The timezone to view the current time in',
      required: true,
      autocomplete: true,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async autocomplete(interaction, client) {
    const focused = getAutocompleteFocusedOption(interaction.data.options)
    const value = String(focused?.value ?? '').toLowerCase()

    const now = Temporal.Now.instant()

    const choices = Intl.supportedValuesOf('timeZone')
      .map(zone => ({
        name: `${zone} (${new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          timeZoneName: 'short',
        })
          .format(now)
          .split(', ')
          .pop()})`,
        value: zone,
      }))
      .filter(choice => choice.name.toLowerCase().includes(value))
      .slice(0, 25)

    await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices })
  },
  async run(interaction, options, client) {
    const { zone } = options

    const time = Temporal.Now.zonedDateTimeISO(zone)

    const formatted = `${time.toLocaleString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })} at ${time.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })}`

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('Clock')} **${zone}:** ${formatted}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
