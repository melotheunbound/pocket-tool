import type {
  APIApplicationCommandAutocompleteInteraction,
  APIAttachment,
  APIChannel,
  APIChatInputApplicationCommandInteraction,
  APIInteractionDataResolvedGuildMember,
  APIMessageApplicationCommandInteraction,
  APIPrimaryEntryPointCommandInteraction,
  APIRole,
  APIUser,
  APIUserApplicationCommandInteraction,
  ApplicationCommandOptionAllowedChannelType,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  EntryPointCommandHandlerType,
  InteractionContextType,
  LocalizationMap,
  Snowflake,
  PermissionFlagsBits,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  Client,
} from '@discordjs/core'
import { EventEmitter } from 'events'

export type Localization = (Partial<Record<keyof LocalizationMap, string>> & { global: string }) | string

export interface BaseNonPrimaryEntryPointCommand<Type extends ApplicationCommandType> {
  type: Type
  name: Localization
  integrationTypes?: ApplicationIntegrationType[]
  contexts?: InteractionContextType[]
  defaultMemberPermissions?: (typeof PermissionFlagsBits)[keyof typeof PermissionFlagsBits]
  cooldown?: number
  guilds?: Snowflake[]
  dev?: boolean
  acknowledge?: boolean
  ephemeral?: boolean
  nsfw?: boolean
}

export interface ChatInputCommand<
  Options extends ChatInputOptions = ChatInputOptions,
> extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.ChatInput> {
  description: Localization
  options?: Options
  run: (
    interaction: APIChatInputApplicationCommandInteraction,
    options: GetChatInputCommandOptions<Options>,
    client: Client,
  ) => Promise<void>
  autocomplete?: (interaction: APIApplicationCommandAutocompleteInteraction, client: Client) => Promise<void>
}

export type ChatInputOptions = ChatInputOption[]

export type ChatInputOption =
  | AttachmentChatInputOption
  | BooleanChatInputOption
  | ChannelChatInputOption
  | IntegerChatInputOption
  | MentionableChatInputOption
  | NumberChatInputOption
  | RoleChatInputOption
  | StringChatInputOption
  | UserChatInputOption
  | SubcommandChatInputOption
  | SubcommandGroupChatInputOption

export type BaseChatInputOption<Type extends ApplicationCommandOptionType = ApplicationCommandOptionType> = {
  type: Type
  name: Localization
  description: Localization
  required?: boolean
}

export type AttachmentChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Attachment>

export type BooleanChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Boolean>

export type ChannelChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Channel> & {
  channel_types?: ApplicationCommandOptionAllowedChannelType[]
}

export type IntegerChatInputOption =
  | (BaseChatInputOption<ApplicationCommandOptionType.Integer> & {
      maxValue?: number
      minValue?: number
      choices?: ChatInputOptionChoice<ApplicationCommandOptionType.Integer>[]
      autocomplete?: false
    })
  | (BaseChatInputOption<ApplicationCommandOptionType.Integer> & {
      maxValue?: number
      minValue?: number
      choices?: never
      autocomplete: true
    })

export type MentionableChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Mentionable>

export type NumberChatInputOption =
  | (BaseChatInputOption<ApplicationCommandOptionType.Number> & {
      maxValue?: number
      minValue?: number
      choices?: ChatInputOptionChoice<ApplicationCommandOptionType.Number>[]
      autocomplete?: false
    })
  | (BaseChatInputOption<ApplicationCommandOptionType.Number> & {
      maxValue?: number
      minValue?: number
      choices?: never
      autocomplete: true
    })

export type RoleChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Role>

export type StringChatInputOption =
  | (BaseChatInputOption<ApplicationCommandOptionType.String> & {
      maxLength?: number
      minLength?: number
      choices?: ChatInputOptionChoice<ApplicationCommandOptionType.String>[]
      autocomplete?: false
    })
  | (BaseChatInputOption<ApplicationCommandOptionType.String> & {
      maxLength?: number
      minLength?: number
      choices?: never
      autocomplete: true
    })

export type UserChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.User>

export type SubcommandChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Subcommand> & {
  options?: Exclude<ChatInputOption, SubcommandChatInputOption | SubcommandGroupChatInputOption>[]
}

export type SubcommandChatInputOptions = SubcommandChatInputOption[]

export type SubcommandGroupChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.SubcommandGroup> & {
  options?: SubcommandChatInputOptions
}

export type ChatInputOptionChoice<Type extends ApplicationCommandOptionType> = {
  name: Localization
  value: Type extends ApplicationCommandOptionType.String
    ? string
    : Type extends ApplicationCommandOptionType.Number
      ? number
      : never
}

export interface InteractionResolvedUser {
  user: APIUser
  member?: APIInteractionDataResolvedGuildMember
}

export interface TypeToResolvedMap {
  [ApplicationCommandOptionType.String]: string
  [ApplicationCommandOptionType.Integer]: number
  [ApplicationCommandOptionType.Boolean]: boolean
  [ApplicationCommandOptionType.User]: InteractionResolvedUser
  [ApplicationCommandOptionType.Channel]: APIChannel
  [ApplicationCommandOptionType.Role]: APIRole
  [ApplicationCommandOptionType.Mentionable]: APIRole | InteractionResolvedUser
  [ApplicationCommandOptionType.Number]: number
  [ApplicationCommandOptionType.Attachment]: APIAttachment
}

export type SubCommandApplicationCommand =
  ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup

export type ConvertTypeToResolved<Type extends keyof TypeToResolvedMap> = TypeToResolvedMap[Type]

export type GetOptionName<Option> = Option extends { name: string }
  ? Option['name']
  : Option extends { name: { global: string } }
    ? Option['name']['global']
    : never

export type BuildOptions<Options extends ChatInputOption[] | undefined> = {
  [Index in keyof Omit<Options, keyof unknown[]> as GetOptionName<Options[Index]>]: GetOptionValue<Options[Index]>
}

export type GetOptionValue<Option> = Option extends {
  type: ApplicationCommandOptionType
  required?: boolean
}
  ? Option extends {
      type: SubCommandApplicationCommand
      options?: ChatInputOptions
    }
    ? BuildOptions<Option['options']>
    : Option['type'] extends keyof TypeToResolvedMap
      ? ConvertTypeToResolved<Option['type']> | (Option['required'] extends true ? never : undefined)
      : never
  : never

export type GetChatInputCommandOptions<Options extends ChatInputOptions = ChatInputOptions> = BuildOptions<Options>

export interface UserContextMenuCommand extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.User> {
  run: (interaction: APIUserApplicationCommandInteraction, client: Client) => Promise<void>
}

export interface MessageContextMenuCommand extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.Message> {
  run: (interaction: APIMessageApplicationCommandInteraction, client: Client) => Promise<void>
}

export interface PrimaryEntryPointCommand {
  type: ApplicationCommandType.PrimaryEntryPoint
  name: string
  nameLocalizations?: LocalizationMap
  handler: EntryPointCommandHandlerType
  run?: (interaction: APIPrimaryEntryPointCommandInteraction, client: Client) => Promise<void>
}

export type NonPrimaryEntryPointCommand<Options extends ChatInputOptions = ChatInputOptions> =
  ChatInputCommand<Options> | UserContextMenuCommand | MessageContextMenuCommand

export type ApplicationCommand<Options extends ChatInputOptions = ChatInputOptions> =
  NonPrimaryEntryPointCommand<Options> | PrimaryEntryPointCommand

export interface GatewayEvent<Event extends GatewayDispatchEvents = GatewayDispatchEvents> {
  event: Event
  run: (args: Extract<GatewayDispatchPayload, { t: Event }>['d'], client: Client) => Promise<void>
}

export enum TimestampStyle {
  /**	16:20 */
  ShortTime = 't',
  /**	16:20:30 */
  MediumTime = 'T',
  /**	20/04/2021 */
  ShortDate = 'd',
  /**	April 20, 2021 */
  LongDate = 'D',
  /**	April 20, 2021 at 16:20 */
  LongDateShortTime = 'f',
  /**	Tuesday, April 20, 2021 at 16:20 */
  FullDateShortTime = 'F',
  /**	20/04/2021, 16:20 */
  ShortDateShortTime = 's',
  /**	20/04/2021, 16:20:30 */
  ShortDateMediumTime = 'S',
  /**	4 years ago */
  RelativeTime = 'R',
}

export enum HighlightStyle {
  Bold = 'bold',
  Compact = 'compact',
  Default = 'default',
}

export enum RequestMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
}

export enum ResponseType {
  TEXT = 'text',
  JSON = 'json',
  BUFFER = 'buffer',
}

export type RequestOptions<Type extends ResponseType> = {
  method: RequestMethod
  response: Type
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  body?: unknown
  timeout?: number
}

export type RequestResponse = {
  [ResponseType.TEXT]: string
  [ResponseType.JSON]: any
  [ResponseType.BUFFER]: Buffer
}

export interface CollectorOptions<Type> {
  key: string
  filter?: (item: Type) => boolean | Promise<boolean>
  duration?: number
  max?: number
}

export interface CollectorEvents<Type> {
  collect: [Type]
  end: [string]
}

export interface Collector<Type> extends EventEmitter<CollectorEvents<Type>> {
  collect(item: Type): Promise<void>
  end(reason?: string): void
}

export interface GatewayShard {
  ping: number
  uptime: number
  memory: () => Promise<NodeJS.MemoryUsage>
}
