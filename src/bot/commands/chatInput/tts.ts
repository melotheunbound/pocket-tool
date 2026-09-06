import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { findClosestMatch, getAutocompleteFocusedOption, hasPlus } from '../../../utils/utils'
import env from '../../../utils/env'
import { emoji, timestamp, ellipsis } from '../../../utils/markdown'
import { ELEVEN_LABS_LANGUAGES } from '../../constants'
import { redis } from '../../../utils/redis'
import { TimestampStyle } from '../../../types/types'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'tts',
  description: 'Converts text to speech',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'text',
      description: 'The text to convert to speech',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'voice',
      description: 'The voice to use for TTS',
      required: false,
      choices: [
        { name: 'Male', value: 'UgBBYS2sOqTuMpoF3BR0' },
        { name: 'Female', value: 'nf4MCGNSdM0hxM95ZBQR' },
        { name: 'Neutral', value: 'M563YhMmA0S8vEYwkgYa' },
      ],
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'language',
      description: 'The language to use for TTS',
      required: false,
      autocomplete: true,
    },
  ],
  cooldown: 5,
  acknowledge: true,
  async autocomplete(interaction, client) {
    const focused = getAutocompleteFocusedOption(interaction.data.options)
    const value = String(focused?.value ?? '').toLowerCase()

    const languages = ELEVEN_LABS_LANGUAGES.filter(language => {
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
    const { text: rawText, voice, language } = options

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

    const text = rawText.trim()

    if (!text) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please provide some text to convert to speech.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const [{ ElevenLabsClient }, { decodeOpusBytes, getWaveform }] = await Promise.all([
      import('@elevenlabs/elevenlabs-js'),
      import('../../../utils/opus'),
    ])

    const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey })

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voice ?? 'M563YhMmA0S8vEYwkgYa', {
      text: ellipsis(text, plus ? 1000 : 500),
      languageCode:
        findClosestMatch(
          !language || language === 'auto' ? interaction.locale : language,
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
