import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { makeRequest } from '../../../utils/request'
import { RequestMethod, ResponseType } from '../../../types/types'
import env from '../../../utils/env'
import { emoji, hyperlink } from '../../../utils/markdown'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'lastfm',
  description: 'View what you or someone else is listening to',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'username',
      description: 'The Last.fm username to view',
      required: true,
    },
  ],
  cooldown: 5,
  acknowledge: true,
  async run(interaction, options, client) {
    const l = interaction.locale

    const { username } = options

    const lastfmApiKey = env.get('lastfm_api_key')?.toString()

    if (!lastfmApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} ${t(l, 'commands.lastfm.missing_api_key')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const lastfm = await makeRequest('https://ws.audioscrobbler.com/2.0/', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        method: 'user.getrecenttracks',
        user: username,
        api_key: lastfmApiKey,
        format: 'json',
        limit: 1,
      },
    })

    const track = lastfm.recenttracks?.track?.[0]

    if (!track) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} ${t(l, 'commands.lastfm.no_track')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const name = track.name
    const artist = track.artist['#text']

    const spotifyClientId = env.get('spotify_client_id')?.toString()
    const spotifyClientSecret = env.get('spotify_client_secret')?.toString()

    if (!spotifyClientId || !spotifyClientSecret) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} ${t(l, 'commands.lastfm.spotify.missing_credentials')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    const spotifyToken = await makeRequest('https://accounts.spotify.com/api/token', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    })

    const spotify = await makeRequest('https://api.spotify.com/v1/search', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${spotifyToken.access_token}`,
      },
      params: {
        q: `track:${name} artist:${artist}`,
        type: 'track',
        limit: 1,
      },
    })

    const spotifyTrack = spotify.tracks?.items?.[0]

    if (!spotifyTrack) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wrong')} ${t(l, 'commands.lastfm.spotify.track_not_found')}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      })

      return
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: t(l, 'commands.lastfm.listening', {
        username,
        track: hyperlink(spotifyTrack.external_urls.spotify, spotifyTrack.name, '', true),
        artist: hyperlink(spotifyTrack.artists[0].external_urls.spotify, spotifyTrack.artists[0].name),
      }),
    })
  },
})
