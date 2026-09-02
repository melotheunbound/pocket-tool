import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  StickerFormatType,
  TextInputStyle,
  type APIMessage,
  type APIMessageComponentButtonInteraction,
  type APIMessageComponentSelectMenuInteraction,
  type APIModalSubmitInteraction,
  type APIModalSubmitTextInputComponent,
  type ModalSubmitLabelComponent,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import { cdn, emoji, hyperlink } from '../../../utils/markdown';
import type { ColorKey, EffectKey, FontKey, FontSizeKey } from '../../../utils/card';
import { Collection } from '@discordjs/collection';
import { makeRequest } from '../../../utils/request';
import { RequestMethod, ResponseType } from '../../../types/types';
import { toComponentEmoji } from '../../../utils/utils';
import { isHex, shuffle, type Hexadecimal } from '@tolga1452/toolbox.js';
import sharp from 'sharp';

type Session = {
  avatar: Buffer;
  font: FontKey;
  fontSize: FontSizeKey | number;
  color: ColorKey | Hexadecimal;
  effects: EffectKey[];
  content: string;
  emojis: Record<string, Buffer>;
  stickers: Buffer[];
};

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Quote This Message',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, client) {
    const message = interaction.data.resolved.messages[interaction.data.target_id];

    if (message?.message_snapshots && message.message_snapshots.length > 0) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Forwarded messages are currently unsupported.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (!message || (!message.content.trim() && !message.sticker_items?.length)) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please select a message containing text or stickers to quote.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const { CARD_COLORS, CARD_EFFECTS, CARD_FONTS, FONT_SIZES, renderQuoteCard } = await import('../../../utils/card');

    const randomizeSession = (session: Session): Session => {
      const random = <T extends Record<string, unknown>>(obj: T): keyof T => {
        const keys = Object.keys(obj) as (keyof T)[];
        return keys[Math.floor(Math.random() * keys.length)]!;
      };

      session.font = random(CARD_FONTS) as FontKey;
      session.fontSize = random(FONT_SIZES) as FontSizeKey;
      session.color = random(CARD_COLORS) as ColorKey;
      session.effects = shuffle(Object.keys(CARD_EFFECTS) as EffectKey[]).slice(0, Math.floor(Math.random() * 4));

      return session;
    };

    const avatar = await makeRequest(
      message.author.avatar
        ? cdn(`/avatars/${message.author.id}/${message.author.avatar}`, 4096, 'webp', false)
        : cdn(`/embed/avatars/${Number(BigInt(message.author.id) >> 22n) % 6}`, 4096, 'png'),
      {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      },
    );

    const sessions = new Collection<string, Session>();

    const quote = await resolveQuoteContent(message);

    sessions.set(interaction.token, {
      avatar,
      font: 'modern',
      fontSize: 'auto',
      color: 'auto',
      effects: [],
      content: quote.content,
      emojis: quote.emojis,
      stickers: quote.stickers,
    });

    const session = sessions.get(interaction.token);

    if (!session) {
      return;
    }

    let card = await renderQuoteCard({
      avatar: session.avatar,
      quote: quote.content,
      emojis: quote.emojis,
      stickers: quote.stickers,
      credit: message.author.global_name ?? message.author.username,
      mention: `@${message.author.username}`,
      font: session.font,
      fontSize: session.fontSize,
      color: session.color,
      effects: session.effects,
    });

    const response = await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${interaction.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
        },
        {
          type: ComponentType.MediaGallery,
          items: [
            {
              media: {
                url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
              },
            },
          ],
        },
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
            },
          ],
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              custom_id: 'quote-font',
              placeholder: 'Choose a Font',
              options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                emoji: toComponentEmoji(item.emoji),
                label: item.label,
                description: item.description,
                value,
                default: value === session.font,
              })),
            },
          ],
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              custom_id: 'quote-size',
              placeholder: 'Choose a Size',
              options: [
                ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                  ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                  label: item.label,
                  description: item.description,
                  value,
                  default: value === session.fontSize,
                })),
                {
                  emoji: toComponentEmoji('CustomFontSize'),
                  label: 'Custom Font Size',
                  description: 'Enter a custom font size',
                  value: 'custom',
                },
              ],
            },
          ],
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              custom_id: 'quote-color',
              placeholder: 'Choose a Color',
              options: [
                ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                  emoji: toComponentEmoji(item.emoji),
                  label: item.label,
                  description: item.description,
                  value,
                  default: value === session.color,
                })),
                {
                  emoji: toComponentEmoji('CustomColor'),
                  label: 'Custom Text Color',
                  description: 'Enter a custom color',
                  value: 'custom',
                },
              ],
            },
          ],
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.StringSelect,
              custom_id: 'quote-effects',
              placeholder: 'Choose Some Effects!',
              min_values: 0,
              max_values: Object.keys(CARD_EFFECTS).length,
              options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                emoji: toComponentEmoji(item.emoji),
                label: item.label,
                description: item.description,
                value,
              })),
            },
          ],
        },
        {
          type: ComponentType.ActionRow,
          components: [
            {
              type: ComponentType.Button,
              custom_id: 'random',
              label: 'Surprise Me!',
              emoji: toComponentEmoji('Spark'),
              style: ButtonStyle.Secondary,
            },
          ],
        },
      ],
      files: [
        {
          name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
          data: card,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = client.api.interactions.createCollector<
      APIMessageComponentSelectMenuInteraction | APIMessageComponentButtonInteraction | APIModalSubmitInteraction
    >({
      key: 'quote',
      filter: (i) =>
        i.message?.id === response.id &&
        (i.user?.id ?? i.member?.user.id) === (interaction.user?.id ?? interaction.member?.user.id),
      duration: 5 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      switch (i.data.custom_id) {
        case 'quote-font': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          const font =
            (i as APIMessageComponentSelectMenuInteraction).data.component_type === ComponentType.StringSelect &&
            (i as APIMessageComponentSelectMenuInteraction).data.values[0];

          session.font = font as FontKey;

          card = await renderQuoteCard({
            avatar: session.avatar,
            quote: session.content,
            emojis: session.emojis,
            stickers: session.stickers,
            credit: message.author.global_name ?? message.author.username,
            mention: `@${message.author.username}`,
            font: session.font,
            fontSize: session.fontSize,
            color: session.color,
            effects: session.effects,
          });

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
              },
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content:
                      '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-font',
                    placeholder: 'Choose a Font',
                    options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.font,
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-size',
                    placeholder: 'Choose a Size',
                    options: [
                      ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                        ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.fontSize,
                      })),
                      {
                        emoji: toComponentEmoji('CustomFontSize'),
                        label: 'Custom Font Size',
                        description: 'Enter a custom font size',
                        value: 'custom',
                      },
                      ...(!(session.fontSize in FONT_SIZES)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Size: ${session.fontSize}px`,
                              description: 'Currently selected custom size',
                              value: String(session.fontSize),
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-color',
                    placeholder: 'Choose a Color',
                    options: [
                      ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.color,
                      })),
                      {
                        emoji: toComponentEmoji('CustomColor'),
                        label: 'Custom Text Color',
                        description: 'Enter a custom color',
                        value: 'custom',
                      },
                      ...(!(session.color in CARD_COLORS)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Color: ${session.color}`,
                              description: 'Currently selected custom color',
                              value: session.color,
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-effects',
                    placeholder: 'Choose Some Effects!',
                    min_values: 0,
                    max_values: Object.keys(CARD_EFFECTS).length,
                    options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: session.effects.includes(value as EffectKey),
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    custom_id: 'random',
                    label: 'Surprise Me!',
                    emoji: toComponentEmoji('Spark'),
                    style: ButtonStyle.Secondary,
                  },
                ],
              },
            ],
            files: [
              {
                name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                data: card,
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'quote-size': {
          const size =
            (i as APIMessageComponentSelectMenuInteraction).data.component_type === ComponentType.StringSelect &&
            (i as APIMessageComponentSelectMenuInteraction).data.values[0];

          if (size === 'custom') {
            await client.api.interactions.createModal(i.id, i.token, {
              title: 'Custom Font Size',
              custom_id: 'custom-font-size',
              components: [
                {
                  type: ComponentType.Label,
                  label: 'Enter a custom font size',
                  component: {
                    type: ComponentType.TextInput,
                    custom_id: 'custom-font-size-input',
                    placeholder: 'Use a whole number between 20px and 100px',
                    style: TextInputStyle.Short,
                    required: true,
                  },
                },
              ],
            });
          } else {
            await client.api.interactions.deferMessageUpdate(i.id, i.token);

            session.fontSize = size as FontSizeKey;

            card = await renderQuoteCard({
              avatar: session.avatar,
              quote: session.content,
              emojis: session.emojis,
              stickers: session.stickers,
              credit: message.author.global_name ?? message.author.username,
              mention: `@${message.author.username}`,
              font: session.font,
              fontSize: session.fontSize,
              color: session.color,
              effects: session.effects,
            });

            await client.api.interactions.editReply(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
                },
                {
                  type: ComponentType.MediaGallery,
                  items: [
                    {
                      media: {
                        url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                      },
                    },
                  ],
                },
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content:
                        '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-font',
                      placeholder: 'Choose a Font',
                      options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.font,
                      })),
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-size',
                      placeholder: 'Choose a Size',
                      options: [
                        ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                          ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                          label: item.label,
                          description: item.description,
                          value,
                          default: value === session.fontSize,
                        })),
                        {
                          emoji: toComponentEmoji('CustomFontSize'),
                          label: 'Custom Font Size',
                          description: 'Enter a custom font size',
                          value: 'custom',
                        },
                        ...(!(session.fontSize in FONT_SIZES)
                          ? [
                              {
                                emoji: toComponentEmoji('Selected'),
                                label: `Custom Text Size: ${session.fontSize}px`,
                                description: 'Currently selected custom size',
                                value: String(session.fontSize),
                                default: true,
                              },
                            ]
                          : []),
                      ],
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-color',
                      placeholder: 'Choose a Color',
                      options: [
                        ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                          emoji: toComponentEmoji(item.emoji),
                          label: item.label,
                          description: item.description,
                          value,
                          default: value === session.color,
                        })),
                        {
                          emoji: toComponentEmoji('CustomColor'),
                          label: 'Custom Text Color',
                          description: 'Enter a custom color',
                          value: 'custom',
                        },
                        ...(!(session.color in CARD_COLORS)
                          ? [
                              {
                                emoji: toComponentEmoji('Selected'),
                                label: `Custom Text Color: ${session.color}`,
                                description: 'Currently selected custom color',
                                value: session.color,
                                default: true,
                              },
                            ]
                          : []),
                      ],
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-effects',
                      placeholder: 'Choose Some Effects!',
                      min_values: 0,
                      max_values: Object.keys(CARD_EFFECTS).length,
                      options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: session.effects.includes(value as EffectKey),
                      })),
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.Button,
                      custom_id: 'random',
                      label: 'Surprise Me!',
                      emoji: toComponentEmoji('Spark'),
                      style: ButtonStyle.Secondary,
                    },
                  ],
                },
              ],
              files: [
                {
                  name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                  data: card,
                },
              ],
              flags: MessageFlags.IsComponentsV2,
            });
          }

          break;
        }
        case 'quote-color': {
          const color =
            (i as APIMessageComponentSelectMenuInteraction).data.component_type === ComponentType.StringSelect &&
            (i as APIMessageComponentSelectMenuInteraction).data.values[0];

          if (color === 'custom') {
            await client.api.interactions.createModal(i.id, i.token, {
              title: 'Custom Text Color',
              custom_id: 'custom-color',
              components: [
                {
                  type: ComponentType.Label,
                  label: 'Enter a custom color',
                  component: {
                    type: ComponentType.TextInput,
                    custom_id: 'custom-color-input',
                    placeholder: 'Enter a hexadecimal color code',
                    style: TextInputStyle.Short,
                    required: true,
                    min_length: 1,
                    max_length: 7,
                  },
                },
              ],
            });
          } else {
            await client.api.interactions.deferMessageUpdate(i.id, i.token);

            session.color = color as ColorKey;

            card = await renderQuoteCard({
              avatar: session.avatar,
              quote: session.content,
              emojis: session.emojis,
              stickers: session.stickers,
              credit: message.author.global_name ?? message.author.username,
              mention: `@${message.author.username}`,
              font: session.font,
              fontSize: session.fontSize,
              color: session.color,
              effects: session.effects,
            });

            await client.api.interactions.editReply(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
                },
                {
                  type: ComponentType.MediaGallery,
                  items: [
                    {
                      media: {
                        url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                      },
                    },
                  ],
                },
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content:
                        '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-font',
                      placeholder: 'Choose a Font',
                      options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.font,
                      })),
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-size',
                      placeholder: 'Choose a Size',
                      options: [
                        ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                          ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                          label: item.label,
                          description: item.description,
                          value,
                          default: value === session.fontSize,
                        })),
                        {
                          emoji: toComponentEmoji('CustomFontSize'),
                          label: 'Custom Font Size',
                          description: 'Enter a custom font size',
                          value: 'custom',
                        },
                        ...(!(session.fontSize in FONT_SIZES)
                          ? [
                              {
                                emoji: toComponentEmoji('Selected'),
                                label: `Custom Text Size: ${session.fontSize}px`,
                                description: 'Currently selected custom size',
                                value: String(session.fontSize),
                                default: true,
                              },
                            ]
                          : []),
                      ],
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-color',
                      placeholder: 'Choose a Color',
                      options: [
                        ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                          emoji: toComponentEmoji(item.emoji),
                          label: item.label,
                          description: item.description,
                          value,
                          default: value === session.color,
                        })),
                        {
                          emoji: toComponentEmoji('CustomColor'),
                          label: 'Custom Text Color',
                          description: 'Enter a custom color',
                          value: 'custom',
                        },
                        ...(!(session.color in CARD_COLORS)
                          ? [
                              {
                                emoji: toComponentEmoji('Selected'),
                                label: `Custom Text Color: ${session.color}`,
                                description: 'Currently selected custom color',
                                value: session.color,
                                default: true,
                              },
                            ]
                          : []),
                      ],
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.StringSelect,
                      custom_id: 'quote-effects',
                      placeholder: 'Choose Some Effects!',
                      min_values: 0,
                      max_values: Object.keys(CARD_EFFECTS).length,
                      options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: session.effects.includes(value as EffectKey),
                      })),
                    },
                  ],
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.Button,
                      custom_id: 'random',
                      label: 'Surprise Me!',
                      emoji: toComponentEmoji('Spark'),
                      style: ButtonStyle.Secondary,
                    },
                  ],
                },
              ],
              files: [
                {
                  name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                  data: card,
                },
              ],
              flags: MessageFlags.IsComponentsV2,
            });
          }

          break;
        }
        case 'quote-effects': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          const effects =
            (i as APIMessageComponentSelectMenuInteraction).data.component_type === ComponentType.StringSelect &&
            (i as APIMessageComponentSelectMenuInteraction).data.values;

          session.effects = effects as EffectKey[];

          card = await renderQuoteCard({
            avatar: session.avatar,
            quote: session.content,
            emojis: session.emojis,
            stickers: session.stickers,
            credit: message.author.global_name ?? message.author.username,
            mention: `@${message.author.username}`,
            font: session.font,
            fontSize: session.fontSize,
            color: session.color,
            effects: session.effects,
          });

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
              },
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content:
                      '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-font',
                    placeholder: 'Choose a Font',
                    options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.font,
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-size',
                    placeholder: 'Choose a Size',
                    options: [
                      ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                        ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.fontSize,
                      })),
                      {
                        emoji: toComponentEmoji('CustomFontSize'),
                        label: 'Custom Font Size',
                        description: 'Enter a custom font size',
                        value: 'custom',
                      },
                      ...(!(session.fontSize in FONT_SIZES)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Size: ${session.fontSize}px`,
                              description: 'Currently selected custom size',
                              value: String(session.fontSize),
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-color',
                    placeholder: 'Choose a Color',
                    options: [
                      ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.color,
                      })),
                      {
                        emoji: toComponentEmoji('CustomColor'),
                        label: 'Custom Text Color',
                        description: 'Enter a custom color',
                        value: 'custom',
                      },
                      ...(!(session.color in CARD_COLORS)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Color: ${session.color}`,
                              description: 'Currently selected custom color',
                              value: session.color,
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-effects',
                    placeholder: 'Choose Some Effects!',
                    min_values: 0,
                    max_values: Object.keys(CARD_EFFECTS).length,
                    options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: session.effects.includes(value as EffectKey),
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    custom_id: 'random',
                    label: 'Surprise Me!',
                    emoji: toComponentEmoji('Spark'),
                    style: ButtonStyle.Secondary,
                  },
                ],
              },
            ],
            files: [
              {
                name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                data: card,
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'random': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          Object.assign(session, randomizeSession(session));

          card = await renderQuoteCard({
            avatar: session.avatar,
            quote: session.content,
            emojis: session.emojis,
            stickers: session.stickers,
            credit: message.author.global_name ?? message.author.username,
            mention: `@${message.author.username}`,
            font: session.font,
            fontSize: session.fontSize,
            color: session.color,
            effects: session.effects,
          });

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
              },
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content:
                      '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-font',
                    placeholder: 'Choose a Font',
                    options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.font,
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-size',
                    placeholder: 'Choose a Size',
                    options: [
                      ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                        ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.fontSize,
                      })),
                      {
                        emoji: toComponentEmoji('CustomFontSize'),
                        label: 'Custom Font Size',
                        description: 'Enter a custom font size',
                        value: 'custom',
                      },
                      ...(!(session.fontSize in FONT_SIZES)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Size: ${session.fontSize}px`,
                              description: 'Currently selected custom size',
                              value: String(session.fontSize),
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-color',
                    placeholder: 'Choose a Color',
                    options: [
                      ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.color,
                      })),
                      {
                        emoji: toComponentEmoji('CustomColor'),
                        label: 'Custom Text Color',
                        description: 'Enter a custom color',
                        value: 'custom',
                      },
                      ...(!(session.color in CARD_COLORS)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Color: ${session.color}`,
                              description: 'Currently selected custom color',
                              value: session.color,
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-effects',
                    placeholder: 'Choose Some Effects!',
                    min_values: 0,
                    max_values: Object.keys(CARD_EFFECTS).length,
                    options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: session.effects.includes(value as EffectKey),
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    custom_id: 'random',
                    label: 'Surprise Me!',
                    emoji: toComponentEmoji('Spark'),
                    style: ButtonStyle.Secondary,
                  },
                ],
              },
            ],
            files: [
              {
                name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                data: card,
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'custom-font-size': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          const fontSize =
            (i as APIModalSubmitInteraction).data.components?.[0]?.type === ComponentType.Label
              ? parseInt(
                  (
                    ((i as APIModalSubmitInteraction).data.components[0] as ModalSubmitLabelComponent)
                      .component as APIModalSubmitTextInputComponent
                  ).value,
                  10,
                )
              : undefined;

          if (fontSize === undefined || Number.isNaN(fontSize) || fontSize < 20 || fontSize > 100) {
            await client.api.interactions.followUp(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: `${emoji('Exclamation')} Please provide a font size between 20px and 100px.`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });

            return;
          }

          session.fontSize = fontSize;

          card = await renderQuoteCard({
            avatar: session.avatar,
            quote: session.content,
            emojis: session.emojis,
            stickers: session.stickers,
            credit: message.author.global_name ?? message.author.username,
            mention: `@${message.author.username}`,
            font: session.font,
            fontSize: session.fontSize,
            color: session.color,
            effects: session.effects,
          });

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
              },
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content:
                      '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-font',
                    placeholder: 'Choose a Font',
                    options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.font,
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-size',
                    placeholder: 'Choose a Size',
                    options: [
                      ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                        ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.fontSize,
                      })),
                      {
                        emoji: toComponentEmoji('CustomFontSize'),
                        label: 'Custom Font Size',
                        description: 'Enter a custom font size',
                        value: 'custom',
                      },
                      ...(!(session.fontSize in FONT_SIZES)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Size: ${session.fontSize}px`,
                              description: 'Currently selected custom size',
                              value: String(session.fontSize),
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-color',
                    placeholder: 'Choose a Color',
                    options: [
                      ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.color,
                      })),
                      {
                        emoji: toComponentEmoji('CustomColor'),
                        label: 'Custom Text Color',
                        description: 'Enter a custom color',
                        value: 'custom',
                      },
                      ...(!(session.color in CARD_COLORS)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Color: ${session.color}`,
                              description: 'Currently selected custom color',
                              value: session.color,
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-effects',
                    placeholder: 'Choose Some Effects!',
                    min_values: 0,
                    max_values: Object.keys(CARD_EFFECTS).length,
                    options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: session.effects.includes(value as EffectKey),
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    custom_id: 'random',
                    label: 'Surprise Me!',
                    emoji: toComponentEmoji('Spark'),
                    style: ButtonStyle.Secondary,
                  },
                ],
              },
            ],
            files: [
              {
                name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                data: card,
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
        case 'custom-color': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          const color =
            (i as APIModalSubmitInteraction).data.components?.[0]?.type === ComponentType.Label
              ? (
                  ((i as APIModalSubmitInteraction).data.components[0] as ModalSubmitLabelComponent)
                    .component as APIModalSubmitTextInputComponent
                ).value
              : undefined;

          if (color === undefined || !isHex(color)) {
            await client.api.interactions.followUp(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: `${emoji('Exclamation')} Please provide a valid hexadecimal color code.`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });

            return;
          }

          session.color = color;

          card = await renderQuoteCard({
            avatar: session.avatar,
            quote: session.content,
            emojis: session.emojis,
            stickers: session.stickers,
            credit: message.author.global_name ?? message.author.username,
            mention: `@${message.author.username}`,
            font: session.font,
            fontSize: session.fontSize,
            color: session.color,
            effects: session.effects,
          });

          await client.api.interactions.editReply(i.application_id, i.token, {
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${i.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
              },
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                    },
                  },
                ],
              },
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content:
                      '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-font',
                    placeholder: 'Choose a Font',
                    options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.font,
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-size',
                    placeholder: 'Choose a Size',
                    options: [
                      ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                        ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.fontSize,
                      })),
                      {
                        emoji: toComponentEmoji('CustomFontSize'),
                        label: 'Custom Font Size',
                        description: 'Enter a custom font size',
                        value: 'custom',
                      },
                      ...(!(session.fontSize in FONT_SIZES)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Size: ${session.fontSize}px`,
                              description: 'Currently selected custom size',
                              value: String(session.fontSize),
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-color',
                    placeholder: 'Choose a Color',
                    options: [
                      ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                        emoji: toComponentEmoji(item.emoji),
                        label: item.label,
                        description: item.description,
                        value,
                        default: value === session.color,
                      })),
                      {
                        emoji: toComponentEmoji('CustomColor'),
                        label: 'Custom Text Color',
                        description: 'Enter a custom color',
                        value: 'custom',
                      },
                      ...(!(session.color in CARD_COLORS)
                        ? [
                            {
                              emoji: toComponentEmoji('Selected'),
                              label: `Custom Text Color: ${session.color}`,
                              description: 'Currently selected custom color',
                              value: session.color,
                              default: true,
                            },
                          ]
                        : []),
                    ],
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.StringSelect,
                    custom_id: 'quote-effects',
                    placeholder: 'Choose Some Effects!',
                    min_values: 0,
                    max_values: Object.keys(CARD_EFFECTS).length,
                    options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: session.effects.includes(value as EffectKey),
                    })),
                  },
                ],
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    custom_id: 'random',
                    label: 'Surprise Me!',
                    emoji: toComponentEmoji('Spark'),
                    style: ButtonStyle.Secondary,
                  },
                ],
              },
            ],
            files: [
              {
                name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                data: card,
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });

          break;
        }
      }
    });

    collector.on('end', async () => {
      sessions.delete(interaction.token);

      await client.api.interactions
        .editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `-# ${emoji('Quote')} ${hyperlink(`https://discord.com/channels/${interaction.guild_id ?? '@me'}/${message.channel_id}/${message.id}`, 'Jump to original message')}`,
            },
            {
              type: ComponentType.MediaGallery,
              items: [
                {
                  media: {
                    url: `attachment://quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
                  },
                },
              ],
            },
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: '### Quote Editor\n-# Use the menus below to customize your quote or generate a random card',
                },
              ],
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.StringSelect,
                  custom_id: 'quote-font',
                  placeholder: 'Choose a Font',
                  options: Object.entries(CARD_FONTS).map(([value, item]) => ({
                    emoji: toComponentEmoji(item.emoji),
                    label: item.label,
                    description: item.description,
                    value,
                    default: value === session.font,
                  })),
                  disabled: true,
                },
              ],
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.StringSelect,
                  custom_id: 'quote-size',
                  placeholder: 'Choose a Size',
                  options: [
                    ...Object.entries(FONT_SIZES).map(([value, item]) => ({
                      ...(value === session.fontSize ? { emoji: toComponentEmoji('Selected') } : {}),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.fontSize,
                    })),
                    {
                      emoji: toComponentEmoji('CustomFontSize'),
                      label: 'Custom Font Size',
                      description: 'Enter a custom font size',
                      value: 'custom',
                    },
                    ...(!(session.fontSize in FONT_SIZES)
                      ? [
                          {
                            emoji: toComponentEmoji('Selected'),
                            label: `Custom Text Size: ${session.fontSize}px`,
                            description: 'Currently selected custom size',
                            value: String(session.fontSize),
                          },
                        ]
                      : []),
                  ],
                  disabled: true,
                },
              ],
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.StringSelect,
                  custom_id: 'quote-color',
                  placeholder: 'Choose a Color',
                  options: [
                    ...Object.entries(CARD_COLORS).map(([value, item]) => ({
                      emoji: toComponentEmoji(item.emoji),
                      label: item.label,
                      description: item.description,
                      value,
                      default: value === session.color,
                    })),
                    {
                      emoji: toComponentEmoji('CustomColor'),
                      label: 'Custom Text Color',
                      description: 'Enter a custom color',
                      value: 'custom',
                    },
                    ...(!(session.color in CARD_COLORS)
                      ? [
                          {
                            emoji: toComponentEmoji('Selected'),
                            label: `Custom Text Color: ${session.color}`,
                            description: 'Currently selected custom color',
                            value: session.color,
                          },
                        ]
                      : []),
                  ],
                  disabled: true,
                },
              ],
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.StringSelect,
                  custom_id: 'quote-effects',
                  placeholder: 'Choose Some Effects!',
                  min_values: 0,
                  max_values: Object.keys(CARD_EFFECTS).length,
                  options: Object.entries(CARD_EFFECTS).map(([value, item]) => ({
                    emoji: toComponentEmoji(item.emoji),
                    label: item.label,
                    description: item.description,
                    value,
                    default: session.effects.includes(value as EffectKey),
                  })),
                  disabled: true,
                },
              ],
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  custom_id: 'random',
                  label: 'Surprise Me!',
                  emoji: toComponentEmoji('Spark'),
                  style: ButtonStyle.Secondary,
                  disabled: true,
                },
              ],
            },
          ],
          files: [
            {
              name: `quote.${session.effects.includes('gif') ? 'gif' : 'png'}`,
              data: card,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        })
        .catch(() => null);
    });
  },
});

async function resolveQuoteContent(message: APIMessage) {
  const content = message.content.trim();
  const mentions = message.mentions;

  const customEmojiRegex = /<a?:\w+:(\d+)>/g;

  const emojiIds = [...new Set([...content.matchAll(customEmojiRegex)].map((match) => match[1]!))];

  const emojis = Object.fromEntries(
    (
      await Promise.allSettled(
        emojiIds.map(async (id) => {
          const data = await makeRequest(cdn(`/emojis/${id}`, undefined, 'png', false), {
            method: RequestMethod.GET,
            response: ResponseType.BUFFER,
            timeout: 10_000,
          });

          return [id, data] as const;
        }),
      )
    ).flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
  );

  const parsedContent = content.replace(/<@!?(\d+)>/g, (_, id) => {
    const user = mentions?.find((user) => user.id === id);

    return user ? `@${user.global_name ?? user.username}` : '@unknown';
  });

  const resolvedStickers = await Promise.all(
    (message.sticker_items ?? []).map(async (sticker) => {
      const url =
        sticker.format_type === StickerFormatType.GIF
          ? `https://media.discordapp.net/stickers/${sticker.id}.gif`
          : cdn(
              `/stickers/${sticker.id}`,
              undefined,
              sticker.format_type === StickerFormatType.Lottie ? 'json' : 'png',
              false,
            );

      try {
        let data = await makeRequest(url, {
          method: RequestMethod.GET,
          response: ResponseType.BUFFER,
          timeout: 10_000,
        });

        if (sticker.format_type === StickerFormatType.Lottie) {
          const { createCanvas, LottieAnimation } = await import('@napi-rs/canvas');
          const animation = LottieAnimation.loadFromData(data);
          const canvas = createCanvas(320, 320);

          animation.seekFrame(0);
          animation.render(canvas.getContext('2d'), { x: 0, y: 0, width: 320, height: 320 });
          data = await canvas.encode('png');
        } else if (sticker.format_type === StickerFormatType.GIF) {
          data = await sharp(data, { animated: false }).png().toBuffer();
        }

        return { data };
      } catch {
        return { fallback: `[Sticker: ${sticker.name}]` };
      }
    }),
  );

  const stickerFallbacks = resolvedStickers.flatMap((sticker) => (sticker.fallback ? [sticker.fallback] : []));

  return {
    content: [parsedContent, ...stickerFallbacks].filter(Boolean).join('\n'),
    emojis,
    stickers: resolvedStickers.flatMap((sticker) => (sticker.data ? [sticker.data] : [])),
  };
}
