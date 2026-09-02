import {
  ApplicationCommandType,
  Client,
  ComponentType,
  GatewayDispatchEvents,
  InteractionType,
  MessageFlags,
  type APIApplicationCommandAutocompleteInteraction,
  type APIApplicationCommandInteraction,
  type APIApplicationCommandInteractionDataBooleanOption,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageApplicationCommandInteraction,
  type APIPrimaryEntryPointCommandInteraction,
  type APIUserApplicationCommandInteraction,
} from '@discordjs/core';
import createGatewayEvent from '../../builders/event';
import {
  TimestampStyle,
  type ApplicationCommand,
  type ChatInputCommand,
  type MessageContextMenuCommand,
  type PrimaryEntryPointCommand,
  type UserContextMenuCommand,
} from '../../types/types';
import env from '../../utils/env';
import { getChatInputOption, getCommandPath, parseCommandOptions } from '../../utils/utils';
import { emoji, hyperlink, timestamp } from '../../utils/markdown';
import { MESSAGE_BLOCK_REASONS, SUPPORT } from '../constants';
import { redis } from '../../utils/redis';
import { commands } from '../../builders/command';
import { checkCooldown } from '../../utils/cooldown';
import { collectors } from '../../builders/collector';

createGatewayEvent({
  event: GatewayDispatchEvents.InteractionCreate,
  async run(interaction, client) {
    console.log(
      `received interaction: ${interaction.id} (${InteractionType[interaction.type]}) from ${interaction.user?.username ?? interaction.member?.user.username} (${interaction.user?.id ?? interaction.member?.user.id})`,
    );

    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
        await handleApplicationCommand(interaction, client);
        break;
      case InteractionType.ApplicationCommandAutocomplete:
        await handleChatInputCommandAutocomplete(interaction, client);
        break;
      case InteractionType.MessageComponent:
      case InteractionType.ModalSubmit:
        collectors.forEach((collector) => collector.collect(interaction));
        break;
      default:
        return console.log('unknown interaction type', interaction.type);
    }
  },
});

async function handleApplicationCommand(interaction: APIApplicationCommandInteraction, client: Client) {
  const command = commands.get(interaction.data.name) as ApplicationCommand;

  if (!command) {
    return;
  }

  const devIds = env.get('dev_ids', true)!.toArray();

  if (
    'dev' in command &&
    command.dev === true &&
    !devIds.includes(interaction.user?.id ?? interaction.member?.user.id)
  ) {
    return;
  }

  switch (interaction.data.type) {
    case ApplicationCommandType.ChatInput: {
      const chatInput = command as ChatInputCommand;

      const ephemeral =
        (
          getChatInputOption(
            interaction.data.options ?? [],
            'ephemeral',
          ) as APIApplicationCommandInteractionDataBooleanOption
        )?.value === true;

      if (chatInput.acknowledge === true) {
        await client.api.interactions.defer(interaction.id, interaction.token, {
          flags: chatInput.ephemeral || ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      }

      const expiration = checkCooldown(
        interaction.data.name,
        (interaction.user?.id ?? interaction.member?.user.id)!,
        chatInput.cooldown,
      );

      if (expiration) {
        if (chatInput.acknowledge) {
          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Exclamation')} Please wait! You're on cooldown for </${interaction.data.name}:${interaction.data.id}>. You can use this command again ${timestamp(expiration, TimestampStyle.RelativeTime)}.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        } else {
          await client.api.interactions.reply(interaction.id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Exclamation')} Please wait! You're on cooldown for </${interaction.data.name}:${interaction.data.id}>. You can use this command again ${timestamp(expiration, TimestampStyle.RelativeTime)}.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }

        return;
      }

      try {
        await chatInput.run(
          interaction as APIChatInputApplicationCommandInteraction,
          parseCommandOptions(interaction as APIChatInputApplicationCommandInteraction),
          client,
        );
      } catch (error) {
        const code = (error as any).code;
        const err = MESSAGE_BLOCK_REASONS[code as keyof typeof MESSAGE_BLOCK_REASONS];

        if (err) {
          if (chatInput.acknowledge)
            await client.api.interactions.deleteReply(interaction.application_id, interaction.token);

          await client.api.interactions.followUp(interaction.application_id, interaction.token, {
            content: `-# </${interaction.data.name}:${interaction.data.id}> was blocked due to ${hyperlink(err.article, err.reason)}. Please try again with **ephemeral** enabled.`,
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        console.error(`Command ${interaction.data.name} encountered an error:`, error);

        if (chatInput.acknowledge) {
          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Wrong')} ${error instanceof Error ? error.message : String(error)}\n-# If you believe this is a bug, please report it in our **${hyperlink(SUPPORT, 'support server', '', false)}**.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        } else {
          await client.api.interactions.reply(interaction.id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Wrong')} ${error instanceof Error ? error.message : String(error)}\n-# If you believe this is a bug, please report it in our **${hyperlink(SUPPORT, 'support server', '', false)}**.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }

        return;
      }

      break;
    }
    case ApplicationCommandType.Message: {
      const messageContext = command as MessageContextMenuCommand;

      if (messageContext.acknowledge) {
        await client.api.interactions.defer(interaction.id, interaction.token, {
          flags: messageContext.ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      }

      const expiration = checkCooldown(
        interaction.data.name,
        (interaction.user?.id ?? interaction.member?.user.id)!,
        messageContext.cooldown,
      );

      if (expiration) {
        if (messageContext.acknowledge) {
          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Exclamation')} Please wait! You're on cooldown for </${interaction.data.name}:${interaction.data.id}>. You can use this command again ${timestamp(expiration, TimestampStyle.RelativeTime)}.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        } else {
          await client.api.interactions.reply(interaction.id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Exclamation')} Please wait! You're on cooldown for </${interaction.data.name}:${interaction.data.id}>. You can use this command again ${timestamp(expiration, TimestampStyle.RelativeTime)}.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }

        return;
      }

      try {
        await messageContext.run(interaction as APIMessageApplicationCommandInteraction, client);
      } catch (error) {
        const code = (error as any).code;
        const err = MESSAGE_BLOCK_REASONS[code as keyof typeof MESSAGE_BLOCK_REASONS];

        if (err) {
          if (messageContext.acknowledge)
            await client.api.interactions.deleteReply(interaction.application_id, interaction.token);

          await client.api.interactions.followUp(interaction.application_id, interaction.token, {
            content: `-# </${interaction.data.name}:${interaction.data.id}> was blocked due to ${hyperlink(err.article, err.reason)}.`,
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        console.error(`Command ${interaction.data.name} encountered an error:`, error);

        if (messageContext.acknowledge) {
          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Wrong')} ${error instanceof Error ? error.message : String(error)}\n-# If you believe this is a bug, please report it in our **${hyperlink(SUPPORT, 'support server', '', false)}**.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        } else {
          await client.api.interactions.reply(interaction.id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Wrong')} ${error instanceof Error ? error.message : String(error)}\n-# If you believe this is a bug, please report it in our **${hyperlink(SUPPORT, 'support server', '', false)}**.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }

        return;
      }

      break;
    }
    case ApplicationCommandType.User: {
      const userContext = command as UserContextMenuCommand;

      if (userContext.acknowledge) {
        await client.api.interactions.defer(interaction.id, interaction.token, {
          flags: userContext.ephemeral ? MessageFlags.Ephemeral : undefined,
        });
      }

      const expiration = checkCooldown(
        interaction.data.name,
        (interaction.user?.id ?? interaction.member?.user.id)!,
        userContext.cooldown,
      );

      if (expiration) {
        if (userContext.acknowledge) {
          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Exclamation')} Please wait! You're on cooldown for </${interaction.data.name}:${interaction.data.id}>. You can use this command again ${timestamp(expiration, TimestampStyle.RelativeTime)}.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2,
          });
        } else {
          await client.api.interactions.reply(interaction.id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Exclamation')} Please wait! You're on cooldown for </${interaction.data.name}:${interaction.data.id}>. You can use this command again ${timestamp(expiration, TimestampStyle.RelativeTime)}.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }

        return;
      }
      try {
        await userContext.run(interaction as APIUserApplicationCommandInteraction, client);
      } catch (error) {
        const code = (error as any).code;
        const err = MESSAGE_BLOCK_REASONS[code as keyof typeof MESSAGE_BLOCK_REASONS];

        if (err) {
          if (userContext.acknowledge)
            await client.api.interactions.deleteReply(interaction.application_id, interaction.token);

          await client.api.interactions.followUp(interaction.application_id, interaction.token, {
            content: `-# </${interaction.data.name}:${interaction.data.id}> was blocked due to ${hyperlink(err.article, err.reason)}.`,
            flags: MessageFlags.Ephemeral,
          });

          return;
        }

        console.error(`Command ${interaction.data.name} encountered an error:`, error);

        if (userContext.acknowledge) {
          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Wrong')} ${error instanceof Error ? error.message : String(error)}\n-# If you believe this is a bug, please report it in our **${hyperlink(SUPPORT, 'support server', '', false)}**.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        } else {
          await client.api.interactions.reply(interaction.id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Wrong')} ${error instanceof Error ? error.message : String(error)}\n-# If you believe this is a bug, please report it in our **${hyperlink(SUPPORT, 'support server', '', false)}**.`,
                  },
                ],
              },
            ],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }

        return;
      }

      break;
    }
    case ApplicationCommandType.PrimaryEntryPoint: {
      const primaryEntryPoint = command as PrimaryEntryPointCommand;

      if (primaryEntryPoint.run) {
        try {
          await primaryEntryPoint.run(interaction as APIPrimaryEntryPointCommandInteraction, client);
        } catch (error) {
          console.error(`Command ${interaction.data.name} encountered an error:`, error);
        }
      }

      break;
    }
  }

  // analytics
  const now = Temporal.Now.zonedDateTimeISO('America/Sao_Paulo');

  const analyticsDate = now.hour < 21 ? now.subtract({ days: 1 }) : now;

  const day = analyticsDate.toPlainDate().toString();
  const hour = String(now.hour).padStart(2, '0');
  const minute = String(now.minute).padStart(2, '0');

  let nextReset = now.with({
    hour: 21,
    minute: 0,
    second: 0,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });

  if (Temporal.ZonedDateTime.compare(now, nextReset) >= 0) {
    nextReset = nextReset.add({ days: 1 });
  }

  const secondsUntilReset = Math.ceil((nextReset.epochMilliseconds - now.epochMilliseconds) / 1000);

  const globalKeys = [
    `analytics:commands:day:${day}`,
    `analytics:commands:hour:${day}:${hour}`,
    `analytics:commands:minute:${day}:${hour}:${minute}`,
  ];

  for (const key of globalKeys) {
    const exists = await redis.exists(key);

    await redis.incr(key);

    if (!exists) {
      await redis.expire(key, secondsUntilReset);
    }
  }

  const commandPath = [
    interaction.data.name,
    'options' in interaction.data ? getCommandPath(interaction.data.options) : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  const commandKey = `analytics:commands:usage:${interaction.data.id}:day:${day}`;

  const exists = await redis.exists(commandKey);

  if (!exists) {
    await redis.hSet(commandKey, {
      id: interaction.data.id,
      name: interaction.data.name,
      path: commandPath,
      uses: '0',
    });

    await redis.expire(commandKey, secondsUntilReset);
  }

  await redis.hIncrBy(commandKey, 'uses', 1);
}

async function handleChatInputCommandAutocomplete(
  interaction: APIApplicationCommandAutocompleteInteraction,
  client: Client,
) {
  const command = commands.get(interaction.data.name) as ChatInputCommand;

  if (!command || !command.autocomplete) {
    return;
  }

  try {
    await command.autocomplete(interaction, client);
  } catch (error) {
    console.error(`Autocomplete for command ${interaction.data.name} encountered an error:`, error);
  }
}
