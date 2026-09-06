import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { codeblock, emoji, timestamp, ellipsis } from '../../../utils/markdown'
import env from '../../../utils/env'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType, TimestampStyle } from '../../../types/types'
import { redis } from '../../../utils/redis'
import { hasPlus } from '../../../utils/utils'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Speech to Text',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, client) {
    const elevenLabsApiKey = env.get('eleven_labs_api_key')?.toString()

    if (!elevenLabsApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} The Eleven Labs API key is not set.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const date = Temporal.Now.zonedDateTimeISO().toPlainDate().toString()
    const key = `stt:${interaction.user?.id ?? interaction.member?.user.id}:${date}`

    const usage = Number((await redis.get(key)) ?? 0)

    const plus = await hasPlus((interaction.user?.id ?? interaction.member?.user.id)!, client.api)
    const limit = plus ? 50 : 10

    if (usage >= limit) {
      const resetAt = Temporal.Now.instant().toZonedDateTimeISO('UTC').startOfDay().add({ days: 1 }).toInstant()

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} You have reached your daily STT limit of ${limit} messages. Try again ${timestamp(resetAt.epochMilliseconds, TimestampStyle.RelativeTime)}.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const message = interaction.data.resolved.messages[interaction.data.target_id]

    if (message?.message_snapshots && message.message_snapshots.length > 0) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Forwarded messages are currently unsupported.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    if (
      !message ||
      !message.attachments.length ||
      !message.attachments.find(attachment => attachment.content_type?.startsWith('audio/'))
    ) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please select a voice message to transcribe.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const voice = message.attachments.find(attachment => attachment.content_type?.startsWith('audio/'))!

    if (!voice.duration_secs || voice.duration_secs > (plus ? 5 * 60 * 1000 : 1 * 60 * 1000)) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Voice message must be shorter than ${plus ? '5' : '1'} minutes.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const buffer = await makeRequest(voice.url, {
      method: RequestMethod.GET,
      response: ResponseType.BUFFER,
    })

    const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js')

    const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey })

    const transcript = await elevenlabs.speechToText.convert({
      modelId: 'scribe_v2',
      file: new Blob([buffer], {
        type: voice.content_type ?? 'audio/ogg',
      }),
    })

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: codeblock('ansi', ellipsis(transcript.text, 3995)),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })

    await redis.incr(key)
  },
})
