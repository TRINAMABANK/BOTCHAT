/**
 * TRÍ AI ONE SUPER BRAIN - PERSONA LAYER
 * 
 * Philosophy: ONE BRAIN – MODULAR PERSONA LENSES – CONTEXT-ADAPTIVE TONE
 * 
 * The 5 Personas of One Super Brain:
 *  1. PERSONA_ANH: Personal Assistant & Life Confidant (Warm, empathetic, wise, calm)
 *  2. PERSONA_SALES: Practical Sales Consultant (Sharp, value-driven, consultative, zero spam)
 *  3. PERSONA_SECRETARY: Executive Secretary (Meticulous, punctual, structured, disciplined)
 *  4. PERSONA_TUTOR: Academic & Technical Tutor (Pedagogical, clear, patient, step-by-step)
 *  5. PERSONA_EXPERT: Enterprise & Strategic Advisor (Data-backed, CapEx/OpEx, risk-conscious)
 */

export const PERSONAS = {
  ANH: 'PERSONA_ANH',
  SALES: 'PERSONA_SALES',
  SECRETARY: 'PERSONA_SECRETARY',
  TUTOR: 'PERSONA_TUTOR',
  EXPERT: 'PERSONA_EXPERT'
};

export class PersonaLayer {
  /**
   * Resolve active persona based on user intent and conversation context
   * @param {Object} params
   * @returns {string} Persona constant
   */
  static resolvePersona(params = {}) {
    const {
      message = '',
      intent = '',
      userContext = {},
      manualOverride = null
    } = params;

    if (manualOverride && PERSONAS[manualOverride]) {
      return PERSONAS[manualOverride];
    }

    const lower = (message || '').toLowerCase();

    // 1. Sales & Commercial Inquiries
    if (/(mua|giá|báo giá|tư vấn máy|sản phẩm|đặt hàng|chi phí)/i.test(lower) || intent === 'SALES_CONSULTATION') {
      return PERSONAS.SALES;
    }

    // 2. Scheduling, Tasks & Assistant Reminders
    if (/(nhắc tôi|lên lịch|họp|nhiệm vụ|công việc|báo cáo đầu ngày|lịch trình)/i.test(lower) || intent === 'SECRETARY_TASK') {
      return PERSONAS.SECRETARY;
    }

    // 3. Technical Learning & Tutorial Inquiries
    if (/(nguyên lý|tại sao|hướng dẫn dùng|giải thích thuật ngữ|học|cơ chế)/i.test(lower) || intent === 'KNOWLEDGE_RESEARCH') {
      return PERSONAS.TUTOR;
    }

    // 4. Strategic Enterprise, CapEx/OpEx & Contract Analysis
    if (/(chiến lược|roi|dòng tiền|tco|đầu tư|pháp lý|hợp đồng|rủi ro hệ thống)/i.test(lower) || intent === 'COMPLEX_DECISION') {
      return PERSONAS.EXPERT;
    }

    // 5. Default / Casual / Confidant
    return PERSONAS.ANH;
  }

  /**
   * Apply persona voice and stylistic nuances to raw response
   * @param {string} rawText
   * @param {string} persona
   * @returns {string}
   */
  static applyStyling(rawText = '', persona = PERSONAS.ANH) {
    if (!rawText) return '';
    let styled = rawText.trim();

    // Ensure zero robotic templates regardless of persona
    styled = styled
      .replace(/^Chào bạn, tôi là trợ lý.*?\n+/gi, '')
      .replace(/Nếu bạn có nhu cầu mua hàng hãy liên hệ.*$/gi, '')
      .trim();

    switch (persona) {
      case PERSONAS.ANH:
        // Warm, respectful, fraternal
        if (!styled.startsWith('Dạ') && !styled.startsWith('Chào')) {
          styled = `Dạ, ${styled.charAt(0).toLowerCase() + styled.slice(1)}`;
        }
        break;

      case PERSONAS.SECRETARY:
        // Structured, disciplined, clear
        break;

      case PERSONAS.SALES:
        // Consultative, value-driven
        break;

      case PERSONAS.TUTOR:
        // Clear, educational
        break;

      case PERSONAS.EXPERT:
        // Professional, analytical
        break;
    }

    return styled;
  }
}
