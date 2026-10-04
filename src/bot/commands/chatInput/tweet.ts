// more to come in the future :)

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
import { extractTweetId, toComponentEmoji } from '../../../utils/utils'
import { emoji, hyperlink, timestamp } from '../../../utils/markdown'
import { t } from '../../../utils/localization'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType, TimestampStyle } from '../../../types/types'
import env from '../../../utils/env'

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
      type: ApplicationCommandOptionType.Boolean,
      name: 'detailed',
      description: {
        global: 'Whether to show detailed information about the tweet',
        'pt-BR': 'Se deve mostrar informações detalhadas sobre o tweet',
        'es-ES': 'Si se debe mostrar información detallada sobre el tweet',
      },
      required: false,
    },
  ],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    const { url, detailed } = options

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

    const id = extractTweetId(url)

    if (!id) {
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

    const post = await makeRequest('https://x.tolgchu.dev/post', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${tolgchuTwitterApiKey}`,
      },
      params: {
        id,
      },
    })

    let content = post.hasText ? post.displayText : undefined

    post.hashtags.forEach((hashtag: string) => {
      const escaped = hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`#${escaped}(?![\\p{L}\\p{N}_])`, 'gu')

      content = content?.replace(pattern, hyperlink(`https://x.com/hashtag/${hashtag}`, `#${hashtag}`))
    })

    post.mentions.forEach((mention: string) => {
      const escaped = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const pattern = new RegExp(`@${escaped}(?![\\p{L}\\p{N}_])`, 'gu')

      content = content?.replace(pattern, hyperlink(`https://x.com/${encodeURIComponent(mention)}`, `@${mention}`))
    })

    await client.api.interactions.respond(interaction.application_id, interaction.id, interaction.token, {
      components: [
        ...(detailed
          ? ([
              {
                type: ComponentType.Container,
                components: [
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `## ${post.author.name}${post.author.isVerified ? ` ${emoji('Verified')}` : ''}\n-# @${post.author.username}\n\n*${post.author.bio}*`,
                      },
                    ],
                    accessory: {
                      type: ComponentType.Thumbnail,
                      media: {
                        url: post.author.profileImageUrl,
                      },
                    },
                  },
                ],
              },
            ] satisfies APIMessageTopLevelComponent[])
          : []),
        ...(post.quotedPost
          ? ([
              {
                type: ComponentType.TextDisplay,
                content: t(l, 'commands.twitter.tweet.quoting', {
                  tweet: hyperlink(
                    `https://x.com/${post.quotedPost?.author.username}/status/${post.quotedPost?.id}`,
                    'this tweet',
                  ),
                  author: hyperlink(
                    `https://x.com/${post.quotedPost?.author.username}`,
                    `@${post.quotedPost?.author.username}`,
                  ),
                }),
              },
            ] satisfies APIMessageTopLevelComponent[])
          : []),
        ...(post.parentPost
          ? ([
              {
                type: ComponentType.TextDisplay,
                content: t(l, 'commands.twitter.tweet.replying', {
                  tweet: hyperlink(
                    `https://x.com/${post.parentPost?.author.username}/status/${post.parentPost?.id}`,
                    'this tweet',
                  ),
                  author: hyperlink(
                    `https://x.com/${post.parentPost?.author.username}`,
                    `@${post.parentPost?.author.username}`,
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
              content: `${t(l, 'commands.twitter.tweet.tweet_author', {
                verified: post.author.isVerified ? emoji('Verified') : '',
                author: post.author.name,
                username: hyperlink(`https://x.com/${post.author.username}`, `@${post.author.username}`),
              })}${content ? `\n\n${content}` : ''}`,
            },
            ...(post.media.length
              ? ([
                  {
                    type: ComponentType.MediaGallery,
                    items: post.media.slice(0, 10).map((media: any) => ({
                      media: {
                        url: media.url,
                      },
                    })),
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            ...(post.hasPoll
              ? ([
                  {
                    type: ComponentType.Separator,
                  },
                  {
                    type: ComponentType.TextDisplay,
                    content: `${post.poll.choices
                      .map((choice: any) => {
                        const percentage =
                          post.poll.totalVoteCount > 0 ? (choice.voteCount / post.poll.totalVoteCount) * 100 : 0

                        const filled = Math.round((percentage / 100) * 20)
                        const bar = `${'█'.repeat(filled)}${'░'.repeat(20 - filled)}`

                        return `**${choice.label}**\n${bar} **${percentage.toFixed(1)}%** (${choice.voteCount.toLocaleString('en-US')})`
                      })
                      .join(
                        '\n\n',
                      )}\n\n-# ${post.poll.isEnded ? t(l, 'commands.twitter.tweet.poll_ended') : t(l, 'commands.twitter.tweet.poll_ends')} ${timestamp(
                      Temporal.Instant.from(post.poll.endsAt).epochMilliseconds,
                      TimestampStyle.FullDateShortTime,
                    )} (${timestamp(
                      Temporal.Instant.from(post.poll.endsAt).epochMilliseconds,
                      TimestampStyle.RelativeTime,
                    )}) • **${(post.poll.totalVoteCount ?? 0).toLocaleString('en-US')}** ${t(l, 'commands.twitter.tweet.votes')}`,
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${t(l, 'commands.twitter.tweeted')} ${timestamp(
                    Temporal.Instant.from(post.createdAt).epochMilliseconds,
                    TimestampStyle.FullDateShortTime,
                  )} (${timestamp(
                    Temporal.Instant.from(post.createdAt).epochMilliseconds,
                    TimestampStyle.RelativeTime,
                  )}) • **${(post.viewCount ?? 0).toLocaleString('en-US')}** ${t(l, 'commands.twitter.tweet.views')}\n${emoji('Reply')} ${(post.replyCount ?? 0).toLocaleString('en-US')}   ${emoji('Repost')} ${(post.repostCount ?? 0).toLocaleString('en-US')}   ${emoji('Like')} ${(post.likeCount ?? 0).toLocaleString('en-US')}   ${emoji('Bookmark')} ${(post.bookmarkCount ?? 0).toLocaleString('en-US')}`,
                },
              ],
              accessory: {
                type: ComponentType.Button,
                label: t(l, 'commands.twitter.button.view'),
                emoji: toComponentEmoji('Link'),
                url: `https://x.com/${post.author.username}/status/${id}`,
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
