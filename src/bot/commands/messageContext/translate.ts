import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { emoji } from '../../../utils/markdown'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType } from '../../../types/types'
import { AZURE_LANGUAGES } from '../../constants'
import env from '../../../utils/env'
import { findClosestMatch } from '../../../utils/utils'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Translate This Message',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, client) {
    const azureApiKey = env.get('azure_api_key')?.toString()

    if (!azureApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} The Microsoft Azure API key is not set.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const message = interaction.data.resolved.messages[interaction.data.target_id]

    if (message?.message_snapshots && message.message_snapshots.length > 0) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Forwarded messages are currently unsupported.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    if (!message || !message.content.trim()) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please select a text message to translate.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const text = message.content.trim()

    const targetCode =
      findClosestMatch(
        interaction.locale,
        AZURE_LANGUAGES.map(language => language.code),
      ) ?? 'en'

    const translation = await makeRequest('https://api.cognitive.microsofttranslator.com/translate', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        'Content-type': 'application/json',
        'Ocp-Apim-Subscription-Key': azureApiKey,
      },
      params: {
        'api-version': '3.0',
        to: targetCode,
      },
      body: [
        {
          text,
        },
      ],
    })

    const sourceCode = translation[0].detectedLanguage?.language

    const sourceLanguage = AZURE_LANGUAGES.find(language => language.code === sourceCode)

    if (!sourceLanguage) throw new Error(`Unsupported source language: ${sourceCode}`)

    const targetLanguage = AZURE_LANGUAGES.find(language => language.code === translation[0].translations[0].to)

    if (!targetLanguage) throw new Error(`Unsupported target language: ${translation[0].translations[0].to}`)

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> ${emoji('Translate')} Translated from **${sourceLanguage.flag ? `${sourceLanguage.flag} ` : ''}${sourceLanguage.name}** to **${targetLanguage.flag ? `${targetLanguage.flag} ` : ''}${targetLanguage.name}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${translation[0].translations[0].text}\n\n-# ${emoji('Exclamation')} The target language was selected based on the user's locale`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
