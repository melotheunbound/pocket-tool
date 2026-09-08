import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core'
import createApplicationCommand from '../../../builders/command'
import { hyperlink } from '../../../utils/markdown'
import { t } from '../../../utils/localization'

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: {
    global: 'credits',
    'pt-BR': 'créditos',
    "es-ES": 'créditos',
    "es-419": 'créditos',
  },
  description: {
    global: 'View the people who have contributed to Pocket Tool',
    'pt-BR': 'Veja as pessoas que contribuíram para o Pocket Tool',
    "es-ES": 'Veja las personas que han contribuido a Pocket Tool',
    "es-419": 'Veja las personas que han contribuido a Pocket Tool',
  },
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, option, client) {
    const l = interaction.locale

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `-# **${t(l, 'commands.credits.development.title')}**\n> ${hyperlink('https://discord.com/users/782946852278501407', '@melotheunbound')} - ${t(l, 'commands.credits.development.lead_developer')}\n> ${hyperlink('https://discord.com/users/775273108671430677', '@h0gtt')} - ${t(l, 'commands.credits.development.website_developer')}\n-# **${t(l, 'commands.credits.design.title')}**\n> ${hyperlink('https://merpix.de/', 'Merpix')} - ${t(l, 'commands.credits.design.branding')}\n> ${hyperlink('https://discord.com/users/808606684837576714', '@mineturtle2.')} - ${t(l, 'commands.credits.design.emojis')}\n-# **${t(l, 'commands.credits.additional.title')}**\n> ${hyperlink('https://wispbyte.com', 'David Dobos')} - ${t(l, 'commands.credits.additional.hosting_provider')}\n> ${hyperlink('https://discord.com/users/565852514033860629', '@mwyeow')} - ${t(l, 'commands.credits.additional.translation_utils')}`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `-# ${t(l, 'commands.credits.community_message')}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    })
  },
})
