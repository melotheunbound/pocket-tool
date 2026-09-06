import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import env from '../../../utils/env'
import { emoji, timestamp, ellipsis } from '../../../utils/markdown'
import { redis } from '../../../utils/redis'
import { TimestampStyle } from '../../../types/types'
import { findClosestMatch, hasPlus } from '../../../utils/utils'
import { ELEVEN_LABS_LANGUAGES } from '../../constants'

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Text to Speech',
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
                content: `${emoji('Wrong')} The ElevenLabs API key is not set.`,
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

    const date = Temporal.Now.zonedDateTimeISO().toPlainDate().toString()
    const key = `tts:${interaction.user?.id ?? interaction.member?.user.id}:${date}`

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
                content: `${emoji('Exclamation')} You have reached your daily TTS limit of ${limit} messages. Try again ${timestamp(resetAt.epochMilliseconds, TimestampStyle.RelativeTime)}.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    if (!message || !message.content.trim()) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please select a text message to convert to speech.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const text = message.content.trim()

    const [{ ElevenLabsClient }, { decodeOpusBytes, getWaveform }] = await Promise.all([
      import('@elevenlabs/elevenlabs-js'),
      import('../../../utils/opus'),
    ])

    const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey })

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps('M563YhMmA0S8vEYwkgYa', {
      text: ellipsis(text, plus ? 500 : 100),
      languageCode:
        findClosestMatch(
          interaction.locale,
          ELEVEN_LABS_LANGUAGES.map(language => language.code),
        ) ?? 'ENG',
      modelId: 'eleven_flash_v2_5',
      outputFormat: 'opus_48000_192',
    })

    const buffer = Buffer.from(audio.audioBase64, 'base64')
    const decoded = await decodeOpusBytes(buffer)

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      attachments: [
        {
          id: 0,
          filename: 'tts.opus',
          waveform: getWaveform(decoded),
          duration_secs: decoded.samplesDecoded / decoded.sampleRate,
        },
      ],
      files: [
        {
          name: 'tts.opus',
          data: buffer,
        },
      ],
      flags: MessageFlags.IsVoiceMessage,
    })

    await redis.incr(key)
  },
})
