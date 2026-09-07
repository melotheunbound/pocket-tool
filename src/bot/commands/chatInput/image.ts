import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
  type APIInteractionDataResolvedGuildMember,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import {
  applyBlur,
  applyCaption,
  applyFlip,
  applyFlop,
  applyGrayscale,
  applySpeechBubble,
  createPetpetGif,
} from '../../../utils/image'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType } from '../../../types/types'
import { cdn } from '../../../utils/markdown'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'image',
    'pt-BR': 'imagem',
  },
  description: {
    global: 'Play around with image manipulation',
    'pt-BR': 'Brinque com manipulação de imagens',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'caption',
        'pt-BR': 'legenda',
      },
      description: {
        global: 'Add a caption to an image',
        'pt-BR': 'Adicione uma legenda a uma imagem',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
          },
          description: {
            global: 'The image to add a caption to',
            'pt-BR': 'A imagem para adicionar uma legenda',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'text',
            'pt-BR': 'texto',
          },
          description: {
            global: 'The caption to add to the image',
            'pt-BR': 'A legenda para adicionar à imagem',
          },
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'grayscale',
        'pt-BR': 'preto-e-branco',
      },
      description: {
        global: 'Convert an image to grayscale',
        'pt-BR': 'Converta uma imagem para tons de cinza',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
          },
          description: {
            global: 'The image to convert to grayscale',
            'pt-BR': 'A imagem para converter para tons de cinza',
          },
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'blur',
        'pt-BR': 'desfocar',
      },
      description: {
        global: 'Apply a blur effect to an image',
        'pt-BR': 'Aplicar um efeito de desfoque a uma imagem',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
          },
          description: {
            global: 'The image to apply a blur effect to',
            'pt-BR': 'A imagem para aplicar um efeito de desfoque',
          },
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'flip',
        'pt-BR': 'virar',
      },
      description: {
        global: 'Flip an image vertically',
        'pt-BR': 'Virar uma imagem verticalmente',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
          },
          description: {
            global: 'The image to flip vertically',
            'pt-BR': 'A imagem para virar verticalmente',
          },
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'flop',
        'pt-BR': 'flop',
      },
      description: {
        global: 'Flip an image horizontally',
        'pt-BR': 'Virar uma imagem horizontalmente',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
          },
          description: {
            global: 'The image to flip horizontally',
            'pt-BR': 'A imagem para virar horizontalmente',
          },
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'speech-bubble',
        'pt-BR': 'balao-de-fala',
      },
      description: {
        global: 'Add a speech bubble to an image',
        'pt-BR': 'Adicionar um balão de fala a uma imagem',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
          },
          description: {
            global: 'The image to add a speech bubble to',
            'pt-BR': 'A imagem para adicionar um balão de fala',
          },
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'petpet',
        'pt-BR': 'petpet',
      },
      description: {
        global: 'Add a petpet effect to an image',
        'pt-BR': 'Adicionar um efeito petpet a uma imagem',
      },
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: {
            global: 'target',
            'pt-BR': 'alvo',
          },
          description: {
            global: 'The user whose avatar to add a petpet effect to',
            'pt-BR': 'O usuário cujo avatar adicionar um efeito petpet',
          },
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'scope',
            'pt-BR': 'escopo',
          },
          description: {
            global: 'the scope of the avatar to petpet',
            'pt-BR': 'o escopo do avatar a petpet',
          },
          choices: [
            {
              name: {
                global: 'Global',
                'pt-BR': 'Global',
              },
              value: 'global',
            },
            {
              name: {
                global: 'Server',
                'pt-BR': 'Servidor',
              },
              value: 'server',
            },
          ],
          required: false,
        },
      ],
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const { caption, grayscale, blur, flip, flop, 'speech-bubble': speechBubble, petpet } = options

    if (caption) {
      const { attachment, text } = caption

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const captioned = await applyCaption(buffer, text)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'captioned.png',
          },
        ],
        files: [
          {
            name: 'captioned.png',
            data: captioned,
          },
        ],
      })
    } else if (grayscale) {
      const { attachment } = grayscale

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const grayscaled = await applyGrayscale(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'grayscaled.png',
          },
        ],
        files: [
          {
            name: 'grayscaled.png',
            data: grayscaled,
          },
        ],
      })
    } else if (blur) {
      const { attachment } = blur

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const blurred = await applyBlur(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'blurred.png',
          },
        ],
        files: [
          {
            name: 'blurred.png',
            data: blurred,
          },
        ],
      })
    } else if (flip) {
      const { attachment } = flip

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const flipped = await applyFlip(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'flipped.png',
          },
        ],
        files: [
          {
            name: 'flipped.png',
            data: flipped,
          },
        ],
      })
    } else if (flop) {
      const { attachment } = flop

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const flopped = await applyFlop(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'flopped.png',
          },
        ],
        files: [
          {
            name: 'flopped.png',
            data: flopped,
          },
        ],
      })
    } else if (speechBubble) {
      const { attachment } = speechBubble

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const speechBubbled = await applySpeechBubble(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'speechBubbled.png',
          },
        ],
        files: [
          {
            name: 'speechBubbled.png',
            data: speechBubbled,
          },
        ],
      })
    } else if (petpet) {
      let { target, scope } = petpet

      if (!target) {
        target = {
          user: (interaction.user ?? interaction.member?.user)!,
          member: interaction.member as APIInteractionDataResolvedGuildMember,
        }
      }

      scope ??= 'global'

      const { user, member } = target

      let avatar

      if (scope === 'server' && member) {
        avatar = member.avatar
          ? cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'webp', true)
          : user.avatar
            ? cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true)
            : cdn(`/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}`, 4096, 'png')
      } else {
        avatar = user.avatar
          ? cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true)
          : cdn(`/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}`, 4096, 'png')
      }

      const buffer = await makeRequest(avatar, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const petpeted = await createPetpetGif(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'petpeted.gif',
          },
        ],
        files: [
          {
            name: 'petpeted.gif',
            data: petpeted,
          },
        ],
      })
    }
  },
})
