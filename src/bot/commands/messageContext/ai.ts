import { ApplicationCommandType, ApplicationIntegrationType, ComponentType, InteractionContextType, MessageFlags } from '@discordjs/core';
import { RateLimitType } from '../../../types/types.js';
import env from '../../../utils/env.js';
import { msToApproxTime } from '../../../utils/utils.js';
import OpenAI from 'openai';
import proxyFetch from '../../../utils/proxyFetch.js';
import { emoji, truncate } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';
import type { APIAttachment } from '@discordjs/core';
import type { ChatCompletionContentPart } from 'openai/resources/index.mjs';

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Ask AI',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, api) {
    const nvidiaApiKey = env.get('nvidia_api_key', true).toString();

    if (!nvidiaApiKey) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} NVIDIA API key not set`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    if (!message) return;

    let prompt: string = '';
    let attachment: APIAttachment | undefined;

    let referenced;

    if (message.message_reference?.message_id) {
      referenced = await api.channels.getMessage(message.message_reference.channel_id, message.message_reference.message_id).catch(() => undefined);
    }

    const messageAttachments = Object.values(message.attachments ?? {});
    const referencedAttachments = Object.values(referenced?.attachments ?? {});

    attachment =
      messageAttachments.find((a) => a.content_type?.startsWith('image/')) ?? referencedAttachments.find((a) => a.content_type?.startsWith('image/'));

    if (!message.content && !referenced?.content && !attachment) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please select a valid message to ask AI about`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (referenced?.content) {
      prompt += `Referenced message:\n${referenced.content}\n\n`;
    }

    if (message.content) {
      prompt += `Selected message:\n${message.content}`;
    }

    prompt = prompt.trim();

    const start = performance.now();

    const openai = new OpenAI({ apiKey: nvidiaApiKey, baseURL: 'https://integrate.api.nvidia.com/v1', fetch: proxyFetch as any });

    let messageContext = '';
    if (interaction.channel_id) {
      try {
        const messages = (await api.channels.getMessages(interaction.channel_id, { limit: 5 })).reverse();
        for (const msg of messages) {
          const displayName = msg.author.global_name || msg.author.username;
          const content = msg.content && msg.content.length > 512 ? msg.content.substring(0, 512) + '...' : msg.content || '';
          messageContext += `Name: ${displayName}\n${content}\n\n`;
        }
      } catch (e) {
      }
    }

    const interactionUser = interaction.member?.user || interaction.user;
    const interactionDisplayName = interactionUser?.global_name || interactionUser?.username || 'User';

    const model = attachment ? 'meta/llama-3.2-90b-vision-instruct' : 'meta/llama-3.3-70b-instruct';

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a friendly Discord chat bot, called Pocket Tool, designed to help people.\n- Today\'s date is ${new Date().toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- You should always use gender neutral pronouns when possible.\n- When answering a question, be concise and to the point.\n- Try to answer with short responses. This does not apply to subjects that require more exhaustive or in-depth explanation.\n- Respond in a natural way, using Discord's supported markdown formatting.\n- If images are attached, analyze all relevant visual details carefully before answering.\n- If no text content is available, rely on the visual details of the image(s) to provide a meaningful response.\n- If a referenced message is available, use it to provide context for your response.\n- Name of the User that asked the Question: ${interactionDisplayName}\n- If other messages in the chat context are irrelevant to the user's question, just ignore them and do not mention them.`,
        },
        {
          role: 'user',
          content: [
            ...(messageContext ? [{ type: 'text', text: `Recent chat context:\n${messageContext}Question:\n` } as ChatCompletionContentPart] : []),
            ...(prompt ? ([{ type: 'text', text: prompt }] satisfies ChatCompletionContentPart[]) : []),
            ...(attachment && model === 'meta/llama-3.2-90b-vision-instruct'
              ? ([{ type: 'image_url', image_url: { url: attachment.url } }] satisfies ChatCompletionContentPart[])
              : []),
          ] as ChatCompletionContentPart[],
        },
      ],
      max_completion_tokens: 2000,
    });

    const end = performance.now();
    const elapsed = end - start;

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0]) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} No response from AI. Please try again`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${truncate(completion.choices[0].message.content!, 2000)}\n-# **${completion.model}** - Response may be inaccurate or incomplete - Took **${msToApproxTime(elapsed)}**`,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
