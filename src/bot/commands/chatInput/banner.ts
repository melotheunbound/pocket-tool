import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIComponentInMessageActionRow,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji } from '../../../utils/markdown'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'banner',
    'pt-BR': 'banner',
    'es-ES': 'banner',
  },
  description: {
    global: "View a user's banner",
    'pt-BR': 'Veja o banner de um usuário',
    'es-ES': 'Vea el banner de un usuario',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: {
        global: 'target',
        'pt-BR': 'alvo',
        'es-ES': 'objetivo',
      },
      description: {
        global: 'The user to view the banner of',
        'pt-BR': 'O usuário para ver o banner',
        'es-ES': 'El usuario para ver el banner',
      },
      required: false,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    let { target } = options

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
      }
    }

    const { user: rawUser } = target

    const user = await client.api.users.get(rawUser.id)

    if (!user.banner) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.banner.no_banner', { userId: user.id })}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.MediaGallery,
              items: [
                {
                  media: {
                    url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'webp', true),
                  },
                },
              ],
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'png'),
                  label: 'PNG',
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'jpg'),
                  label: 'JPG',
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'webp', true),
                  label: 'WEBP',
                  style: ButtonStyle.Link,
                },
                ...(user.banner?.startsWith('a_')
                  ? ([
                      {
                        type: ComponentType.Button,
                        url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'gif'),
                        label: 'GIF',
                        style: ButtonStyle.Link,
                      },
                    ] satisfies APIComponentInMessageActionRow[])
                  : []),
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
