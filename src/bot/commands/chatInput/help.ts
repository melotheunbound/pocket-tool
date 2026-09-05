import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  TextInputStyle,
  type APIComponentInActionRow,
  type APIMessageComponentButtonInteraction,
  type APIModalSubmitInteraction,
  type APIModalSubmitTextInputComponent,
  type ModalSubmitLabelComponent,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import List from '../../../utils/list';
import { getCommandPaths, toComponentEmoji } from '../../../utils/utils';
import { emoji } from '../../../utils/markdown';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'help',
  description: 'View and search through all available commands',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const globalCommands = await client.api.applicationCommands.getGlobalCommands(interaction.application_id);

    const commands = globalCommands.flatMap((command) => {
      const paths = getCommandPaths(command.options);

      if (!paths.length) {
        return [command];
      }

      return paths.map((path) => ({
        ...command,
        name: `${command.name} ${path}`,
      }));
    });

    const limit = 5;

    const list = new List(
      true,
      ...Array.from({ length: Math.ceil(commands.length / limit) }, (_, index) =>
        commands.slice(index * limit, index * limit + limit),
      ),
    );

    let pages = list;
    let query: string | null = null;

    let result = (pages.current ?? [])
      .map(
        (command, index) =>
          `**${pages.pointer * limit + index + 1}.** </${command.name}:${command.id}>${command.description ? `\n-# ${command.description}` : ''}`,
      )
      .join('\n\n');

    const response = await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content:
                    '### Command Browser\n-# Browse all available commands using pagination, or search for a specific command',
                },
              ],
              accessory: {
                type: ComponentType.Button,
                custom_id: 'commands-search',
                emoji: toComponentEmoji('Search'),
                style: ButtonStyle.Secondary,
              },
            },
          ],
        },
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: result,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `-# Page **${pages.pointer + 1}** of **${pages.length}**`,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  custom_id: 'commands-prev',
                  emoji: toComponentEmoji('Previous'),
                  style: ButtonStyle.Secondary,
                },
                {
                  type: ComponentType.Button,
                  custom_id: 'commands-next',
                  emoji: toComponentEmoji('Next'),
                  style: ButtonStyle.Secondary,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = client.api.interactions.createCollector<
      APIMessageComponentButtonInteraction | APIModalSubmitInteraction
    >({
      key: 'command-browser',
      filter: (i) =>
        i.message?.id === response.id &&
        (i.user?.id ?? i.member?.user.id) === (interaction.user?.id ?? interaction.member?.user.id),
      duration: 5 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      switch (i.data.custom_id) {
        case 'commands-prev': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          pages.back();

          result = (pages.current ?? [])
            .map(
              (command, index) =>
                `**${pages.pointer * limit + index + 1}.** </${command.name}:${command.id}>${command.description ? `\n-# ${command.description}` : ''}`,
            )
            .join('\n\n');

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content:
                          query !== null
                            ? `### Command Browser\n-# Search results for **${query}**`
                            : '### Command Browser\n-# Browse all available commands using pagination, or search for a specific command',
                      },
                    ],
                    accessory: {
                      type: ComponentType.Button,
                      custom_id: 'commands-search',
                      emoji: toComponentEmoji('Search'),
                      style: ButtonStyle.Secondary,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: result,
                  },
                  {
                    type: ComponentType.Separator,
                  },
                  {
                    type: ComponentType.TextDisplay,
                    content: `-# Page **${pages.pointer + 1}** of **${pages.length}**`,
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-prev',
                        emoji: toComponentEmoji('Previous'),
                        style: ButtonStyle.Secondary,
                      },
                      ...(query !== null
                        ? ([
                            {
                              type: ComponentType.Button,
                              custom_id: 'commands-back',
                              emoji: toComponentEmoji('Home'),
                              style: ButtonStyle.Secondary,
                            },
                          ] satisfies APIComponentInActionRow[])
                        : []),
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-next',
                        emoji: toComponentEmoji('Next'),
                        style: ButtonStyle.Secondary,
                      },
                    ],
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'commands-next': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          pages.next();

          result = (pages.current ?? [])
            .map(
              (command, index) =>
                `**${pages.pointer * limit + index + 1}.** </${command.name}:${command.id}>${command.description ? `\n-# ${command.description}` : ''}`,
            )
            .join('\n\n');

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content:
                          query !== null
                            ? `### Command Browser\n-# Search results for **${query}**`
                            : '### Command Browser\n-# Browse all available commands using pagination, or search for a specific command',
                      },
                    ],
                    accessory: {
                      type: ComponentType.Button,
                      custom_id: 'commands-search',
                      emoji: toComponentEmoji('Search'),
                      style: ButtonStyle.Secondary,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: result,
                  },
                  {
                    type: ComponentType.Separator,
                  },
                  {
                    type: ComponentType.TextDisplay,
                    content: `-# Page **${pages.pointer + 1}** of **${pages.length}**`,
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-prev',
                        emoji: toComponentEmoji('Previous'),
                        style: ButtonStyle.Secondary,
                      },
                      ...(query !== null
                        ? ([
                            {
                              type: ComponentType.Button,
                              custom_id: 'commands-back',
                              emoji: toComponentEmoji('Home'),
                              style: ButtonStyle.Secondary,
                            },
                          ] satisfies APIComponentInActionRow[])
                        : []),
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-next',
                        emoji: toComponentEmoji('Next'),
                        style: ButtonStyle.Secondary,
                      },
                    ],
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'commands-search': {
          await client.api.interactions.createModal(i.id, i.token, {
            title: 'Command Search',
            custom_id: 'commands-search-modal',
            components: [
              {
                type: ComponentType.Label,
                label: 'Search for commands by name',
                component: {
                  type: ComponentType.TextInput,
                  custom_id: 'commands-search-input',
                  placeholder: 'Enter a command name',
                  style: TextInputStyle.Short,
                  required: true,
                },
              },
            ],
          });

          break;
        }
        case 'commands-search-modal': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          const name =
            (i as APIModalSubmitInteraction).data.components?.[0]?.type === ComponentType.Label
              ? (
                  ((i as APIModalSubmitInteraction).data.components[0] as ModalSubmitLabelComponent)
                    .component as APIModalSubmitTextInputComponent
                ).value
              : undefined;

          if (!name || !name.trim().toLowerCase()) {
            return;
          }

          const search = name.trim().toLowerCase();

          const results = commands.filter((command) => command.name.trim().toLowerCase().includes(search));

          if (!results.length) {
            await client.api.interactions.followUp(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: `${emoji('Exclamation')} No commands found matching your search.`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });

            return;
          }

          pages = new List(
            true,
            ...Array.from({ length: Math.ceil(results.length / limit) }, (_, index) =>
              results.slice(index * limit, index * limit + limit),
            ),
          );

          query = search;

          result = (pages.current ?? [])
            .map(
              (command, index) =>
                `**${pages.pointer * limit + index + 1}.** </${command.name}:${command.id}>${command.description ? `\n-# ${command.description}` : ''}`,
            )
            .join('\n\n');

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `### Command Browser\n-# Search results for **${query}**`,
                      },
                    ],
                    accessory: {
                      type: ComponentType.Button,
                      custom_id: 'commands-search',
                      emoji: toComponentEmoji('Search'),
                      style: ButtonStyle.Secondary,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: result,
                  },
                  {
                    type: ComponentType.Separator,
                  },
                  {
                    type: ComponentType.TextDisplay,
                    content: `-# Page **${pages.pointer + 1}** of **${pages.length}**`,
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-prev',
                        emoji: toComponentEmoji('Previous'),
                        style: ButtonStyle.Secondary,
                      },
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-back',
                        emoji: toComponentEmoji('Home'),
                        style: ButtonStyle.Secondary,
                      },
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-next',
                        emoji: toComponentEmoji('Next'),
                        style: ButtonStyle.Secondary,
                      },
                    ],
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'commands-back': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          pages = list;
          query = null;

          result = (pages.current ?? [])
            .map(
              (c, index) =>
                `**${pages.pointer * limit + index + 1}.** </${c.name}:${c.id}>${c.description ? `\n-# ${c.description}` : ''}`,
            )
            .join('\n\n');

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content:
                          '### Command Browser\n-# Browse all available commands using pagination, or search for a specific command',
                      },
                    ],
                    accessory: {
                      type: ComponentType.Button,
                      custom_id: 'commands-search',
                      emoji: toComponentEmoji('Search'),
                      style: ButtonStyle.Secondary,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: result,
                  },
                  {
                    type: ComponentType.Separator,
                  },
                  {
                    type: ComponentType.TextDisplay,
                    content: `-# Page **${pages.pointer + 1}** of **${pages.length}**`,
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-prev',
                        emoji: toComponentEmoji('Previous'),
                        style: ButtonStyle.Secondary,
                      },
                      {
                        type: ComponentType.Button,
                        custom_id: 'commands-next',
                        emoji: toComponentEmoji('Next'),
                        style: ButtonStyle.Secondary,
                      },
                    ],
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
      }
    });

    collector.once('end', async () => {
      await client.api.interactions
        .editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.Section,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content:
                        query !== null
                          ? `### Command Browser\n-# Search results for **${query}**`
                          : '### Command Browser\n-# Browse all available commands using pagination, or search for a specific command',
                    },
                  ],
                  accessory: {
                    type: ComponentType.Button,
                    custom_id: 'commands-search',
                    emoji: toComponentEmoji('Search'),
                    style: ButtonStyle.Secondary,
                    disabled: true,
                  },
                },
              ],
            },
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: result,
                },
                {
                  type: ComponentType.Separator,
                },
                {
                  type: ComponentType.TextDisplay,
                  content: `-# Page **${pages.pointer + 1}** of **${pages.length}**`,
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.Button,
                      custom_id: 'commands-prev',
                      emoji: toComponentEmoji('Previous'),
                      style: ButtonStyle.Secondary,
                      disabled: true,
                    },
                    ...(query !== null
                      ? ([
                          {
                            type: ComponentType.Button,
                            custom_id: 'commands-back',
                            emoji: toComponentEmoji('Home'),
                            style: ButtonStyle.Secondary,
                            disabled: true,
                          },
                        ] satisfies APIComponentInActionRow[])
                      : []),
                    {
                      type: ComponentType.Button,
                      custom_id: 'commands-next',
                      emoji: toComponentEmoji('Next'),
                      style: ButtonStyle.Secondary,
                      disabled: true,
                    },
                  ],
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => null);
    });
  },
});
