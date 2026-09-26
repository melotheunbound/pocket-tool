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
import { extractTweetId, findClosestMatch, getAutocompleteFocusedOption, toComponentEmoji } from '../../../utils/utils'
import env from '../../../utils/env'
import { emoji, hyperlink, timestamp } from '../../../utils/markdown'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType, TimestampStyle } from '../../../types/types'
import { DEEPLX_LANGUAGES } from '../../constants'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'tweet',
    'pt-BR': 'tweet',
    'es-ES': 'tweet',
  },
  description: {
    global: 'Display a tweet preview',
    'pt-BR': 'Visualize uma prévia de tweet',
    'es-ES': 'Visualiza una vista previa de tweet',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'url',
      description: {
        global: 'The URL or ID of the tweet',
        'pt-BR': 'A URL ou ID do tweet',
        'es-ES': 'La URL o ID del tweet',
      },
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: {
        global: 'language',
        'pt-BR': 'idioma',
        'es-ES': 'idioma',
      },
      description: {
        global: 'The language of the tweet (auto for Discord locale)',
        'pt-BR': 'O idioma do tweet (auto para o idioma do Discord)',
        'es-ES': 'El idioma del tweet (auto para el idioma del Discord)',
      },
      required: false,
      autocomplete: true,
    },
  ],
  cooldown: 5,
  acknowledge: true,
  async autocomplete(interaction, client) {
    const focused = getAutocompleteFocusedOption(interaction.data.options)
    const value = String(focused?.value ?? '').toLowerCase()

    const languages = DEEPLX_LANGUAGES.filter(language => {
      return language.name.toLowerCase().includes(value) || language.code.toLowerCase().includes(value)
    })

    const choices = [
      {
        name: 'Use My Locale',
        name_localizations: {
          'pt-BR': 'Use Meu Locale',
          'es-ES': 'Use Meu Locale',
        },
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
    const l = interaction.locale

    const { url, language } = options

    const tolgchuTwitterApiKey = env.get('tolgchu_twitter_api_key')?.toString()

    if (!tolgchuTwitterApiKey) {
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} ${t(l, 'commands.tweet.missing_api_key')}`,
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
      await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} ${t(l, 'commands.tweet.invalid_tweet')}`,
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
        await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
          components: [
            {
              type: ComponentType.Container,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('Wrong')} ${t(l, 'commands.tweet.missing_api_key_2')}`,
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
            DEEPLX_LANGUAGES.map(language => language.code),
          )
        : undefined

      const targetCode =
        language === 'auto'
          ? (findClosestMatch(
              interaction.locale,
              DEEPLX_LANGUAGES.map(language => language.code),
            ) ?? 'en')
          : language

      const translation = await makeRequest('https://oneshot-free.www.deepl.com/v1/translate', {
        method: RequestMethod.POST,
        response: ResponseType.JSON,
        headers: {
          'Content-type': 'application/json',
        },
        body: {
          text: [content],
          target_lang: targetCode,
          ...(sourceCode ? { source_lang: sourceCode } : {}),
        },
      })

      const translated = translation.translations[0].text
      isTranslated = !!translated
      content = translated ?? content
    }

    for (const hashtag of tweet.hashtags) {
      const escaped = hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`#${escaped}(?![\\p{L}\\p{N}_])`, 'gu')

      content = content?.replace(pattern, hyperlink(`https://x.com/hashtag/${hashtag}`, `#${hashtag}`))
    }

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
      components: [
        ...(tweet.quotedPost
          ? ([
              {
                type: ComponentType.TextDisplay,
                content: t(l, 'commands.tweet.quoting_tweet', {
                  tweet: hyperlink(
                    `https://x.com/${tweet.quotedPost?.author.username}/status/${tweet.quotedPost?.id}`,
                    'this tweet',
                  ),
                  author: hyperlink(
                    `https://x.com/${tweet.quotedPost?.author.username}`,
                    `@${tweet.quotedPost?.author.username}`,
                  ),
                }),
              },
            ] satisfies APIMessageTopLevelComponent[])
          : tweet.parentPost
            ? ([
                {
                  type: ComponentType.TextDisplay,
                  content: t(l, 'commands.tweet.replying_to_tweet', {
                    tweet: hyperlink(
                      `https://x.com/${tweet.parentPost?.author.username}/status/${tweet.parentPost?.id}`,
                      'this tweet',
                    ),
                    author: hyperlink(
                      `https://x.com/${tweet.parentPost?.author.username}`,
                      `@${tweet.parentPost?.author.username}`,
                    ),
                  }),
                },
              ] satisfies APIMessageTopLevelComponent[])
            : []),
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${t(l, 'commands.tweet.posted_by', { verified: tweet.author.isVerified ? emoji('Verified') : '', author: tweet.author.name, username: hyperlink(`https://x.com/${tweet.author.username}`, `@${tweet.author.username}`) })}${content ? `\n\n${content}` : ''}`,
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
                    content: t(l, 'commands.tweet.translated'),
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${t(l, 'commands.tweet.tweeted')} ${timestamp(Temporal.Instant.from(tweet.createdAt).epochMilliseconds, TimestampStyle.FullDateShortTime)} (${timestamp(Temporal.Instant.from(tweet.createdAt).epochMilliseconds, TimestampStyle.RelativeTime)})`,
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
                label: t(l, 'commands.tweet.button.view'),
                emoji: toComponentEmoji('Link'),
                url: `https://x.com/${tweet.author.username}/status/${tweetId}`,
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
