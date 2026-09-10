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
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'translate',
    'pt-BR': 'traduzir',
    'es-ES': 'traducir',
  },
  description: {
    global: 'Translates the given text into almost any language',
    'pt-BR': 'Traduz o texto fornecido para quase qualquer idioma',
    'es-ES': 'Traduce el texto proporcionado a casi cualquier idioma',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'text',
        'pt-BR': 'texto',
        'es-ES': 'texto',
      },
      description: {
        global: 'The text to translate',
        'pt-BR': 'O texto a ser traduzido',
        'es-ES': 'El texto a traducir',
      },
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'from',
        'pt-BR': 'de',
        'es-ES': 'de',
      },
      description: {
        global: 'The language to translate from',
        'pt-BR': 'O idioma para traduzir de',
        'es-ES': 'El idioma para traducir de',
      },
      required: false,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'to',
        'pt-BR': 'para',
        'es-ES': 'para',
      },
      description: {
        global: 'The language to translate to',
        'pt-BR': 'O idioma para traduzir para',
        'es-ES': 'El idioma para traducir para',
      },
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
            nameLocalizations: {
              'pt-BR': 'Detectar Automáticamente',
              'es-ES': 'Detectar Automáticamente',
            },
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
            nameLocalizations: {
              'pt-BR': 'Usar Meu Locale',
              'es-ES': 'Usar Meu Locale',
              'es-419': 'Usar Meu Locale',
            },
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
    const l = interaction.locale

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
                content: `${emoji('Wrong')} ${t(l, 'commands.translate.missing_api_key')}`,
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
                content: `${emoji('Exclamation')} ${t(l, 'commands.translate.no_text')}`,
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
            AZURE_LANGUAGES.map(language => language.code),
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
              content: `> ${emoji('Translate')} ${t(l, 'commands.translate.translated', { sourceFlag: sourceLanguage.flag ? sourceLanguage.flag : '', sourceLanguage: sourceLanguage.name, targetFlag: targetLanguage.flag ? targetLanguage.flag : '', targetLanguage: targetLanguage.name })}`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${translation[0].translations[0].text}${
                to === undefined || to === 'auto'
                  ? `\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.translate.auto_detected_target')}`
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
