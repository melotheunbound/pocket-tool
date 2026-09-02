import { join } from 'path';
import { pathToFileURL } from 'url';
import { readdir } from 'fs/promises';
import { Emoji } from '../bot/constants';
import type { ApplicationCommand, ChatInputOptions, Localization } from '../types/types';
import {
  API,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  InteractionType,
  type APIApplicationCommandInteractionDataOption,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentEmoji,
  type LocalizationMap,
  type RESTPostAPIApplicationCommandsJSONBody,
  type RESTPostAPIApplicationGuildCommandsJSONBody,
  type Snowflake,
} from '@discordjs/core';

export async function readDirectory(folder: string): Promise<void> {
  const files = await readdir(folder, { recursive: true });

  for (const filename of files) {
    if (!filename.endsWith('.ts')) {
      continue;
    }

    const fullPath = join(folder, filename);

    await import(pathToFileURL(fullPath).href).catch((error) =>
      console.log(`cannot import file (${fullPath}) for reason:`, error),
    );
  }
}

export function getTimestampFromSnowflake(snowflake: Snowflake): number {
  return Number(BigInt(snowflake) >> 22n) + 1420070400000; // 1420070400000 is the timestamp epoch (January 1, 2015)
}

const TIME_UNITS = {
  y: 1000 * 60 * 60 * 24 * 365,
  d: 1000 * 60 * 60 * 24,
  h: 1000 * 60 * 60,
  m: 1000 * 60,
  s: 1000,
};

export function msToApproxTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  if (ms < TIME_UNITS.m) {
    return `~${(ms / 1000).toFixed(1)}s`;
  }

  if (ms < TIME_UNITS.h) {
    return `~${Math.round(ms / TIME_UNITS.m)}m`;
  }

  if (ms < TIME_UNITS.d) {
    return `~${(ms / TIME_UNITS.h).toFixed(1)}h`;
  }

  if (ms < TIME_UNITS.y) {
    return `~${(ms / TIME_UNITS.d).toFixed(1)}d`;
  }

  return `~${(ms / TIME_UNITS.y).toFixed(1)}y`;
}

export function msToReadableTime(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / TIME_UNITS.m) % 60;
  const hours = Math.floor(ms / TIME_UNITS.h) % 24;
  const days = Math.floor(ms / TIME_UNITS.d) % 365;
  const years = Math.floor(ms / TIME_UNITS.y);

  const parts: string[] = [];

  if (years) {
    parts.push(`${years}y`);
  }

  if (days) {
    parts.push(`${days}d`);
  }

  if (hours) {
    parts.push(`${hours}h`);
  }

  if (minutes) {
    parts.push(`${minutes}m`);
  }

  if (seconds || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

export function readableTimeToMs(time: string): number | null {
  const matches = time.matchAll(/(\d+)(y|d|h|m|s)/g);

  let ms = 0;

  let matched = false;

  for (const [, value, unit] of matches) {
    if (!value || !unit) {
      continue;
    }

    ms += parseInt(value, 10) * TIME_UNITS[unit as keyof typeof TIME_UNITS];
    matched = true;
  }

  return matched ? ms : null;
}

export function toComponentEmoji(name: keyof typeof Emoji): APIMessageComponentEmoji {
  const emoji = Emoji[name];

  if (!emoji) {
    throw new Error(`Emoji "${name}" not found`);
  }

  const match = emoji.match(/^<a?:\w+:(\d+)>$/);

  if (!match) {
    throw new Error(`Invalid emoji format: ${emoji}`);
  }

  return {
    id: match[1]!,
    name: 'e',
    animated: emoji.startsWith('<a:'),
  };
}

export function toReactionEmoji(name: keyof typeof Emoji): string {
  const emoji = Emoji[name];

  if (!emoji) {
    throw new Error(`Emoji "${name}" not found`);
  }

  return emoji.replace(/<a?:(.+):(\d+)>/, '$1:$2');
}

export function transformCommand(
  command: ApplicationCommand,
): RESTPostAPIApplicationCommandsJSONBody | RESTPostAPIApplicationGuildCommandsJSONBody {
  const name = transformLocalization(command.name);

  if (command.type === ApplicationCommandType.ChatInput) {
    const description = transformLocalization(command.description);

    return {
      type: command.type,
      name: name.global,
      name_localizations: name.localizations,
      description: description.global,
      description_localizations: description.localizations,
      options: transformCommandOptions(command.options ?? []),
      default_member_permissions: command.defaultMemberPermissions?.toString(),
      nsfw: command.nsfw,
      integration_types: command.integrationTypes,
      contexts: command.contexts,
    };
  }

  return {
    type: command.type,
    name: name.global,
    name_localizations: name.localizations,
    ...('defaultMemberPermissions' in command && command.defaultMemberPermissions !== undefined
      ? { default_member_permissions: command.defaultMemberPermissions.toString() }
      : {}),
    ...('nsfw' in command && command.nsfw !== undefined ? { nsfw: command.nsfw } : {}),
    ...('integrationTypes' in command && command.integrationTypes !== undefined
      ? { integration_types: command.integrationTypes }
      : {}),
    ...('contexts' in command && command.contexts !== undefined ? { contexts: command.contexts } : {}),
    ...('handler' in command && command.handler !== undefined ? { handler: command.handler } : {}),
  };
}

function transformCommandOptions(options: ChatInputOptions): RESTPostAPIApplicationCommandsJSONBody['options'] {
  return options.map((option) => {
    const name = transformLocalization(option.name);
    const description = transformLocalization(option.description);

    const base = {
      type: option.type,
      name: name.global,
      name_localizations: name.localizations,
      description: description.global,
      description_localizations: description.localizations,
      required: option.required,
    };

    switch (option.type) {
      case ApplicationCommandOptionType.Integer:
      case ApplicationCommandOptionType.Number: {
        return {
          ...base,
          ...(option.maxValue !== undefined ? { max_value: option.maxValue } : {}),
          ...(option.minValue !== undefined ? { min_value: option.minValue } : {}),
          ...(option.choices !== undefined
            ? {
                choices: option.choices.map((choice) => {
                  const name = transformLocalization(choice.name);

                  return {
                    name: name.global,
                    name_localizations: name.localizations,
                    value: choice.value,
                  };
                }),
              }
            : {}),
          ...(option.autocomplete !== undefined ? { autocomplete: option.autocomplete } : {}),
        };
      }
      case ApplicationCommandOptionType.String: {
        return {
          ...base,
          ...(option.maxLength !== undefined ? { max_length: option.maxLength } : {}),
          ...(option.minLength !== undefined ? { min_length: option.minLength } : {}),
          ...(option.choices !== undefined
            ? {
                choices: option.choices.map((choice) => {
                  const name = transformLocalization(choice.name);

                  return {
                    name: name.global,
                    name_localizations: name.localizations,
                    value: choice.value,
                  };
                }),
              }
            : {}),
          ...(option.autocomplete !== undefined ? { autocomplete: option.autocomplete } : {}),
        };
      }
      case ApplicationCommandOptionType.Channel: {
        return {
          ...base,
          ...(option.channel_types !== undefined ? { channel_types: option.channel_types } : {}),
        };
      }
      case ApplicationCommandOptionType.Subcommand:
      case ApplicationCommandOptionType.SubcommandGroup: {
        return {
          ...base,
          ...(option.options !== undefined ? { options: transformCommandOptions(option.options) } : {}),
        };
      }
      default:
        return base;
    }
  }) as RESTPostAPIApplicationCommandsJSONBody['options'];
}

function transformLocalization(localization: Localization): {
  global: string;
  localizations?: LocalizationMap;
} {
  if (typeof localization === 'string') {
    return { global: localization };
  }

  const { global, ...localizations } = localization;

  return {
    global,
    localizations,
  };
}

export function parseCommandOptions(
  interaction: APIChatInputApplicationCommandInteraction,
  options?: APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommand>[],
): Record<string, unknown> {
  options ??= interaction.data.options ?? [];

  const args: Record<string, unknown> = {};

  for (const option of options) {
    switch (option.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        args[option.name] = parseCommandOptions(interaction, option.options);
        break;
      case ApplicationCommandOptionType.Channel:
        args[option.name] = interaction.data.resolved?.channels?.[option.value];
        break;
      case ApplicationCommandOptionType.Role:
        args[option.name] = interaction.data.resolved?.roles?.[option.value];
        break;
      case ApplicationCommandOptionType.User:
        args[option.name] = {
          user: interaction.data.resolved?.users?.[option.value],
          member: interaction.data.resolved?.members?.[option.value],
        };

        break;
      case ApplicationCommandOptionType.Attachment:
        args[option.name] = interaction.data.resolved?.attachments?.[option.value];
        break;
      case ApplicationCommandOptionType.Mentionable:
        args[option.name] = interaction.data.resolved?.roles?.[option.value] ?? {
          user: interaction.data.resolved?.users?.[option.value],
          member: interaction.data.resolved?.members?.[option.value],
        };

        break;
      default:
        args[option.name] = option.value;
        break;
    }
  }

  return args;
}

export function getChatInputOption(
  options: APIApplicationCommandInteractionDataOption[],
  name: string,
): APIApplicationCommandInteractionDataOption | undefined {
  if (!options.length) {
    return undefined;
  }

  for (const option of options) {
    if (option.name === name) {
      return option;
    }

    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      const found = getChatInputOption(option.options ?? [], name);

      if (found) {
        return found;
      }
    }
  }
}

export function getAutocompleteFocusedOption(
  options: APIApplicationCommandInteractionDataOption[],
): (APIApplicationCommandInteractionDataOption & { value: any }) | undefined {
  for (const option of options) {
    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      const found = getAutocompleteFocusedOption(option.options ?? []);

      if (found) {
        return found;
      }
    }

    if ('focused' in option && option.focused) {
      return option;
    }
  }
}

export async function hasPlus(userId: string, api: API): Promise<boolean> {
  const result = await api.monetization.getEntitlements('1489362526880796903', {
    user_id: userId,
    sku_ids: '1538163894256930917',
    exclude_ended: true,
  });

  return result.length > 0;
}

export function getShardIdForGuildId(guildId: string, totalShards: number): number {
  return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

export function findClosestMatch(input: string, strings: string[]): string | null {
  if (!strings.length) {
    return null;
  }

  if (strings.length === 1) {
    return strings[0]!;
  }

  let minDistance = Infinity;
  let closestMatch: string | null = null;

  for (const string of strings) {
    const distance = levenshteinDistance(input, string);

    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = string;
    }
  }

  return closestMatch;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[i]![0] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const currentRow = matrix[i]!;
      const previousRow = matrix[i - 1]!;

      if (a[i - 1] === b[j - 1]) {
        currentRow[j] = previousRow[j - 1]!;
      } else {
        currentRow[j] = Math.min(
          previousRow[j - 1]! + 1, // substitution
          currentRow[j - 1]! + 1, // insertion
          previousRow[j]! + 1, // deletion
        );
      }
    }
  }

  return matrix[a.length]![b.length]!;
}
