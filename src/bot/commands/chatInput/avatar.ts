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
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { cdn, emoji } from '../../../utils/markdown'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'avatar',
    'pt-BR': 'avatar',
    "es-ES": 'avatar',
    "es-419": 'avatar',
  },
  description: {
    global: "View a user's avatar",
    'pt-BR': 'Veja o avatar de um usuário',
    "es-ES": 'Veja el avatar de un usuario',
    "es-419": 'Veja el avatar de un usuario',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: {
        global: 'target',
        'pt-BR': 'alvo',
        "es-ES": 'alvo',
        "es-419": 'alvo',
      },
      description: {
        global: 'The user to view the avatar of',
        'pt-BR': 'O usuário para ver o avatar',
        "es-ES": 'El usuario para ver el avatar',
        "es-419": 'El usuario para ver el avatar',
      },
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'scope',
        'pt-BR': 'escopo',
        "es-ES": 'escopo',
        "es-419": 'escopo',
      },
      description: {
        global: 'the scope of the avatar to view',
        'pt-BR': 'o escopo do avatar para ver',
        "es-ES": 'el escopo del avatar para ver',
        "es-419": 'el escopo del avatar para ver',
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
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    let { target, scope } = options

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      }
    }

    scope ??= 'global'

    const { user, member } = target

    if (scope === 'server' && member) {
      if (!member.avatar) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Exclamation')} ${t(l, 'commands.avatar.server.no_avatar', { userId: user.id })}`,
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
                      url: cdn(
                        `guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                        4096,
                        'webp',
                        true,
                      ),
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
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'png'),
                    label: 'PNG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'jpg'),
                    label: 'JPG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'webp'),
                    label: 'WEBP',
                    style: ButtonStyle.Link,
                  },
                  ...(member.avatar.startsWith('a_')
                    ? ([
                        {
                          type: ComponentType.Button,
                          url: cdn(
                            `guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                            4096,
                            'gif',
                          ),
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
    } else {
      if (!user.avatar) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Exclamation')} ${t(l, 'commands.avatar.global.no_avatar', { userId: user.id })}`,
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
                      url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
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
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'png'),
                    label: 'PNG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'jpg'),
                    label: 'JPG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                    label: 'WEBP',
                    style: ButtonStyle.Link,
                  },
                  ...(user.avatar?.startsWith('a_')
                    ? ([
                        {
                          type: ComponentType.Button,
                          url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'gif'),
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
    }
  },
})
