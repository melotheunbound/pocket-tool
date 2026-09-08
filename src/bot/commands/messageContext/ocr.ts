import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import env from '../../../utils/env'
import { codeblock, emoji, ellipsis } from '../../../utils/markdown'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType } from '../../../types/types'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: {
    global: 'OCR',
    'pt-BR': 'OCR',
    'es-ES': 'OCR',
    'es-419': 'OCR',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, client) {
    const l = interaction.locale

    const ocrApiKey = env.get('ocr_api_key')?.toString()

    if (!ocrApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} ${t(l, 'commands.ocr.missing_api_key')}`,
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
                content: `${emoji('Exclamation')} ${t(l, 'commands.ocr.forwarded')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    if (
      !message ||
      !message.attachments.length ||
      !message.attachments.find(attachment => attachment.content_type?.startsWith('image/'))
    ) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.ocr.no_image')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const attachment = message.attachments.find(attachment => attachment.content_type?.startsWith('image/'))!

    const image = await makeRequest(attachment.url, {
      method: RequestMethod.GET,
      response: ResponseType.BUFFER,
    })

    const form = new FormData()

    form.append('apikey', ocrApiKey)
    form.append('language', 'por')
    form.append(
      'file',
      new Blob([image], {
        type: attachment.content_type ?? 'image/jpeg',
      }),
      attachment.filename ?? 'image.jpg',
    )

    const ocr = await makeRequest('https://api.ocr.space/parse/image', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      body: form,
    })

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: codeblock('ansi', ellipsis(ocr.ParsedResults[0].ParsedText, 3995)),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
