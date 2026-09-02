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
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import { cdn, emoji } from '../../../utils/markdown';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'avatar',
  description: "View a user's avatar",
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'The user to view the avatar of',
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'scope',
      description: 'the scope of the avatar to view',
      choices: [
        {
          name: 'Global',
          value: 'global',
        },
        {
          name: 'Server',
          value: 'server',
        },
      ],
      required: false,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    let { user: target, scope } = options;

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      };
    }

    scope ??= 'global';

    const { user, member } = target;

    if (scope === 'server' && member) {
      if (!member.avatar) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Exclamation')} <@${user.id}> doesn't have a server avatar.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
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
      });
    } else {
      if (!user.avatar) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Exclamation')} <@${user.id}> doesn't have an avatar.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
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
      });
    }
  },
});
