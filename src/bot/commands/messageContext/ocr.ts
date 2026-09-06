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

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'OCR',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, client) {
    const ocrApiKey = env.get('ocr_api_key')?.toString()

    if (!ocrApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} OCR API key is not set.`,
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
                content: `${emoji('Exclamation')} Please select an image to extract text from.`,
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
