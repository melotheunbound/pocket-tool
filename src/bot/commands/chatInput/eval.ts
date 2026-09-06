import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import util from 'util'
import { codeblock, ellipsis } from '../../../utils/markdown'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'eval',
  description: 'Evaluate the provided code',
  integrationTypes: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'code',
      description: 'The code to evaluate',
      required: true,
    },
  ],
  guilds: ['1533439024637939792'],
  dev: true,
  acknowledge: true,
  async run(interaction, options, client) {
    const { code } = options

    let result

    try {
      result = eval(code)
    } catch (error) {
      result = error
    }

    let value = result

    if (result && typeof result.then === 'function') {
      try {
        value = await result
      } catch (error) {
        value = error
      }
    }

    const formatted = typeof value === 'string' ? value : util.inspect(value)

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: codeblock('ts', ellipsis(formatted, 3985)),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
