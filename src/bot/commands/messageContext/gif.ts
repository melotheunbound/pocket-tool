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
import sharp from 'sharp'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: {
    global: 'Turn Into GIF',
    'pt-BR': 'Transformar em GIF',
    'es-ES': 'Transformar en GIF',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, client) {
    const l = interaction.locale

    const message = interaction.data.resolved.messages[interaction.data.target_id]

    if (message?.message_snapshots && message.message_snapshots.length > 0) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.gif.forwarded')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    if (!message || !message.attachments.length) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.gif.no_image')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const attachments = Object.values(message.attachments)
      .filter(attachment => attachment.content_type?.startsWith('image/'))
      .slice(0, 10)

    if (!attachments.length) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.gif.no_images')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const files = await Promise.all(
      attachments.map(async (attachment, index) => {
        const buffer = await makeRequest(attachment.url, {
          method: RequestMethod.GET,
          response: ResponseType.BUFFER,
        })

        const gif = await sharp(buffer).gif({ effort: 10 }).toBuffer()

        return {
          name: `gif-${index + 1}.gif`,
          data: gif,
        }
      }),
    )

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `-# ${emoji('GIF')} ${t(l, 'commands.gif.tip')}`,
      files,
    })
  },
})
