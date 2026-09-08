import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { parse } from 'chrono-node'
import { emoji, timestamp } from '../../../utils/markdown'
import type { TimestampStyle } from '../../../types/types'
import { getAutocompleteFocusedOption } from '../../../utils/utils'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'timestamp',
    'pt-BR': 'timestamp',
    "es-ES": 'timestamp',
    "es-419": 'timestamp',
  },
  description: {
    global: 'Generates a Discord-style timestamp for the given time',
    'pt-BR': 'Gera um timestamp do Discord para o tempo dado',
    "es-ES": 'Genera un timestamp de estilo Discord para el tiempo dado',
    "es-419": 'Genera un timestamp de estilo Discord para el tiempo dado',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'time',
        'pt-BR': 'tempo',
        "es-ES": 'tiempo',
        "es-419": 'tiempo',
      },
      description: {
        global: 'The time to convert to a timestamp',
        'pt-BR': 'O tempo a ser convertido em timestamp',
        "es-ES": 'El tiempo a ser convertido en timestamp',
        "es-419": 'El tiempo a ser convertido en timestamp',
      },
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'timezone',
        'pt-BR': 'fuso-horário',
        "es-ES": 'zona-horaria',
        "es-419": 'zona-horaria',
      },
      description: {
        global: 'The timezone to use for the timestamp',
        'pt-BR': 'O fuso horário a ser usado para o timestamp',
        "es-ES": 'La zona horaria a usar para el timestamp',
        "es-419": 'La zona horaria a usar para el timestamp',
      },
      required: false,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'style',
        'pt-BR': 'estilo',
        "es-ES": 'estilo',
        "es-419": 'estilo',
      },
      description: {
        global: 'The timestamp style to use',
        'pt-BR': 'O estilo do timestamp a ser usado',
        "es-ES": 'El estilo del timestamp a usar',
        "es-419": 'El estilo del timestamp a usar',
      },
      required: false,
      choices: [
        {
          name: {
            global: 'Short Time',
            'pt-BR': 'Tempo curto',
            "es-ES": 'Tiempo corto',
            "es-419": 'Tiempo corto',
          },
          value: 't',
        },
        {
          name: {
            global: 'Medium Time',
            'pt-BR': 'Tempo médio',
            "es-ES": 'Tiempo medio',
            "es-419": 'Tiempo medio',
          },
          value: 'T',
        },
        {
          name: {
            global: 'Short Date',
            'pt-BR': 'Data curta',
            "es-ES": 'Fecha corta',
            "es-419": 'Fecha corta',
          },
          value: 'd',
        },
        {
          name: {
            global: 'Long Date',
            'pt-BR': 'Data longa',
            "es-ES": 'Fecha larga',
            "es-419": 'Fecha larga',
          },
          value: 'D',
        },
        {
          name: {
            global: 'Long Date and Short Time',
            'pt-BR': 'Data longa e tempo curto',
            "es-ES": 'Fecha larga y tiempo corto',
            "es-419": 'Fecha larga y tiempo corto',
          },
          value: 'f',
        },
        {
          name: {
            global: 'Full Date and Short Time',
            'pt-BR': 'Data completa e tempo curto',
            "es-ES": 'Fecha completa y tiempo corto',
            "es-419": 'Fecha completa y tiempo corto',
          },
          value: 'F',
        },
        {
          name: {
            global: 'Short Date and Short Time',
            'pt-BR': 'Data curta e tempo curto',
            "es-ES": 'Fecha corta y tiempo corto',
            "es-419": 'Fecha corta y tiempo corto',
          },
          value: 's',
        },
        {
          name: {
            global: 'Short Date and Medium Time',
            'pt-BR': 'Data curta e tempo médio',
            "es-ES": 'Fecha corta y tiempo medio',
            "es-419": 'Fecha corta y tiempo medio',
          },
          value: 'S',
        },
        {
          name: {
            global: 'Relative Time',
            'pt-BR': 'Tempo relativo',
            "es-ES": 'Tiempo relativo',
            "es-419": 'Tiempo relativo',
          },
          value: 'R',
        },
      ],
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
    const l = interaction.locale

    const { time, timezone, style } = options

    const date = parseDate(time, timezone ?? 'UTC')

    if (!date) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.timestamp.invalid_time')}`,
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
          type: ComponentType.TextDisplay,
          content: timestamp(date, (style ?? 'f') as TimestampStyle),
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})

function parseDate(time: string, timezone: string): number {
  const reference = Temporal.Now.instant()

  const parsed = parse(time, {
    instant: new Date(reference.epochMilliseconds),
    timezone,
  })[0]

  if (!parsed) throw new Error('Invalid date provided')

  return parsed.date().getTime()
}
