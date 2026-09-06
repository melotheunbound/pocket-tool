import { Emoji } from '../bot/constants'
import { HighlightStyle, TimestampStyle } from '../types/types'

/** Escapes backticks in a string to avoid breaking markdown */
function _sanitize(content: unknown): string {
  return String(content ?? '').replace(/`/g, 'ˋ')
}

export function cdn(route: string, size: number = 4096, format: string = 'webp', animated: boolean = false): string {
  return `https://cdn.discordapp.com${route}.${format}?size=${size}&animated=${animated}`
}

export function codeblock(language: string, content: unknown): string {
  const lines = Array.isArray(content) ? content.map(String) : [String(content ?? '')]

  if (!lines.length) return '```' + language + '```'

  return '```' + language + '\n' + _sanitize(lines.join('\n')) + '```'
}

export function emoji(name: keyof typeof Emoji): string {
  const emoji = Emoji[name]

  if (!emoji) throw new Error(`Emoji "${name}" not found`)

  return emoji.replace(/:[a-zA-Z0-9_]*:/, ':e:')
}

export function highlight(content: unknown, style: HighlightStyle = HighlightStyle.Default): string {
  const sanitized = _sanitize(content)

  switch (style) {
    case HighlightStyle.Bold:
      return `**\` ${sanitized} \`**`
    case HighlightStyle.Compact:
      return `\`${sanitized}\``
    case HighlightStyle.Default:
      return `\` ${sanitized} \``
  }
}

export function hyperlink(url: string, masked: string, tooltip: string = '', embed: boolean = false): string {
  if (tooltip.length) tooltip = ` '${tooltip}'`

  url = url.replace(/\)/g, '\\)')

  return embed ? `[${masked}](${url}${tooltip})` : `[${masked}](<${url}>${tooltip})`
}

export function timestamp(time: number, flag: TimestampStyle = TimestampStyle.ShortTime): string {
  return `<t:${Math.floor(time / 1000)}:${flag}>`
}

export function ellipsis(content: string = '', length: number): string {
  if (content.length <= length) return content

  let result = ''

  for (const word of content.split(/\s+/)) {
    const next = result ? `${result} ${word}` : word

    if (next.length + 3 > length) break

    result = next
  }

  if (!result) return content.slice(0, Math.max(length - 3, 0)) + '...'

  return `${result}...`
}
