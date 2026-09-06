import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIMessageTopLevelComponent,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { findClosestMatch, getAutocompleteFocusedOption } from '../../../utils/utils'
import env from '../../../utils/env'
import { emoji, hyperlink, timestamp } from '../../../utils/markdown'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType, TimestampStyle } from '../../../types/types'
import { AZURE_LANGUAGES } from '../../constants'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'tweet',
  description: 'Display a tweet preview',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'url',
      description: 'The URL or ID of the tweet',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'language',
      description: 'The language of the tweet (auto for Discord locale)',
      required: false,
      autocomplete: true,
    },
  ],
  cooldown: 5,
  acknowledge: true,
  async autocomplete(interaction, client) {
    const focused = getAutocompleteFocusedOption(interaction.data.options)
    const value = String(focused?.value ?? '').toLowerCase()

    const languages = AZURE_LANGUAGES.filter(language => {
      return language.name.toLowerCase().includes(value) || language.code.toLowerCase().includes(value)
    })

    const choices = [
      {
        name: 'Use My Locale',
        value: 'auto',
      },
      ...languages.map(language => ({
        name: language.name,
        value: language.code,
      })),
    ].slice(0, 25)

    await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices })
  },
  async run(interaction, options, client) {
    const { url, language } = options

    const tolgchuTwitterApiKey = env.get('tolgchu_twitter_api_key')?.toString()

    if (!tolgchuTwitterApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} The Tolgchu Twitter API key is not set.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const tweetId = extractTweetId(url)

    if (!tweetId) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please provide a valid tweet URL or ID to view the tweet.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const tweet = await makeRequest('https://x.tolgchu.dev/post', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${tolgchuTwitterApiKey}`,
      },
      params: {
        id: tweetId,
      },
    })

    let content = tweet.hasText ? tweet.displayText : undefined

    let isTranslated = false

    if (language && content) {
      const azureApiKey = env.get('azure_api_key')?.toString()

      if (!azureApiKey) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Wrong')} The Microsoft Azure API key is not set.`,
                },
              ],
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        })

        return
      }

      const sourceCode = tweet.language
        ? findClosestMatch(
            tweet.language,
            AZURE_LANGUAGES.map(language => language.code),
          )
        : undefined

      const targetCode =
        language === 'auto'
          ? (findClosestMatch(
              interaction.locale,
              AZURE_LANGUAGES.map(language => language.code),
            ) ?? 'en')
          : language

      const translation = await makeRequest('https://api.cognitive.microsofttranslator.com/translate', {
        method: RequestMethod.POST,
        response: ResponseType.JSON,
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': azureApiKey,
        },
        params: {
          'api-version': '3.0',
          ...(sourceCode ? { from: sourceCode } : {}),
          to: targetCode,
        },
        body: [
          {
            text: content,
          },
        ],
      })

      const translated = translation[0]?.translations?.[0]?.text
      isTranslated = !!translated
      content = translated ?? content
    }

    for (const hashtag of tweet.hashtags) {
      const escaped = hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`#${escaped}(?![\\p{L}\\p{N}_])`, 'gu')

      content = content?.replace(pattern, hyperlink(`https://x.com/hashtag/${hashtag}`, `#${hashtag}`))
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        ...(tweet.quotedPost
          ? ([
              {
                type: ComponentType.TextDisplay,
                content: `-# *Quoting ${hyperlink(`https://x.com/${tweet.quotedPost?.author.username}/status/${tweet.quotedPost?.id}`, 'this tweet')}, posted by ${hyperlink(`https://x.com/${tweet.quotedPost?.author.username}`, `@${tweet.quotedPost?.author.username}`)}*`,
              },
            ] satisfies APIMessageTopLevelComponent[])
          : tweet.parentPost
            ? ([
                {
                  type: ComponentType.TextDisplay,
                  content: `-# *Replying to ${hyperlink(`https://x.com/${tweet.parentPost?.author.username}/status/${tweet.parentPost?.id}`, 'this tweet')}, posted by ${hyperlink(`https://x.com/${tweet.parentPost?.author.username}`, `@${tweet.parentPost?.author.username}`)}*`,
                },
              ] satisfies APIMessageTopLevelComponent[])
            : []),
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `-# Posted by ${tweet.author.isVerified ? `${emoji('Verified')} ` : ''}**${tweet.author.name} (${hyperlink(`https://x.com/${tweet.author.username}`, `@${tweet.author.username}`)})**${content ? `\n\n${content}` : ''}`,
            },
            ...(tweet.media.length > 0
              ? ([
                  {
                    type: ComponentType.MediaGallery,
                    items: tweet.media.slice(0, 10).map((media: any) => ({
                      media: {
                        url: media.url,
                      },
                    })),
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            ...(isTranslated
              ? ([
                  {
                    type: ComponentType.TextDisplay,
                    content: '-# Translated tweets may be inaccurate or may not reflect the original content',
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `-# ${timestamp(Temporal.Instant.from(tweet.createdAt).epochMilliseconds, TimestampStyle.FullDateShortTime)} (${timestamp(Temporal.Instant.from(tweet.createdAt).epochMilliseconds, TimestampStyle.RelativeTime)})`,
            },
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Reply')} ${(tweet.replyCount ?? 0).toLocaleString('en-US')}   ${emoji('Repost')} ${(tweet.repostCount ?? 0).toLocaleString('en-US')}   ${emoji('Like')} ${(tweet.likeCount ?? 0).toLocaleString('en-US')}   ${emoji('Bookmark')} ${(tweet.bookmarkCount ?? 0).toLocaleString('en-US')}`,
                },
              ],
              accessory: {
                type: ComponentType.Button,
                url: `https://x.com/${tweet.author.username}/status/${tweetId}`,
                label: 'View Tweet',
                style: ButtonStyle.Link,
              },
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})

function extractTweetId(input: string): string | undefined {
  const trimmed = input.trim()

  if (/^\d+$/.test(trimmed)) return trimmed

  try {
    const tweetUrl = new URL(trimmed)
    const id = tweetUrl.pathname.split('/').pop()
    return id && /^\d+$/.test(id) ? id : undefined
  } catch {
    return undefined
  }
}
