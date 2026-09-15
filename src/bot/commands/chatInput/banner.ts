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
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      }
    }

    const { user: rawUser, member: rawMember } = target

    const user = await client.api.users.get(rawUser.id)
    const member =
      interaction.guild_id && rawMember ? await client.api.guilds.getMember(interaction.guild_id, rawUser.id) : null

    if (!user.banner && !member?.banner) {
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
                ...(user.banner
                  ? ([
                      {
                        media: {
                          url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'webp', true),
                        },
                      },
                    ] satisfies APIMediaGalleryItem[])
                  : []),
                ...(member && member?.banner && interaction.guild_id
                  ? ([
                      {
                        media: {
                          url: cdn(
                            `/guilds/${interaction.guild_id}/users/${user.id}/banners/${member.banner}`,
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
                  url: cdn(`/banners/${user.id}/${user.banner}`, 4096, 'webp', true),
                  label: 'Download Banner',
                  style: ButtonStyle.Link,
                },
                ...(member && member?.banner && interaction.guild_id
                  ? ([
                      {
                        type: ComponentType.Button,
                        url: cdn(
                          `/guilds/${interaction.guild_id}/users/${user.id}/banners/${member.banner}`,
                          4096,
                          'webp',
                          true,
                        ),
                        label: 'Download Server Banner',
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
