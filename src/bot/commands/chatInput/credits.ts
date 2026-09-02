import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import { hyperlink } from '../../../utils/markdown';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'credits',
  description: 'View the people who have contributed to Pocket Tool',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, option, client) {
    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `-# **Development:**\n> ${hyperlink('https://discord.com/users/782946852278501407', '@melotheunbound')} - Lead Developer\n> ${hyperlink('https://discord.com/users/775273108671430677', '@h0gtt')} - Website Developer & Contributor\n-# **Design:**\n> ${hyperlink('https://merpix.de/', 'Merpix')} - Responsible for the branding\n> ${hyperlink('https://discord.com/users/808606684837576714', '@mineturtle2.')} - Created the emojis\n-# **Additional:**\n> ${hyperlink('https://wispbyte.com', 'David Dobos')} - Hosting Provider\n\n-# This bot wouldn't exist without the support of our community! Thank you! ❤️`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
