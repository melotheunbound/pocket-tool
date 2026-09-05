import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  TextInputStyle,
  type APIMessageComponentButtonInteraction,
  type APIModalSubmitInteraction,
  type APIModalSubmitTextInputComponent,
  type ModalSubmitLabelComponent,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import { getShardIdForGuildId, msToReadableTime, toComponentEmoji } from '../../../utils/utils';
import { emoji, timestamp } from '../../../utils/markdown';
import { TimestampStyle } from '../../../types/types';
import { INVITE, SUPPORT } from '../../constants';
import { redis } from '../../../utils/redis';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'debug',
  description: 'View stats about Pocket Tool',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, options, client) {
    const shards = client.gateway.shards.size;
    let shardId = interaction.guild_id ? getShardIdForGuildId(interaction.guild_id, shards) : 0;
    let shard = client.gateway.shards.get(shardId)!;
    const app = await client.api.applications.getCurrent();

    const now = Temporal.Now.zonedDateTimeISO('America/Sao_Paulo');

    const analyticsDate = now.hour < 21 ? now.subtract({ days: 1 }) : now;

    const day = analyticsDate.toPlainDate().toString();
    const hour = String(now.hour).padStart(2, '0');
    const minute = String(now.minute).padStart(2, '0');

    const today = (await redis.get(`analytics:commands:day:${day}`)) ?? '0';

    const lastHour = (await redis.get(`analytics:commands:hour:${day}:${hour}`)) ?? '0';

    const lastMinute = (await redis.get(`analytics:commands:minute:${day}:${hour}:${minute}`)) ?? '0';

    const commandsUsage: {
      id: string;
      name: string;
      uses: string;
    }[] = [];

    for await (const keys of redis.scanIterator({
      MATCH: `analytics:commands:usage:*:day:${day}`,
      COUNT: 100,
    })) {
      for (const key of keys) {
        const data = await redis.hGetAll(key);

        if (!data.id || !data.path || !data.uses) continue;

        commandsUsage.push({
          id: data.id,
          name: data.path,
          uses: data.uses,
        });
      }
    }

    const topCommands = commandsUsage
      .sort((a, b) => Number(b.uses) - Number(a.uses))
      .slice(0, 5)
      .map((command) => `> </${command.name}:${command.id}>: **${Number(command.uses).toLocaleString('en-US')} uses**`)
      .join('\n');

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
                  content: `### Shard Browser\n-# Enter a server ID to view its shard information. Currently on shard **${shardId}/${shards}**`,
                },
              ],
              accessory: {
                type: ComponentType.Button,
                custom_id: 'shard-search',
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
              content: `-# **Shard #${shardId}:**\n> Latency: **${shard.ping}**\n> Uptime: **${msToReadableTime(Temporal.Now.instant().epochMilliseconds - shard.uptime!)} (${timestamp(shard.uptime!, TimestampStyle.LongDateShortTime)})**\n> User Installs: **${app.approximate_user_install_count}**\n> Servers: **${app.approximate_guild_count}**\n-# **Today's Command Usage:**\n> Today: **${today}**\n> Last Hour: **${lastHour}**\n> Last Minute: **${lastMinute}**\n-# **Today's Top Commands:**\n${topCommands}`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: 'Authorize',
                  emoji: toComponentEmoji('Link'),
                  url: INVITE,
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  label: 'Support Server',
                  emoji: toComponentEmoji('Discord'),
                  url: SUPPORT,
                  style: ButtonStyle.Link,
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
      key: 'shard-browser',
      filter: (i) =>
        i.message?.id === response.id &&
        (i.user?.id ?? i.member?.user.id) === (interaction.user?.id ?? interaction.member?.user.id),
      duration: 5 * 60 * 1000,
    });

    collector.on('collect', async (i) => {
      switch (i.data.custom_id) {
        case 'shard-search': {
          await client.api.interactions.createModal(i.id, i.token, {
            title: 'Shard Search',
            custom_id: 'shard-search-modal',
            components: [
              {
                type: ComponentType.Label,
                label: "Find your server's shard by ID",
                component: {
                  type: ComponentType.TextInput,
                  custom_id: 'commands-search-input',
                  placeholder: "Enter your server's ID here",
                  style: TextInputStyle.Short,
                  required: true,
                },
              },
            ],
          });

          break;
        }
        case 'shard-search-modal': {
          await client.api.interactions.deferMessageUpdate(i.id, i.token);

          const guildId =
            (i as APIModalSubmitInteraction).data.components?.[0]?.type === ComponentType.Label
              ? (
                  ((i as APIModalSubmitInteraction).data.components[0] as ModalSubmitLabelComponent)
                    .component as APIModalSubmitTextInputComponent
                ).value
              : undefined;

          const regex = /^\d{17,20}$/;

          if (!guildId || !regex.test(guildId)) {
            await client.api.interactions.followUp(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: `${emoji('Exclamation')} Please provide a valid guild ID.`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });

            return;
          }

          const guild = await client.api.guilds.get(guildId).catch(() => null);

          if (!guild) {
            await client.api.interactions.followUp(i.application_id, i.token, {
              components: [
                {
                  type: ComponentType.Container,
                  components: [
                    {
                      type: ComponentType.TextDisplay,
                      content: `${emoji('Exclamation')} I couldn't find a guild with that ID.`,
                    },
                  ],
                },
              ],
              flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });

            return;
          }

          shardId = getShardIdForGuildId(guild.id, shards);
          shard = client.gateway.shards.get(shardId)!;

          await client.api.interactions.editReply(interaction.application_id, interaction.token, {
            components: [
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `### Shard Browser\n-# Enter a server ID to view its shard information. Currently on shard **${shardId}/${shards}**`,
                      },
                    ],
                    accessory: {
                      type: ComponentType.Button,
                      custom_id: 'shard-search',
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
                    content: `-# **Shard #${shardId}**\n> Latency: **${shard.ping}**\n> Uptime: **${msToReadableTime(Temporal.Now.instant().epochMilliseconds - shard.uptime!)} (${timestamp(shard.uptime!, TimestampStyle.LongDateShortTime)})**\n> User Installs: **${app.approximate_user_install_count}**\n> Servers: **${app.approximate_guild_count}**\n-# **Today's Command Usage:**\n> Today: **${today}**\n> Last Hour: **${lastHour}**\n> Last Minute: **${lastMinute}**\n-# **Today's Top Commands:**\n${topCommands}`,
                  },
                  {
                    type: ComponentType.Separator,
                  },
                  {
                    type: ComponentType.ActionRow,
                    components: [
                      {
                        type: ComponentType.Button,
                        label: 'Authorize',
                        emoji: toComponentEmoji('Link'),
                        url: INVITE,
                        style: ButtonStyle.Link,
                      },
                      {
                        type: ComponentType.Button,
                        label: 'Support Server',
                        emoji: toComponentEmoji('Discord'),
                        url: SUPPORT,
                        style: ButtonStyle.Link,
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
                      content: `### Shard Browser\n-# Enter a server ID to view its shard information. Currently on shard **${shardId}/${shards}**`,
                    },
                  ],
                  accessory: {
                    type: ComponentType.Button,
                    custom_id: 'shard-search',
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
                  content: `-# **Shard #${shardId}**\n> Latency: **${shard.ping}**\n> Uptime: **${msToReadableTime(Temporal.Now.instant().epochMilliseconds - shard.uptime!)} (${timestamp(shard.uptime!, TimestampStyle.LongDateShortTime)})**\n> User Installs: **${app.approximate_user_install_count}**\n> Servers: **${app.approximate_guild_count}**\n-# **Today's Command Usage:**\n> Today: **${today}**\n> Last Hour: **${lastHour}**\n> Last Minute: **${lastMinute}**\n-# **Today's Top Commands:**\n${topCommands}`,
                },
                {
                  type: ComponentType.Separator,
                },
                {
                  type: ComponentType.ActionRow,
                  components: [
                    {
                      type: ComponentType.Button,
                      label: 'Authorize',
                      emoji: toComponentEmoji('Link'),
                      url: INVITE,
                      style: ButtonStyle.Link,
                    },
                    {
                      type: ComponentType.Button,
                      label: 'Support Server',
                      emoji: toComponentEmoji('Discord'),
                      url: SUPPORT,
                      style: ButtonStyle.Link,
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
