import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIInteractionDataResolvedGuildMember,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import {
  applyBlur,
  applyCaption,
  applyFlip,
  applyFlop,
  applyGrayscale,
  applyPixelate,
  applySpeechBubble,
  convertToGif,
  createPetpetGif,
} from '../../../utils/image'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType } from '../../../types/types'
import { cdn, emoji } from '../../../utils/markdown'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'image',
    'pt-BR': 'imagem',
    'es-ES': 'imagen',
  },
  description: {
    global: 'Play around with image manipulation',
    'pt-BR': 'Brinque com manipulação de imagens',
    'es-ES': 'Juegue con la manipulación de imágenes',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'caption',
        'pt-BR': 'legenda',
        'es-ES': 'leyenda',
      },
      description: {
        global: 'Add a caption to an image',
        'pt-BR': 'Adicione uma legenda a uma imagem',
        'es-ES': 'Agregar una leyenda a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to add a caption to',
            'pt-BR': 'A imagem para adicionar uma legenda',
            'es-ES': 'La imagen para agregar una leyenda',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'text',
            'pt-BR': 'texto',
            'es-ES': 'texto',
          },
          description: {
            global: 'The caption to add to the image',
            'pt-BR': 'A legenda para adicionar à imagem',
            'es-ES': 'La leyenda para agregar a la imagen',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'GIF',
                'pt-BR': 'GIF',
                'es-ES': 'GIF',
              },
              value: 'gif',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'grayscale',
        'pt-BR': 'preto-e-branco',
        'es-ES': 'grayscale',
      },
      description: {
        global: 'Convert an image to grayscale',
        'pt-BR': 'Converta uma imagem para tons de cinza',
        'es-ES': 'Convertir una imagen a escala de grises',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to convert to grayscale',
            'pt-BR': 'A imagem para converter para tons de cinza',
            'es-ES': 'La imagen para convertir a escala de grises',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'GIF',
                'pt-BR': 'GIF',
                'es-ES': 'GIF',
              },
              value: 'gif',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'blur',
        'pt-BR': 'desfocar',
        'es-ES': 'desenfoque',
      },
      description: {
        global: 'Apply a blur effect to an image',
        'pt-BR': 'Aplicar um efeito de desfoque a uma imagem',
        'es-ES': 'Aplicar un efecto de desenfoque a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to apply a blur effect to',
            'pt-BR': 'A imagem para aplicar um efeito de desfoque',
            'es-ES': 'La imagen para aplicar un efecto de desenfoque',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.Integer,
          name: {
            global: 'strength',
            'pt-BR': 'força',
            'es-ES': 'fuerza',
          },
          description: {
            global: 'The strength of the blur effect',
            'pt-BR': 'A força do efeito de desfoque',
            'es-ES': 'La fuerza del efecto de desenfoque',
          },
          minValue: 1,
          maxValue: 20,
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'GIF',
                'pt-BR': 'GIF',
                'es-ES': 'GIF',
              },
              value: 'gif',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'flip',
        'pt-BR': 'virar',
        'es-ES': 'voltear',
      },
      description: {
        global: 'Flip an image vertically',
        'pt-BR': 'Virar uma imagem verticalmente',
        'es-ES': 'Voltear una imagen verticalmente',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to flip vertically',
            'pt-BR': 'A imagem para virar verticalmente',
            'es-ES': 'La imagen para voltear verticalmente',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'gif',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'flop',
        'pt-BR': 'flop',
        'es-ES': 'flop',
      },
      description: {
        global: 'Flip an image horizontally',
        'pt-BR': 'Virar uma imagem horizontalmente',
        'es-ES': 'Voltear una imagen horizontalmente',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to flip horizontally',
            'pt-BR': 'A imagem para virar horizontalmente',
            'es-ES': 'La imagen para voltear horizontalmente',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'GIF',
                'pt-BR': 'GIF',
                'es-ES': 'GIF',
              },
              value: 'gif',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'speech-bubble',
        'pt-BR': 'balao-de-fala',
        'es-ES': 'globo-de-texto',
      },
      description: {
        global: 'Add a speech bubble to an image',
        'pt-BR': 'Adicionar um balão de fala a uma imagem',
        'es-ES': 'Agregar un globo de texto a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to add a speech bubble to',
            'pt-BR': 'A imagem para adicionar um balão de fala',
            'es-ES': 'La imagen para agregar un globo de texto ',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'GIF',
                'pt-BR': 'GIF',
                'es-ES': 'GIF',
              },
              value: 'gif',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'petpet',
        'pt-BR': 'petpet',
        'es-ES': 'petpet',
      },
      description: {
        global: 'Add a petpet effect to an image',
        'pt-BR': 'Adicionar um efeito petpet a uma imagem',
        'es-ES': 'Agregar un efecto petpet a una imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: {
            global: 'target',
            'pt-BR': 'alvo',
            'es-ES': 'objetivo',
          },
          description: {
            global: 'The user whose avatar to add a petpet effect to',
            'pt-BR': 'O usuário cujo avatar adicionar um efeito petpet',
            'es-ES': 'El usuario cuyo avatar agregar un efecto petpet',
          },
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'scope',
            'pt-BR': 'escopo',
            'es-ES': 'ambito',
          },
          description: {
            global: 'the scope of the avatar to petpet',
            'pt-BR': 'o escopo do avatar a petpet',
            'es-ES': 'el ámbito del avatar a petpet',
          },
          choices: [
            {
              name: {
                global: 'Global',
                'pt-BR': 'Global',
                'es-ES': 'Global',
              },
              value: 'global',
            },
            {
              name: {
                global: 'Server',
                'pt-BR': 'Servidor',
                'es-ES': 'Servidor',
              },
              value: 'server',
            },
          ],
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'gif',
        'pt-BR': 'gif',
        'es-ES': 'gif',
      },
      description: {
        global: 'Turn an image into a GIF',
        'pt-BR': 'Transforme uma imagem em um GIF',
        'es-ES': 'Transformar una imagen en un GIF',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to turn into a GIF',
            'pt-BR': 'A imagem para transformar em um GIF',
            'es-ES': 'La imagen para transformar en un GIF',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'name',
            'pt-BR': 'nome',
            'es-ES': 'nombre',
          },
          description: {
            global: 'The name of the GIF',
            'pt-BR': 'O nome do GIF',
            'es-ES': 'El nombre del GIF',
          },
          required: false,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: {
        global: 'pixelate',
        'pt-BR': 'pixelar',
        'es-ES': 'pixelar',
      },
      description: {
        global: 'Pixelates the image',
        'pt-BR': 'Pixeliza a imagem',
        'es-ES': 'Pixeliza la imagen',
      },
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: {
            global: 'attachment',
            'pt-BR': 'anexo',
            'es-ES': 'adjunto',
          },
          description: {
            global: 'The image to pixelate',
            'pt-BR': 'A imagem a ser pixelizada',
            'es-ES': 'La imagen a ser pixelizada',
          },
          required: true,
        },
        {
          type: ApplicationCommandOptionType.Number,
          name: {
            global: 'scale',
            'pt-BR': 'escala',
            'es-ES': 'escala',
          },
          description: {
            global: 'The scale of the pixelation',
            'pt-BR': 'A escala da pixelização',
            'es-ES': 'La escala de la pixelización',
          },
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: {
            global: 'format',
            'pt-BR': 'formato',
            'es-ES': 'formato',
          },
          description: {
            global: 'The format to send the image in',
            'pt-BR': 'O formato para enviar a imagem',
            'es-ES': 'El formato para enviar la imagen',
          },
          choices: [
            {
              name: {
                global: 'Image',
                'pt-BR': 'Imagem',
                'es-ES': 'Imagen',
              },
              value: 'png',
            },
            {
              name: {
                global: 'GIF',
                'pt-BR': 'GIF',
                'es-ES': 'GIF',
              },
              value: 'gif',
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
    const l = interaction.locale

    const { caption, grayscale, blur, flip, flop, 'speech-bubble': speechBubble, petpet, gif, pixelate } = options

    if (caption) {
      const { attachment, text, format } = caption

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const captioned = await applyCaption(buffer, text, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: `captioned.${format ?? 'png'}`,
          },
        ],
        files: [
          {
            name: `captioned.${format ?? 'png'}`,
            data: captioned,
          },
        ],
      })
    } else if (grayscale) {
      const { attachment, format } = grayscale

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const grayscaled = await applyGrayscale(buffer, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: `grayscaled.${format ?? 'png'}`,
          },
        ],
        files: [
          {
            name: `grayscaled.${format ?? 'png'}`,
            data: grayscaled,
          },
        ],
      })
    } else if (blur) {
      const { attachment, strength, format } = blur

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const blurred = await applyBlur(buffer, strength, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: `blurred.${format ?? 'png'}`,
          },
        ],
        files: [
          {
            name: `blurred.${format ?? 'png'}`,
            data: blurred,
          },
        ],
      })
    } else if (flip) {
      const { attachment, format } = flip

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const flipped = await applyFlip(buffer, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: `flipped.${format ?? 'png'}`,
          },
        ],
        files: [
          {
            name: `flipped.${format ?? 'png'}`,
            data: flipped,
          },
        ],
      })
    } else if (flop) {
      const { attachment, format } = flop

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const flopped = await applyFlop(buffer, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: `flopped.${format ?? 'png'}`,
          },
        ],
        files: [
          {
            name: `flopped.${format ?? 'png'}`,
            data: flopped,
          },
        ],
      })
    } else if (speechBubble) {
      const { attachment, format } = speechBubble

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const speechBubbled = await applySpeechBubble(buffer, undefined, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'speechBubbled.gif',
          },
        ],
        files: [
          {
            name: 'speechBubbled.gif',
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
    } else if (gif) {
      const { attachment, name } = gif

      if (!attachment) {
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

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const gifed = await convertToGif(buffer)

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        content: `-# ${emoji('GIF')} ${t(l, 'commands.image.gif.tip')}`,
        files: [
          {
            name: `${name ?? 'gif'}.gif`,
            data: gifed,
          },
        ],
      })
    } else if (pixelate) {
      const { attachment, scale, format } = pixelate

      const buffer = await makeRequest(attachment.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      })

      const pixelated = await applyPixelate(buffer, scale, format === 'gif')

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: `pixelated.${format ?? 'png'}`,
          },
        ],
        files: [
          {
            name: `pixelated.${format ?? 'png'}`,
            data: pixelated,
          },
        ],
      })
    }
  },
})
