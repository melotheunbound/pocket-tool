import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIComponentInMessageActionRow,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import { cdn, emoji } from '../../../utils/markdown';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'banner',
  description: "View a user's banner",
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'The user to view the banner of',
      required: false,
    },
  ],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    let { user: target } = options;

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
      };
    }

    const { user } = target;

    if (!user) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please provide a valid user to view their banner.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const u = await client.api.users.get(user.id);

    if (!u.banner) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} <@${user.id}> doesn't have a banner.`,
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
                    url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'webp', true),
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
                  url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'png'),
                  label: 'PNG',
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'jpg'),
                  label: 'JPG',
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'webp', true),
                  label: 'WEBP',
                  style: ButtonStyle.Link,
                },
                ...(u.banner?.startsWith('a_')
                  ? ([
                      {
                        type: ComponentType.Button,
                        url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'gif'),
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
  },
});
