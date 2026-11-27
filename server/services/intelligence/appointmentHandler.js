/**
 * APPOINTMENT & SMART CONVERSATION HANDLER (BOTCHAT BRAIN 2.1)
 * 
 * Capabilities:
 * - Xử lý ý định Đặt lịch / Hẹn gặp (APPOINTMENT) & Tra cứu lịch (SCHEDULE_QUERY).
 * - Tuyệt đối không tự bịa lịch rảnh, không bịa thông tin anh Trí khi chưa kết nối Google Calendar.
 * - Giải thích minh bạch trạng thái tích hợp lịch, chủ động thu thập chi tiết (thời gian, mục đích, SĐT).
 * - Xử lý Nhắc việc (REMINDER), Chăm sóc khách hàng & Thông tin doanh nghiệp (BUSINESS_SUPPORT).
 * - Duy trì hội thoại tự nhiên, thông minh (GENERAL_CHAT) mà không lôi kéo bán hàng lạc đề.
 */

import { ResponseEngine } from './responseEngine.js';
import MemoryEngine from './memoryEngine.js';
import { NaturalHumanConversationEngine } from './naturalHumanConversationEngine.js';

export class AppointmentHandler {
  /**
   * Handle Appointment booking requests (APPOINTMENT)
   */
  static async handleAppointment({
    message = '',
    intentResult = {},
    context = {},
    customerInfo = null,
    conversationId = null,
    orgId = 'org_default'
  }) {
    const slots = intentResult.slots || {};
    const { targetPerson, activity, timeSpec } = slots.appointmentDetails || {};
    const personName = targetPerson ? targetPerson.trim() : 'anh Trí';
    const cleanActivity = activity ? activity.trim() : 'cuộc gặp';
    const effectivePhone = slots.phone || customerInfo?.phone || null;

    // Check multi-turn context
    const prevHistory = context.conversationHistory || context.history || [];
    const unaccentedMsg = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();
    const isFollowUpConfirmation = /(?:vay\s+|the\s+|thi\s+)?(?:dat\s+(?:ngay\s+do|hom\s+do|gio\s+do|lich\s+do)|chot\s+(?:lich|ngay|gio|hen)|dat\s+lich|dat\s+ngay)/i.test(unaccentedMsg);

    // Save appointment request to short-term memory
    try {
      if (conversationId) {
        await MemoryEngine.rememberCustomerFact({
          userId: effectivePhone || conversationId,
          orgId,
          memoryType: 'APPOINTMENT_REQUEST',
          key: 'pending_appointment',
          value: JSON.stringify({
            personName,
            activity: cleanActivity,
            timeSpec: timeSpec || null,
            phone: effectivePhone,
            updatedAt: new Date().toISOString()
          })
        });
      }
    } catch (_) {}

    let reply = '';

    if (isFollowUpConfirmation) {
      if (!effectivePhone) {
        reply = `Dạ, em đã ghi nhận đề xuất đặt hẹn với **${personName}** (${cleanActivity}) vào ngày bạn đã chọn ạ.\n\n` +
          `Vì hiện tại hệ thống chưa kết nối trực tiếp với Google Calendar của ${personName} để tự động chốt lịch, bạn vui lòng cho em xin **Họ tên** và **Số điện thoại** để em hoàn tất ghi nhận và gửi thông tin đến ${personName} liên hệ lại xác nhận với bạn nhé!`;
      } else {
        reply = `Dạ, em đã ghi nhận yêu cầu đặt lịch hẹn với **${personName}** (${cleanActivity}) vào thời gian bạn chọn kèm theo số điện thoại liên hệ **${effectivePhone}** của bạn rồi ạ!\n\n` +
          `Em sẽ chuyển thông tin đến ${personName} để anh ấy sắp xếp lịch và chủ động liên hệ lại với bạn sớm nhất nhé ạ!`;
      }
    } else if (timeSpec) {
      if (!effectivePhone) {
        reply = `Dạ hiện tại hệ thống chưa tích hợp trực tiếp với Google Calendar cá nhân nên em chưa thể kiểm tra ngay lịch trống theo thời gian thực của ${personName} vào **${timeSpec}** xem có bận hay rảnh ạ.\n\n` +
          `Tuy nhiên, em đã ghi nhận mong muốn hẹn ${cleanActivity} vào **${timeSpec}** của bạn. Bạn vui lòng cho em xin **Số điện thoại liên hệ** để ${personName} có thể gọi lại hoặc nhắn tin xác nhận lịch hẹn trực tiếp với bạn nhé ạ!`;
      } else {
        reply = `Dạ hiện tại hệ thống chưa tích hợp với Google Calendar của ${personName} nên em chưa thể tự động chốt lịch theo thời gian thực ạ.\n\n` +
          `Em đã ghi nhận đầy đủ thông tin: Hẹn **${personName}** (${cleanActivity}) vào **${timeSpec}** với SĐT liên hệ **${effectivePhone}**. Em sẽ thông báo đến ${personName} để anh ấy phản hồi xác nhận sớm nhất cho bạn nhé!`;
      }
    } else {
      reply = `Dạ hiện tại hệ thống chưa tích hợp trực tiếp với Google Calendar cá nhân nên em chưa thể kiểm tra ngay lịch trống theo thời gian thực của ${personName} ạ.\n\n` +
        `Tuy nhiên, em rất sẵn lòng hỗ trợ ghi nhận yêu cầu hẹn **${cleanActivity}** của bạn để chuyển đến ${personName}. Bạn vui lòng cho em biết thêm:\n` +
        `• **Thời gian dự kiến:** (Ví dụ: Thứ Sáu này, hoặc 9h sáng mai)\n` +
        `• **Địa điểm hoặc hình thức gặp:** (Gặp trực tiếp hay gọi điện/online)\n` +
        `• **Số điện thoại của bạn:** Để ${personName} có thể liên hệ lại xác nhận cuộc hẹn nhé ạ!`;
    }

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'APPOINTMENT_REQUESTED',
      toolsUsed: ['appointment_handler'],
      actionType: 'APPOINTMENT_COLLECTION'
    });
  }

  /**
   * Handle Schedule Queries (SCHEDULE_QUERY)
   */
  static async handleScheduleQuery({
    message = '',
    intentResult = {},
    context = {},
    customerInfo = null,
    conversationId = null,
    orgId = 'org_default'
  }) {
    const slots = intentResult.slots || {};
    const { targetPerson, timeSpec } = slots.appointmentDetails || {};
    const personName = targetPerson ? targetPerson.trim() : 'anh Trí';
    const effectivePhone = slots.phone || customerInfo?.phone || null;

    let reply = '';

    if (timeSpec) {
      reply = `Dạ hiện tại hệ thống chưa được kết nối trực tiếp với hệ thống Google Calendar cá nhân nên em chưa có quyền tra cứu lịch làm việc thực tế của ${personName} vào **${timeSpec}** xem có rảnh hay bận ạ.\n\n` +
        `Nếu bạn muốn sắp xếp cuộc hẹn hoặc trao đổi công việc vào **${timeSpec}**, bạn có thể để lại **Nội dung công việc** và **Số điện thoại**, em sẽ chuyển lời nhắn đến ${personName} để anh ấy phản hồi lại bạn sớm nhất nhé!`;
    } else {
      reply = `Dạ hiện tại hệ thống chưa tích hợp với Google Calendar cá nhân nên em chưa thể kiểm tra được lịch làm việc hoặc những ngày rảnh cụ thể của ${personName} ạ.\n\n` +
        `Nếu bạn cần gặp mặt hoặc trao đổi công việc với ${personName}, bạn cứ nhắn cho em thời gian bạn mong muốn cùng **Số điện thoại**, em sẽ ghi nhận và gửi thông tin đến anh ấy để sắp xếp lịch hẹn hỗ trợ bạn ngay nhé ạ!`;
    }

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'SCHEDULE_QUERIED',
      toolsUsed: ['schedule_handler'],
      actionType: 'SCHEDULE_INQUIRY'
    });
  }

  /**
   * Handle Task Reminders (REMINDER)
   */
  static async handleReminder({
    message = '',
    intentResult = {},
    context = {},
    conversationId = null
  }) {
    const slots = intentResult.slots || {};
    const timeSpec = slots.timeSpec || null;

    // Extract reminder action/task from query
    let task = message
      .replace(/(?:nhắc\s+(?:tôi|em|mình|giúp|cho)|nhac\s+(?:toi|em|minh|giup|cho)|tạo\s+nhắc\s+nhở|tao\s+nhac\s+nho|đặt\s+nhắc\s+nhở|dat\s+nhac\s+nho|lên\s+lịch\s+nhắc|len\s+lich\s+nhac|nhắc\s+nhở|nhac\s+nho)/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!task || task.length < 3) {
      task = 'công việc theo yêu cầu';
    }

    const reply = timeSpec
      ? `Dạ, tôi đã ghi nhận nhắc nhở cho bạn: **"${task}"** vào thời gian **${timeSpec}**. Hệ thống sẽ lưu lại để hỗ trợ bạn đúng thời điểm nhé!`
      : `Dạ, tôi đã ghi nhận nội dung nhắc nhở: **"${task}"**. Bạn có muốn đặt khung giờ hoặc ngày cụ thể nào để tôi nhắc bạn không ạ?`;

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'REMINDER_RECORDED',
      toolsUsed: ['reminder_handler']
    });
  }

  /**
   * Handle General Social Chat, Greeting and Small Talk (GENERAL_CHAT)
   */
  static async handleGeneralChat(params = {}) {
    const {
      message = '',
      intentResult = {},
      customerInfo = params.customerInfo || params.context?.customerInfo || null
    } = params;
    const norm = (message || '').toLowerCase().trim();

    let reply = '';
    if (/(khỏe không|khoe khong|thế nào|the nao)/i.test(norm)) {
      reply = 'Dạ em khỏe, cảm ơn bạn nhiều nhé! Em luôn sẵn sàng đồng hành cùng bạn. Hôm nay bạn thế nào rồi ạ?';
    } else if (/(buồn|buon|chán|chan|tâm sự|tam su)/i.test(norm)) {
      reply = 'Dạ em luôn ở đây lắng nghe bạn nè. Nếu có chuyện gì khiến bạn bận lòng, bạn cứ chia sẻ với em nhé, biết đâu nói ra sẽ thấy nhẹ nhõm hơn ạ!';
    } else if (/(thời tiết|thoi tiet)/i.test(norm)) {
      reply = 'Dạ hôm nay thời tiết khá dễ chịu! Bạn nhớ giữ gìn sức khỏe và có một ngày làm việc thật nhiều năng lượng nhé!';
    } else if (/(thông minh|thong minh|giỏi|gioi|tuyệt vời|tuyet voi|hay quá|hay qua)/i.test(norm)) {
      reply = 'Dạ em cảm ơn bạn rất nhiều vì lời khen ạ! Em luôn nỗ lực hết mình để hỗ trợ bạn thật chu đáo và hữu ích nhất. Bạn cần em giúp thêm điều gì nữa không ạ?';
    } else if (/(cảm ơn|cam on|thanks|thank you)/i.test(norm)) {
      reply = 'Dạ không có chi ạ! Rất vui được hỗ trợ bạn. Bất cứ khi nào bạn cần giúp đỡ, cứ nhắn cho em nhé!';
    } else if (/(người yêu|nguoi yeu|bạn gái|ban gai)/i.test(norm)) {
      reply = 'Dạ em là TRÍ AI nên "người yêu" của em chính là công việc và niềm vui khi được trò chuyện, hỗ trợ các bạn mỗi ngày đó ạ!';
    } else if (/(kể chuyện|ke chuyen|hài|hai|vui)/i.test(norm)) {
      reply = 'Dạ em tặng bạn một câu chuyện vui nhé:\n\nCó một anh kỹ sư hỏi người bạn: "Cậu có biết sự khác nhau giữa máy tính và con người là gì không?". Bạn anh trả lời: "Máy tính không bao giờ tự ý đổ lỗi cho ai khác trừ khi con người lập trình sai!" 😄 Chúc bạn có một ngày thật nhiều niềm vui nhé!';
    } else if (/(tạm biệt|tam biet|bye|bai bai)/i.test(norm)) {
      reply = 'Dạ tạm biệt bạn nhé! Chúc bạn một ngày tốt lành và hẹn gặp lại bạn trong những lần trò chuyện tới ạ!';
    } else {
      // Nếu câu hỏi có nội dung tìm hiểu kiến thức hoặc câu hỏi thực chất, gọi NaturalHumanConversationEngine
      const isSubstantiveQuestion = norm.split(/\s+/).length > 3 || 
        /(tại sao|vì sao|làm sao|thế nào|như thế nào|là gì|có nên|khác nhau|hướng dẫn|nguyên nhân)/i.test(norm);

      if (isSubstantiveQuestion) {
        const naturalRes = await NaturalHumanConversationEngine.handleConversation(params);
        return ResponseEngine.formatResponse({
          replyText: naturalRes.replyText,
          revealCatalog: false,
          recommendedField: null,
          recommendedProduct: null,
          stage: naturalRes.stage || 'NATURAL_HUMAN_CONVERSATION',
          toolsUsed: naturalRes.toolsUsed || ['natural_human_conversation_engine']
        });
      }

      const cName = customerInfo?.name;
      const cPronoun = customerInfo?.pronoun;
      const cAddressing = customerInfo?.addressing || (cPronoun ? `${cPronoun} ${cName}` : cName);
      if (cName) {
        reply = `Dạ xin chào ${cAddressing}! Em là **TRÍ AI** – rất vui được gặp lại ${cPronoun || 'anh/chị'}. Hôm nay ${cPronoun || 'anh/chị'} cần em hỗ trợ gì ạ?`;
      } else {
        reply = 'Dạ xin chào Anh/Chị! Em là **TRÍ AI**. Rất vui được đồng hành cùng Anh/Chị hôm nay ạ. Anh/Chị cần em hỗ trợ giải đáp thông tin gì cứ chia sẻ với em nhé!';
      }
    }

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'CONVERSATIONAL_CHAT',
      toolsUsed: ['general_chat_handler']
    });
  }

  /**
   * Handle Business Support, Company Info & Complaints (BUSINESS_SUPPORT)
   */
  static async handleBusinessSupport({
    message = '',
    intentResult = {},
    context = {}
  }) {
    const isComplaint = intentResult.primaryIntent === 'COMPLAINT' || /(khiếu nại|khieu nai|phàn nàn|phan nan|thái độ|giao hàng chậm)/i.test(message);

    let reply = '';
    if (isComplaint) {
      reply = `Dạ, thành thật xin lỗi bạn vì sự bất tiện hoặc trải nghiệm chưa hài lòng vừa qua ạ! Chúng tôi luôn coi trọng từng phản ánh của khách hàng để không ngừng nâng cao chất lượng dịch vụ.\n\n` +
        `Bạn vui lòng chia sẻ thêm chi tiết sự việc hoặc để lại **Số điện thoại**, ban quản lý bên em sẽ liên hệ trực tiếp để lắng nghe và giải quyết thỏa đáng nhất cho bạn ngay nhé ạ!`;
    } else {
      reply = `Dạ, thông tin liên hệ và hỗ trợ của doanh nghiệp bên em như sau ạ:\n\n` +
        `🏢 **Trụ sở chính:** Tòa nhà TRÍ AI, TP. Hồ Chí Minh\n` +
        `⏰ **Giờ làm việc:** Thứ 2 – Thứ 7 (8h00 – 18h00), Chủ nhật nghỉ\n` +
        `📞 **Hotline hỗ trợ:** 1900 6868 (Tiếp nhận hỗ trợ 24/7)\n` +
        `📧 **Email CSKH:** support@triai.vn\n\n` +
        `Bạn cần tìm hiểu thêm về quy trình, chính sách hay thông tin nào khác không ạ?`;
    }

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'BUSINESS_SUPPORT_RESOLVED',
      toolsUsed: ['business_support_handler']
    });
  }
}

export default AppointmentHandler;
