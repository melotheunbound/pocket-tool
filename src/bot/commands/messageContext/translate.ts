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
import { findClosestMatch } from '../../../utils/utils'
import { t } from '../../../utils/localization'
import { GOOGLE_TRANSLATOR_LANGUAGES } from '../../constants'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: {
    global: 'Translate This Message',
    'pt-BR': 'Traduzir Esta Mensagem',
    'es-ES': 'Traducir Este Mensaje',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, client) {
    const l = interaction.locale

    const message = interaction.data.resolved.messages[interaction.data.target_id]

    const text = (
      message?.content?.trim() ? message.content : (message?.message_snapshots?.[0]?.message?.content ?? '')
    ).trim()

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

    const targetCode =
      findClosestMatch(
        interaction.locale,
        GOOGLE_TRANSLATOR_LANGUAGES.map(language => language.code),
      ) ?? 'en'

    const targetLanguage = GOOGLE_TRANSLATOR_LANGUAGES.find(language => language.code === targetCode)

    if (!targetLanguage) {
      throw new Error(`Unsupported target language: ${targetCode}`)
    }

    const translation = await makeRequest('https://translate.googleapis.com/translate_a/single', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        client: 'gtx',
        sl: 'auto',
        tl: targetCode,
        dt: 't',
        q: text,
      },
    })

    const translated = translation[0].map(([translation]: [string]) => translation).join('')

    const sourceCode =
      findClosestMatch(
        translation[2],
        GOOGLE_TRANSLATOR_LANGUAGES.map(language => language.code),
      ) ?? translation[2]

    const sourceLanguage = GOOGLE_TRANSLATOR_LANGUAGES.find(language => language.code === sourceCode)

    if (!sourceLanguage) throw new Error(`Unsupported detected source language: ${translation[2]}`)

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
              content: `${translated}\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.translate.auto_detected_target')}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
