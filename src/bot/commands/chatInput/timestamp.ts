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

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'timestamp',
  description: 'Generates a Discord-style timestamp for the given time',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'time',
      description: 'The time to convert to a timestamp',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'timezone',
      description: 'The timezone to use for the timestamp',
      required: false,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'style',
      description: 'The timestamp style to use',
      required: false,
      choices: [
        {
          name: 'Short Time',
          value: 't',
        },
        {
          name: 'Medium Time',
          value: 'T',
        },
        {
          name: 'Short Date',
          value: 'd',
        },
        {
          name: 'Long Date',
          value: 'D',
        },
        {
          name: 'Long Date and Short Time',
          value: 'f',
        },
        {
          name: 'Full Date and Short Time',
          value: 'F',
        },
        {
          name: 'Short Date and Short Time',
          value: 's',
        },
        {
          name: 'Short Date and Medium Time',
          value: 'S',
        },
        {
          name: 'Relative Time',
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
                content: `${emoji('Exclamation')} Please provide a valid time to convert.`,
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
