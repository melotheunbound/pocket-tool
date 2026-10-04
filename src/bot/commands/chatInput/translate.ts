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
import { t } from '../../../utils/localization'
import { GOOGLE_TRANSLATOR_LANGUAGES } from '../../constants'

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

    const languages = GOOGLE_TRANSLATOR_LANGUAGES.filter(language => {
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

    const text = rawText.trim()

    if (!text) {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
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

    const sourceCode =
      from && from !== 'auto'
        ? (findClosestMatch(
            from,
            GOOGLE_TRANSLATOR_LANGUAGES.map(language => language.code),
          ) ?? 'auto')
        : 'auto'

    const targetCode =
      to === 'auto' || !to
        ? (findClosestMatch(
            interaction.locale,
            GOOGLE_TRANSLATOR_LANGUAGES.map(language => language.code),
          ) ?? 'en')
        : to

    const targetLanguage = GOOGLE_TRANSLATOR_LANGUAGES.find(language => language.code === targetCode)

    if (!targetLanguage) throw new Error('Unsupported target language')

    const translation = await makeRequest('https://translate.googleapis.com/translate_a/single', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        client: 'gtx',
        sl: sourceCode,
        tl: targetCode,
        dt: 't',
        q: text,
      },
    })

    const translated = translation[0].map(([translation]: [string]) => translation).join('')

    const sourceLanguage = GOOGLE_TRANSLATOR_LANGUAGES.find(language => language.code === translation[2])

    if (!sourceLanguage) throw new Error('Unsupported source language')

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> ${emoji('Translate')} ${t(l, 'commands.translate.translated', { sourceFlag: 'flag' in sourceLanguage ? sourceLanguage.flag : '', sourceLanguage: sourceLanguage.name, targetFlag: 'flag' in targetLanguage ? targetLanguage.flag : '', targetLanguage: targetLanguage.name })}`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${translated}${
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
