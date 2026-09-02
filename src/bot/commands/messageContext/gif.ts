import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import { emoji } from '../../../utils/markdown';
import { makeRequest } from '../../../utils/request';
import { RequestMethod, ResponseType } from '../../../types/types';
import sharp from 'sharp';

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Turn Into GIF',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  cooldown: 3,
  acknowledge: true,
  async run(interaction, client) {
    const message = interaction.data.resolved.messages[interaction.data.target_id];

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
      });

      return;
    }

    if (!message || message.attachments.length === 0) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please select an image to turn into a GIF.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const attachments = Object.values(message.attachments)
      .filter((attachment) => attachment.content_type?.startsWith('image/'))
      .slice(0, 10);

    if (!attachments.length) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Exclamation')} Please select at least one image to turn into a GIF.`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const files = await Promise.all(
      attachments.map(async (attachment, index) => {
        const buffer = await makeRequest(attachment.url, {
          method: RequestMethod.GET,
          response: ResponseType.BUFFER,
        });

        const gif = await sharp(buffer).gif({ effort: 10 }).toBuffer();

        return {
          name: `gif-${index + 1}.gif`,
          data: gif,
        };
      }),
    );

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `-# ${emoji('GIF')} Hover over the GIFs to add them to your favorites!`,
      files,
    });
  },
});
