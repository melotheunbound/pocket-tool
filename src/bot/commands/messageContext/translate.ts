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
import { DEEPLX_LANGUAGES } from '../../constants'
import { findClosestMatch } from '../../../utils/utils'
import { t } from '../../../utils/localization'

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
        DEEPLX_LANGUAGES.map(language => language.code),
      ) ?? 'en'

    const translation = await makeRequest('https://oneshot-free.www.deepl.com/v1/translate', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        'Content-type': 'application/json',
      },
      body: {
        text: [text],
        target_lang: targetCode,
      },
    })

    const sourceCode = translation.translations[0].detected_source_lang

    const sourceLanguage = DEEPLX_LANGUAGES.find(language => language.code === sourceCode)

    if (!sourceLanguage) throw new Error(`Unsupported source language: ${sourceCode}`)

    const targetLanguage = DEEPLX_LANGUAGES.find(language => language.code === targetCode)

    if (!targetLanguage) throw new Error(`Unsupported target language: ${targetCode}`)

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
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
              content: `${translation.translations[0].text}\n\n-# ${emoji('Exclamation')} ${t(l, 'commands.translate.auto_detected_target')}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
