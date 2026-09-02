import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  InteractionContextType,
} from '@discordjs/core';
import createApplicationCommand from '../../../builders/command';
import {
  applyBlur,
  applyCaption,
  applyFlip,
  applyFlop,
  applyGrayscale,
  applySpeechBubble,
  createPetpetGif,
} from '../../../utils/image';
import { makeRequest } from '../../../utils/request';
import { RequestMethod, ResponseType } from '../../../types/types';
import { cdn } from '../../../utils/markdown';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'image',
  description: 'Play around with image manipulation',
  integrationTypes: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'caption',
      description: 'Add a caption to an image',
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: 'image',
          description: 'The image to add a caption to',
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'caption',
          description: 'The caption to add to the image',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'grayscale',
      description: 'Convert an image to grayscale',
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: 'image',
          description: 'The image to convert to grayscale',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'blur',
      description: 'Apply a blur effect to an image',
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: 'image',
          description: 'The image to apply a blur effect to',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'flip',
      description: 'Flip an image vertically',
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: 'image',
          description: 'The image to flip vertically',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'flop',
      description: 'Flip an image horizontally',
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: 'image',
          description: 'The image to flip horizontally',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'speech-bubble',
      description: 'Add a speech bubble to an image',
      options: [
        {
          type: ApplicationCommandOptionType.Attachment,
          name: 'image',
          description: 'The image to add a speech bubble to',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'petpet',
      description: 'Add a petpet effect to an image',
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: 'user',
          description: 'The  user whose avatar to add a petpet effect to',
          required: true,
        },
      ],
    },
  ],
  acknowledge: true,
  async run(interaction, options, client) {
    const { caption, grayscale, blur, flip, flop, 'speech-bubble': speechBubble, petpet } = options;

    if (caption) {
      const { image, caption: text } = caption;

      const buffer = await makeRequest(image.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const captioned = await applyCaption(buffer, text);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'captioned.png',
          },
        ],
        files: [
          {
            name: 'captioned.png',
            data: captioned,
          },
        ],
      });
    } else if (grayscale) {
      const { image } = grayscale;

      const buffer = await makeRequest(image.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const grayscaled = await applyGrayscale(buffer);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'grayscaled.png',
          },
        ],
        files: [
          {
            name: 'grayscaled.png',
            data: grayscaled,
          },
        ],
      });
    } else if (blur) {
      const { image } = blur;

      const buffer = await makeRequest(image.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const blurred = await applyBlur(buffer);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'blurred.png',
          },
        ],
        files: [
          {
            name: 'blurred.png',
            data: blurred,
          },
        ],
      });
    } else if (flip) {
      const { image } = flip;

      const buffer = await makeRequest(image.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const flipped = await applyFlip(buffer);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'flipped.png',
          },
        ],
        files: [
          {
            name: 'flipped.png',
            data: flipped,
          },
        ],
      });
    } else if (flop) {
      const { image } = flop;

      const buffer = await makeRequest(image.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const flopped = await applyFlop(buffer);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'flopped.png',
          },
        ],
        files: [
          {
            name: 'flopped.png',
            data: flopped,
          },
        ],
      });
    } else if (speechBubble) {
      const { image } = speechBubble;

      const buffer = await makeRequest(speechBubble.image.url, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const speechBubbled = await applySpeechBubble(buffer);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'speechBubbled.png',
          },
        ],
        files: [
          {
            name: 'speechBubbled.png',
            data: speechBubbled,
          },
        ],
      });
    } else if (petpet) {
      let { user: target } = petpet;

      if (!target) {
        target = {
          user: (interaction.user ?? interaction.member?.user)!,
        };
      }

      const { user } = target;

      const avatar = user.avatar
        ? cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true)
        : cdn(`/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}`, 4096, 'png');

      const buffer = await makeRequest(avatar, {
        method: RequestMethod.GET,
        response: ResponseType.BUFFER,
      });

      const petpeted = await createPetpetGif(buffer);

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        attachments: [
          {
            id: 0,
            filename: 'petpeted.gif',
          },
        ],
        files: [
          {
            name: 'petpeted.gif',
            data: petpeted,
          },
        ],
      });
    }
  },
});
