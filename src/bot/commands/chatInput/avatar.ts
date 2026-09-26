import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIComponentInMessageActionRow,
  type APIInteractionDataResolvedGuildMember,
  type APIMediaGalleryItem,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji } from '../../../utils/markdown'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'avatar',
    'pt-BR': 'avatar',
    'es-ES': 'avatar',
  },
  description: {
    global: "View a user's avatar",
    'pt-BR': 'Veja o avatar de um usuário',
    'es-ES': 'Vea el avatar de un usuario',
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
        global: 'The user to view the avatar of',
        'pt-BR': 'O usuário para ver o avatar',
        'es-ES': 'El usuario para ver el avatar',
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
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      }
    }

    const { user, member } = target

    if (!user.avatar && !member?.avatar) {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.avatar.no_avatar', { userId: user.id })}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.MediaGallery,
              items: [
                ...(user.avatar
                  ? ([
                      {
                        media: {
                          url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                        },
                      },
                    ] satisfies APIMediaGalleryItem[])
                  : []),
                ...(member && member?.avatar && interaction.guild_id
                  ? ([
                      {
                        media: {
                          url: cdn(
                            `/guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                            4096,
                            'webp',
                            true,
                          ),
                        },
                      },
                    ] satisfies APIMediaGalleryItem[])
                  : []),
              ] satisfies APIMediaGalleryItem[],
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                  label: t(l, 'commands.avatar.buttons.global'),
                  style: ButtonStyle.Link,
                },
                ...(member && member?.avatar && interaction.guild_id
                  ? ([
                      {
                        type: ComponentType.Button,
                        url: cdn(
                          `/guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                          4096,
                          'webp',
                          true,
                        ),
                        label: t(l, 'commands.avatar.buttons.server'),
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
