import { Collection } from '@discordjs/collection';
import type { BooleanChatInputOption, GatewayShard } from '../types/types';
import {
  ActivityType,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  GatewayDispatchEvents,
  GatewayIntentBits,
  PresenceUpdateStatus,
  Routes,
  type GatewayDispatchPayload,
  type RESTPutAPIApplicationCommandsJSONBody,
  type RESTPutAPIApplicationGuildCommandsJSONBody,
  type ToEventProps,
} from '@discordjs/core';
import { readDirectory, transformCommand } from '../utils/utils';
import path from 'path';
import { REST } from '@discordjs/rest';
import env from '../utils/env';
import { CompressionMethod, WebSocketManager, WebSocketShardEvents, WorkerShardingStrategy } from '@discordjs/ws';
import { scheduleReshardCheck } from '../crons/reshard';
import { events } from '../builders/event';
import { commands } from '../builders/command';
import createCollector from '../builders/collector';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

await readDirectory(path.join(process.cwd(), 'src', 'bot', 'commands'));
await readDirectory(path.join(process.cwd(), 'src', 'bot', 'events'));

const rest = new REST().setToken(env.get('token', true)!.toString());

const gateway = new WebSocketManager({
  token: env.get('token', true)!.toString(),
  intents: GatewayIntentBits.Guilds,
  shardCount: env.get('shard_count')?.toNumber() ?? null,
  rest,
  compression: CompressionMethod.ZlibNative,
  buildStrategy: (manager) =>
    new WorkerShardingStrategy(manager, {
      shardsPerWorker: env.get('shards_per_worker')?.toNumber() ?? 4,
    }),
});

// @ts-expect-error
const client = new Client({ rest, gateway });

// some sort of workaround to have extra utilities
client.gateway.shards = new Collection<number, GatewayShard>();

client.rest.ping = async () => {
  const start = performance.now();
  await rest.get(Routes.gateway());
  return Math.round(performance.now() - start);
};

client.api.interactions.createCollector = createCollector;

client.on(GatewayDispatchEvents.Ready, async (payload) => {
  console.log(`shard #${payload.shardId} is ready!`);

  await client.updatePresence(payload.shardId, {
    since: null,
    activities: [
      {
        type: ActivityType.Custom,
        name: 'shardId',
        state: `You're on shard #${payload.shardId}!`,
      },
    ],
    status: PresenceUpdateStatus.Online,
    afk: false,
  });
});

// track uptime and latency
gateway.on(WebSocketShardEvents.Ready, (_, shardId) => {
  client.gateway.shards.set(shardId, {
    uptime: Temporal.Now.instant().epochMilliseconds,
  });
});

gateway.on(WebSocketShardEvents.HeartbeatComplete, (payload, shardId) => {
  const shard = client.gateway.shards.get(shardId);

  if (shard) {
    shard.ping = payload.latency;
  }
});

events.forEach((event) => {
  if (event.once) {
    client.once(
      event.event,
      (payload: ToEventProps<Extract<GatewayDispatchPayload, { t: typeof event.event }>['d']>) => {
        event.run(payload.data, client).catch((error) => {
          console.error(`an error occurred while running event ${event.event}:`, error);
        });
      },
    );
  } else {
    client.on(event.event, (payload: ToEventProps<Extract<GatewayDispatchPayload, { t: typeof event.event }>['d']>) => {
      event.run(payload.data, client).catch((error) => {
        console.error(`an error occurred while running event ${event.event}:`, error);
      });
    });
  }
});

await gateway.connect().then(() => {
  console.log('gateway connected');

  scheduleReshardCheck(gateway, client.api);
});

if (env.get('register_commands')!.toBoolean() === true) {
  console.log('refreshing application (/) commands');

  commands.forEach((command) => {
    if (command.type !== ApplicationCommandType.ChatInput) {
      return;
    }

    command.options ??= [];

    const subcommands = command.options.flatMap((option) =>
      option.type === ApplicationCommandOptionType.Subcommand
        ? [option]
        : option.type === ApplicationCommandOptionType.SubcommandGroup
          ? (option.options ?? [])
          : [],
    );

    const subcommandOptions =
      subcommands.length > 0 ? subcommands.map((subcommand) => (subcommand.options ??= [])) : [command.options];

    subcommandOptions.forEach((options) => {
      if (!options.some((o) => o.name === 'ephemeral')) {
        options.push({
          type: ApplicationCommandOptionType.Boolean,
          name: 'ephemeral',
          description: 'Whether the response should only be visible to you',
        } satisfies BooleanChatInputOption);
      }
    });
  });

  const globalCommands: RESTPutAPIApplicationCommandsJSONBody = [];
  const commandsForGuilds = new Collection<string, RESTPutAPIApplicationGuildCommandsJSONBody>();

  commands.forEach((command) => {
    const resolved = transformCommand(command);

    if (!('guilds' in command)) {
      globalCommands.push(resolved);

      return;
    }

    for (const guildId of command.guilds ?? []) {
      if (resolved.type === ApplicationCommandType.PrimaryEntryPoint) {
        return;
      }

      const list = commandsForGuilds.get(guildId) ?? [];
      list.push(resolved);
      commandsForGuilds.set(guildId, list);
    }
  });

  if (globalCommands.length) {
    await client.api.applicationCommands.bulkOverwriteGlobalCommands(
      atob(env.get('token', true)!.toString().split('.')[0]!),
      globalCommands,
    );
  }

  for (const [guildId, commandsForGuild] of commandsForGuilds) {
    if (commandsForGuild.length) {
      await client.api.applicationCommands.bulkOverwriteGuildCommands(
        atob(env.get('token', true)!.toString().split('.')[0]!),
        guildId,
        commandsForGuild,
      );
    }
  }

  console.log('application (/) commands refreshed');
}
