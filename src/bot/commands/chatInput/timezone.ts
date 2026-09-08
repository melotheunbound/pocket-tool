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
  name: {
    global: 'timezone',
    'pt-BR': 'fuso-horário',
    "es-ES": 'zona-horaria',
    "es-419": 'zona-horaria',
  },
  description: {
    global: 'View the current time for a specific timezone',
    'pt-BR': 'Veja o horário atual para um fuso horário específico',
    "es-ES": 'Ver la hora actual para una zona horaria específica',
    "es-419": 'Ver la hora actual para una zona horaria específica',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'timezone',
        'pt-BR': 'fuso-horário',
        "es-ES": 'zona-horaria',
        "es-419": 'zona-horaria',
      },
      description: {
        global: 'The timezone to view the current time in',
        'pt-BR': 'O fuso horário para ver o horário atual',
        "es-ES": 'La zona horaria para ver la hora actual',
        "es-419": 'La zona horaria para ver la hora actual',
      },
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
    const { timezone } = options

    const time = Temporal.Now.zonedDateTimeISO(timezone)

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
              content: `${emoji('Clock')} **${timezone}:** ${formatted}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
