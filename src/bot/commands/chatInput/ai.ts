import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { RateLimitType } from '../../../types/types.js';
import env from '../../../utils/env.js';
import { emoji, truncate } from '../../../utils/markdown.js';
import { msToApproxTime } from '../../../utils/utils.js';
import OpenAI from 'openai';
import proxyFetch from '../../../utils/proxyFetch.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'ai',
  description: 'Ask AI anything you want!',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'prompt',
      description: 'The prompt to send to the AI',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, api) {
    const { prompt } = options;

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

    const start = performance.now();

    const openai = new OpenAI({ apiKey: nvidiaApiKey, baseURL: 'https://integrate.api.nvidia.com/v1', fetch: proxyFetch as any });

    let systemContext = '';
    let messageContext = '';

    const interactionUser = interaction.member?.user || interaction.user;
    const interactionDisplayName = interactionUser?.global_name || interactionUser?.username || 'User';
    systemContext = `\n- User which asked the question: ${interactionDisplayName}\n- If other messages in the chat context are irrelevant to the user's question, just ignore them and do not mention them.`;

    if (interaction.channel_id) {
      try {
        const messages = await api.channels.getMessages(interaction.channel_id, { limit: 5 });
        const recentMessages = messages.reverse();
        
        for (const msg of recentMessages) {
          const displayName = msg.author.global_name || msg.author.username;
          let content = msg.content || '';
          if (content.length > 512) {
            content = content.substring(0, 512) + '...';
          }
          messageContext += `Name: ${displayName}\n${content}\n\n`;
        }
      } catch (e) {
      }
    }

    const finalUserPrompt = messageContext ? `Recent chat context:\n${messageContext}Question:\n${prompt}` : prompt;

    const completion = await openai.chat.completions.create({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [
        {
          role: 'system',
          content: `You are a friendly Discord chat bot, called Pocket Tool, designed to help people.\n- Today\'s date is ${new Date().toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- You should always use gender neutral pronouns when possible.\n- When answering a question, be concise and to the point.\n- Try to answer with short responses. This does not apply to subjects that require more exhaustive or in-depth explanation.\n- Respond in a natural way, using Discord's supported markdown formatting.${systemContext}`,
        },
        {
          role: 'user',
          content: finalUserPrompt,
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
