import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { findClosestMatch, getAutocompleteFocusedOption } from '../../../utils/utils'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType } from '../../../types/types'
import { emoji } from '../../../utils/markdown'
import { AZURE_LANGUAGES } from '../../constants'
import env from '../../../utils/env'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'translate',
  description: 'Translates the given text into almost any language',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'text',
      description: 'The text to translate',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'from',
      description: 'The language to translate from',
      required: false,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'to',
      description: 'The language to translate to',
      required: false,
      autocomplete: true,
    },
  ],
  cooldown: 5,
  acknowledge: true,
  async autocomplete(interaction, client) {
    const focused = getAutocompleteFocusedOption(interaction.data.options)
    const value = String(focused?.value ?? '').toLowerCase()

    const languages = AZURE_LANGUAGES.filter(language => {
      return language.name.toLowerCase().includes(value) || language.code.toLowerCase().includes(value)
    })

    switch (focused?.name) {
      case 'from': {
        const choices = [
          {
            name: 'Detect Automatically',
            value: 'auto',
          },
          ...languages.map(language => ({
            name: language.name,
            value: language.code,
          })),
        ].slice(0, 25)

        await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices })

        break
      }
      case 'to': {
        const choices = [
          {
            name: 'Use My Locale',
            value: 'auto',
          },
          ...languages.map(language => ({
            name: language.name,
            value: language.code,
          })),
        ].slice(0, 25)

        await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices })

        break
      }
    }
  },
  async run(interaction, options, client) {
    const { text: rawText, from, to } = options

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

    const text = rawText.trim()

    if (!text) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please provide some text to translate.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const sourceCode = from === 'auto' ? undefined : from
    const targetCode =
      to === 'auto'
        ? (findClosestMatch(
            interaction.locale,
            AZURE_LANGUAGES.map(l => l.code),
          ) ?? 'en')
        : (to ?? 'en')

    const translation = await makeRequest('https://api.cognitive.microsofttranslator.com/translate', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        'Content-type': 'application/json',
        'Ocp-Apim-Subscription-Key': azureApiKey,
      },
      params: {
        'api-version': '3.0',
        ...(sourceCode ? { from: sourceCode } : {}),
        to: targetCode,
      },
      body: [
        {
          text,
        },
      ],
    })

    const actualSourceCode = sourceCode ?? translation[0].detectedLanguage?.language

    const sourceLanguage = AZURE_LANGUAGES.find(language => language.code === actualSourceCode)

    if (!sourceLanguage) throw new Error(`Unsupported source language: ${actualSourceCode}`)

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
              content: `${translation[0].translations[0].text}${
                to === undefined || to === 'auto'
                  ? `\n\n-# ${emoji('Exclamation')} The target language was selected based on the user's locale`
                  : ''
              }`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
