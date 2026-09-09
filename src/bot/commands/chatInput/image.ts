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
    "es-ES": 'imagen',
    "es-419": 'imagen',
  },
  description: {
    global: 'Play around with image manipulation',
    'pt-BR': 'Brinque com manipulação de imagens',
    "es-ES": 'Juegue con la manipulación de imágenes',
    "es-419": 'Juegue con la manipulación de imágenes',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'caption',
        'pt-BR': 'legenda',
        "es-ES": 'leyenda',
        "es-419": 'leyenda',
      },
      description: {
        global: 'Add a caption to an image',
        'pt-BR': 'Adicione uma legenda a uma imagem',
        "es-ES": 'Agregar una leyenda a una imagen',
        "es-419": 'Agregar una leyenda a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            "es-ES": 'adjunto',
            "es-419": 'adjunto',
          },
          description: {
            global: 'The image to add a caption to',
            'pt-BR': 'A imagem para adicionar uma legenda',
            "es-ES": 'La imagen para agregar una leyenda',
            "es-419": 'La imagen para agregar una leyenda',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'text',
            'pt-BR': 'texto',
            "es-ES": 'texto',
            "es-419": 'texto',
          },
          description: {
            global: 'The caption to add to the image',
            'pt-BR': 'A legenda para adicionar à imagem',
            "es-ES": 'La leyenda para agregar a la imagen',
            "es-419": 'La leyenda para agregar a la imagen',
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
        "es-ES": 'grayscale',
        "es-419": 'grayscale',
      },
      description: {
        global: 'Convert an image to grayscale',
        'pt-BR': 'Converta uma imagem para tons de cinza',
        "es-ES": 'Convertir una imagen a escala de grises',
        "es-419": 'Convertir una imagen a escala de grises',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            "es-ES": 'adjunto',
            "es-419": 'adjunto',
          },
          description: {
            global: 'The image to convert to grayscale',
            'pt-BR': 'A imagem para converter para tons de cinza',
            "es-ES": 'La imagen para convertir a escala de grises',
            "es-419": 'La imagen para convertir a escala de grises',
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
        "es-ES": 'desenfoque',
        "es-419": 'desenfoque',
      },
      description: {
        global: 'Apply a blur effect to an image',
        'pt-BR': 'Aplicar um efeito de desfoque a uma imagem',
        "es-ES": 'Aplicar un efecto de desenfoque a una imagen',
        "es-419": 'Aplicar un efecto de desenfoque a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            "es-ES": 'adjunto',
            "es-419": 'adjunto',
          },
          description: {
            global: 'The image to apply a blur effect to',
            'pt-BR': 'A imagem para aplicar um efeito de desfoque',
            "es-ES": 'La imagen para aplicar un efecto de desenfoque',
            "es-419": 'La imagen para aplicar un efecto de desenfoque',
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
        "es-ES": 'voltear',
        "es-419": 'voltear',
      },
      description: {
        global: 'Flip an image vertically',
        'pt-BR': 'Virar uma imagem verticalmente',
        "es-ES": 'Voltear una imagen verticalmente',
        "es-419": 'Voltear una imagen verticalmente',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            "es-ES": 'adjunto',
            "es-419": 'adjunto',
          },
          description: {
            global: 'The image to flip vertically',
            'pt-BR': 'A imagem para virar verticalmente',
            "es-ES": 'La imagen para voltear verticalmente',
            "es-419": 'La imagen para voltear verticalmente',
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
        "es-ES": 'flop',
        "es-419": 'flop',
      },
      description: {
        global: 'Flip an image horizontally',
        'pt-BR': 'Virar uma imagem horizontalmente',
        "es-ES": 'Voltear una imagen horizontalmente',
        "es-419": 'Voltear una imagen horizontalmente',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            "es-ES": 'adjunto',
            "es-419": 'adjunto',
          },
          description: {
            global: 'The image to flip horizontally',
            'pt-BR': 'A imagem para virar horizontalmente',
            "es-ES": 'La imagen para voltear horizontalmente',
            "es-419": 'La imagen para voltear horizontalmente',
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
        "es-ES": 'globo-de-texto',
        "es-419": 'globo-de-texto',
      },
      description: {
        global: 'Add a speech bubble to an image',
        'pt-BR': 'Adicionar um balão de fala a uma imagem',
        "es-ES": 'Agregar un globo de texto a una imagen',
        "es-419": 'Agregar un globo de texto a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            "es-ES": 'adjunto',
            "es-419": 'adjunto',
          },
          description: {
            global: 'The image to add a speech bubble to',
            'pt-BR': 'A imagem para adicionar um balão de fala',
            "es-ES": 'La imagen para agregar un globo de texto ',
            "es-419": 'La imagen para agregar un globo de texto',
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
        "es-ES": 'petpet',
        "es-419": 'petpet',
      },
      description: {
        global: 'Add a petpet effect to an image',
        'pt-BR': 'Adicionar um efeito petpet a uma imagem',
        "es-ES": 'Agregar un efecto petpet a una imagen',
        "es-419": 'Agregar un efecto petpet a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: {
            global: 'target',
            'pt-BR': 'alvo',
            "es-ES": 'objetivo',
            "es-419": 'objetivo',
          },
          description: {
            global: 'The user whose avatar to add a petpet effect to',
            'pt-BR': 'O usuário cujo avatar adicionar um efeito petpet',
            "es-ES": 'El usuario cuyo avatar agregar un efecto petpet',
            "es-419": 'El usuario cuyo avatar agregar un efecto petpet',
          },
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'scope',
            'pt-BR': 'escopo',
            "es-ES": 'ambito',
            "es-419": 'ambito',
          },
          description: {
            global: 'the scope of the avatar to petpet',
            'pt-BR': 'o escopo do avatar a petpet',
            "es-ES": 'el ámbito del avatar a petpet',
            "es-419": 'el ámbito del avatar a petpet',
          },
          choices: [
            {
              name: {
                global: 'Global',
                'pt-BR': 'Global',
                "es-ES": 'Global',
                "es-419": 'Global',
              },
              value: 'global',
            },
            {
              name: {
                global: 'Server',
                'pt-BR': 'Servidor',
                "es-ES": 'Servidor',
                "es-419": 'Servidor',
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
