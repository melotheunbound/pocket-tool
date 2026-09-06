import { Collection } from '@discordjs/collection'
import type { ApplicationCommand, ChatInputOptions } from '../types/types'

export const commands = new Collection<string, ApplicationCommand>()

export default function createApplicationCommand<const Options extends ChatInputOptions = ChatInputOptions>(
  command: ApplicationCommand<Options>,
): void {
  commands.set(typeof command.name === 'string' ? command.name : command.name.global, command as ApplicationCommand)
}
