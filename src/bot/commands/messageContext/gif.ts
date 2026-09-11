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
import { t } from '../../../utils/localization'
import { convertToGif } from '../../../utils/image'

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
                content: `${emoji('Exclamation')} ${t(l, 'commands.image.gif.forwarded')}`,
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
                content: `${emoji('Exclamation')} ${t(l, 'commands.image.gif.no_image')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const attachments = Object.values(message.attachments).slice(0, 10)

    const files = await Promise.all(
      attachments.map(async (attachment, index) => {
        try {
          const buffer = await makeRequest(attachment.url, {
            method: RequestMethod.GET,
            response: ResponseType.BUFFER,
          })

          const gif = await convertToGif(buffer)

          return {
            name: `gif-${index + 1}.gif`,
            data: gif,
          }
        } catch {
          return null
        }
      }),
    )

    const validFiles = files.filter(file => file !== null)

    if (!validFiles.length) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.image.gif.no_images')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `-# ${emoji('GIF')} ${t(l, 'commands.image.gif.tip')}`,
      files: validFiles,
    })
  },
})
