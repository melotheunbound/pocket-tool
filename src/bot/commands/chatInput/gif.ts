import {
  ApplicationCommandOptionType,
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
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'gif',
    'pt-BR': 'gif',
  },
  description: {
    global: 'Turn an image into a GIF',
    'pt-BR': 'Transforme uma imagem em um GIF',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Attachment,
      name: {
        global: 'image',
        'pt-BR': 'imagem',
      },
      description: {
        global: 'The image to turn into a GIF',
        'pt-BR': 'A imagem para transformar em um GIF',
      },
      required: true,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    const { image } = options

    if (!image || !image.content_type?.startsWith('image/')) {
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

    const buffer = await makeRequest(image.url, {
      method: RequestMethod.GET,
      response: ResponseType.BUFFER,
    })

    const gif = await sharp(buffer).gif({ effort: 10 }).toBuffer()

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `-# ${emoji('GIF')} ${t(l, 'commands.gif.tip')}`,
      files: [
        {
          name: 'gif.gif',
          data: gif,
        },
      ],
    })
  },
})
