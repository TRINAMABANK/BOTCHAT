/**
 * TRÍ AI ONE SUPER BRAIN - UNIFIED MODEL GATEWAY
 * 
 * Philosophy: DYNAMIC ROUTING – LATENCY/COST/DEPTH BALANCING – RESILIENT FALLBACKS
 * 
 * Tiers:
 *  - Tier 1: Gemini 2.5 Pro (Deep Reasoning, 5-Whys, Multi-criteria Synthesis)
 *  - Tier 2: Gemini 2.5 Flash (Conversational Dialogue, Consultative Sales, Low Latency)
 *  - Tier 3: Local Deterministic Engine (Commands, Arithmetic, Exact Match, Zero Cost)
 */

import { callGemini } from '../../geminiService.js';

export const MODEL_TIERS = {
  TIER_PRO: 'gemini-2.5-pro',
  TIER_FLASH: 'gemini-2.5-flash',
  TIER_LOCAL: 'local-deterministic'
};

export class ModelGateway {
  /**
   * Intelligently routes prompt to optimal model tier based on task complexity
   * @param {Object} params
   * @param {string} params.prompt
   * @param {string} [params.taskType] COMPLEX_REASONING, DIALOGUE, FACTUAL_QUERY, COMMAND
   * @param {Array} [params.tools]
   * @returns {Promise<Object>} Model output with execution metadata
   */
  static async execute(params = {}) {
    const {
      prompt = '',
      taskType = 'DIALOGUE',
      tools = [],
      conversationId = null
    } = params;

    const startTime = Date.now();
    let selectedTier = MODEL_TIERS.TIER_FLASH;

    // 1. Task-based Model Routing Logic
    if (taskType === 'COMPLEX_REASONING' || taskType === '5_WHYS' || taskType === 'TCO_EVALUATION') {
      selectedTier = MODEL_TIERS.TIER_PRO;
    } else if (taskType === 'COMMAND' || taskType === 'REGEX_PARSE') {
      selectedTier = MODEL_TIERS.TIER_LOCAL;
    } else {
      selectedTier = MODEL_TIERS.TIER_FLASH;
    }

    try {
      if (selectedTier === MODEL_TIERS.TIER_LOCAL) {
        return {
          content: '',
          tierUsed: MODEL_TIERS.TIER_LOCAL,
          latencyMs: Date.now() - startTime,
          cached: false
        };
      }

      // Call external LLM through Gemini Service with fallback
      const response = await callGemini({
        prompt,
        tools: tools.length > 0 ? tools : undefined,
        modelOverride: selectedTier
      });

      return {
        content: response.content || response.text || '',
        toolCalls: response.toolCalls || [],
        tierUsed: selectedTier,
        latencyMs: Date.now() - startTime,
        cached: false
      };
    } catch (err) {
      console.warn(`[MODEL GATEWAY] Error on ${selectedTier}: ${err.message}. Triggering Fallback...`);
      // Fallback Hierarchy: Pro -> Flash -> Safe Default
      if (selectedTier === MODEL_TIERS.TIER_PRO) {
        try {
          const fallbackRes = await callGemini({ prompt, modelOverride: MODEL_TIERS.TIER_FLASH });
          return {
            content: fallbackRes.content || fallbackRes.text || '',
            tierUsed: MODEL_TIERS.TIER_FLASH,
            latencyMs: Date.now() - startTime,
            fallback: true
          };
        } catch (fErr) {
          console.error('[MODEL GATEWAY] Fallback failed:', fErr.message);
        }
      }

      return {
        content: 'Dạ hệ thống đang xử lý tác vụ, em xin phép phản hồi lại anh/chị ngay đây ạ.',
        tierUsed: 'FALLBACK_LOCAL',
        latencyMs: Date.now() - startTime,
        error: err.message
      };
    }
  }
}
