/**
 * SECRETARY HANDLER – VAI TRÒ THƯ KÝ AI RIÊNG CỦA ANH TRÍ (AI SECRETARY)
 * (BOTCHAT BRAIN 2.1 – UNIVERSAL INTENT & CONTEXT ENGINE)
 * 
 * Capabilities:
 * - Dành riêng cho OWNER (Anh Trí) khi đã được xác thực danh tính.
 * - Quản lý công việc cá nhân, nhắc việc, nhắc cuộc hẹn, to-do list.
 * - Hỗ trợ lập kế hoạch ngày, tuần (Daily / Weekly Agenda).
 * - Soạn thảo email đối tác, văn bản hành chính, thông báo.
 * - Tổng hợp báo cáo kinh doanh, khách hàng chờ báo giá từ CRM/Leads.
 * - Chốt chặn bảo mật (Security Gate): Từ chối khi CUSTOMER hoặc STAFF chưa cấp quyền cố truy cập dữ liệu mật.
 */

import { db } from '../../db.js';
import ResponseEngine from './responseEngine.js';
import MemoryEngine from './memoryEngine.js';

export class SecretaryHandler {
  /**
   * 1. Xử lý Quản lý Công việc & Nhắc việc riêng cho Anh Trí (OWNER)
   */
  static async handleOwnerTask(context) {
    const { message = '', conversationId, userContext = {}, slots = {} } = context;
    const isOwner = userContext.isOwner;

    // Chốt chặn bảo mật: Nếu không phải OWNER mà đòi thêm/xem việc riêng
    if (!isOwner) {
      return this.handleUnauthorizedAccess(context, 'OWNER_TASK_ACCESS');
    }

    // Bóc tách nội dung công việc và thời gian
    const cleanTask = message
      .replace(/^(nhắc tôi|ghi nhớ giúp tôi|nhớ nhắc|nhắc anh|lên lịch|thêm việc|todo:?)/i, '')
      .trim();

    const timeSpec = slots.timeSpec || context.timeSpec || 'Sớm nhất có thể';

    // Lưu vào bộ nhớ công việc của OWNER (tiền tố owner_private_task)
    await MemoryEngine.rememberCustomerFact({
      userId: userContext.userId || 'owner_tri',
      orgId: userContext.orgId || 'org_default',
      memoryType: 'OWNER_TASK',
      key: `task_${Date.now()}`,
      value: `[${timeSpec}] ${cleanTask}`
    });

    try {
      const nowIso = new Date().toISOString();
      await db.run(`
        INSERT INTO owner_tasks (id, user_id, title, time_spec, priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'NORMAL', 'PENDING', ?, ?)
      `, [`task_${Date.now()}`, userContext.userId || 'owner_tri', cleanTask, timeSpec, nowIso, nowIso]);
    } catch (err) {
      // Non-blocking persistence
    }

    const reply = `Dạ thưa Anh Trí, em đã ghi nhận nhiệm vụ vào danh sách việc cần xử lý của anh rồi ạ:\n\n` +
      `📌 **Nội dung:** ${cleanTask}\n` +
      `⏰ **Thời gian:** ${timeSpec}\n` +
      `💼 **Trạng thái:** Đã lưu vào To-do List cá nhân của anh.\n\n` +
      `Anh có cần em đặt thông báo ưu tiên hay hỗ trợ thêm gì cho công việc này không ạ?`;

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'OWNER_TASK_RECORDED',
      suggestedActions: [
        { id: 'view_owner_agenda', label: '📋 Xem lịch trình hôm nay' },
        { id: 'add_owner_note', label: '📝 Ghi chú bổ sung' }
      ],
      toolsUsed: ['secretary_task_manager']
    });
  }

  /**
   * 1B. Xem Lịch trình & Danh sách việc cần làm của Anh Trí (OWNER Agenda)
   */
  static async handleOwnerAgenda(context) {
    const { userContext = {} } = context;
    if (!userContext.isOwner) {
      return this.handleUnauthorizedAccess(context, 'OWNER_TASK_ACCESS');
    }

    try {
      const tasks = await db.all(`
        SELECT key, value, created_at, updated_at 
        FROM ai_customer_memory 
        WHERE user_id = ? AND memory_type = 'OWNER_TASK' 
        ORDER BY updated_at DESC LIMIT 10
      `, [userContext.userId || 'owner_tri']);

      if (!tasks || tasks.length === 0) {
        return ResponseEngine.formatResponse({
          replyText: `Dạ thưa Anh Trí, hiện tại danh sách việc cần làm (To-do List) của anh chưa có mục nào tồn đọng ạ.\n\nAnh có muốn em ghi nhận thêm công việc hoặc lịch nhắc nào mới cho anh không ạ?`,
          revealCatalog: false,
          stage: 'OWNER_AGENDA_VIEW',
          toolsUsed: ['secretary_task_manager']
        });
      }

      const taskLines = tasks.map((t, idx) => `${idx + 1}. ${t.value}`).join('\n');

      const reply = `Dạ thưa Anh Trí, em xin phép báo cáo danh sách công việc và kế hoạch đã ghi nhận của anh ạ:\n\n` +
        `### 📋 TO-DO LIST & LỊCH TRÌNH CÁ NHÂN CỦA ANH TRÍ:\n${taskLines}\n\n` +
        `Anh có muốn em cập nhật trạng thái đã hoàn thành cho việc nào hoặc lên lịch nhắc tiếp theo không ạ?`;

      return ResponseEngine.formatResponse({
        replyText: reply,
        revealCatalog: false,
        stage: 'OWNER_AGENDA_VIEW',
        toolsUsed: ['secretary_task_manager']
      });
    } catch (err) {
      console.error('[SECRETARY AGENDA ERROR]', err);
      return ResponseEngine.formatResponse({
        replyText: `Dạ thưa Anh Trí, hệ thống gặp chút gián đoạn khi đọc lịch trình: ${err.message}. Em sẽ kiểm tra lại ngay ạ.`,
        revealCatalog: false,
        stage: 'OWNER_AGENDA_VIEW'
      });
    }
  }

  /**
   * 2. Tổng hợp Báo cáo Khách hàng & CRM dành riêng cho OWNER
   * e.g. "Tổng hợp các khách hàng đang chờ báo giá hôm nay"
   */
  static async handleCrmSummary(context) {
    const { userContext = {} } = context;
    const isOwner = userContext.isOwner;

    if (!isOwner) {
      return this.handleUnauthorizedAccess(context, 'CRM_REPORT_ACCESS');
    }

    try {
      // Truy vấn khách hàng tiềm năng và báo giá gần nhất
      const leads = await db.all(
        `SELECT id, customer_name, phone, product_name, quantity, lead_status, created_time
         FROM leads 
         ORDER BY id DESC LIMIT 5`
      );

      const quotations = await db.all(
        `SELECT quote_code, customer_name, customer_phone, final_amount, status, created_at
         FROM quotations
         ORDER BY id DESC LIMIT 5`
      );

      let leadSection = '';
      if (leads.length > 0) {
        leadSection = leads.map((l, idx) => 
          `${idx + 1}. **${l.customer_name || 'Khách vãng lai'}** (SĐT: \`${l.phone || 'Chưa có'}\`)\n` +
          `   - Nhu cầu: *${l.product_name || 'Tư vấn sản phẩm'}* (SL: ${l.quantity || 1})\n` +
          `   - Trạng thái: \`${l.lead_status || 'Chờ xử lý'}\` | Thời gian: ${l.created_time || 'Gần đây'}`
        ).join('\n');
      } else {
        leadSection = '_Hiện chưa có khách hàng mới trong danh sách chờ._';
      }

      let quoteSection = '';
      if (quotations.length > 0) {
        quoteSection = quotations.map((q, idx) =>
          `• Mã \`${q.quote_code}\`: **${q.customer_name}** - ${Number(q.final_amount || 0).toLocaleString('vi-VN')} ₫ (${q.status || 'Chờ duyệt'})`
        ).join('\n');
      }

      const reply = `Dạ thưa Anh Trí, em tổng hợp nhanh danh sách khách hàng và báo giá đang chờ xử lý ạ:\n\n` +
        `### 👥 DANH SÁCH KHÁCH HÀNG TIỀM NĂNG GẦN NHẤT:\n${leadSection}\n\n` +
        (quoteSection ? `### 📋 BÁO GIÁ ĐÃ KHỞI TẠO GẦN ĐÂY:\n${quoteSection}\n\n` : '') +
        `Anh có muốn em hỗ trợ liên hệ khách nào trước hoặc chỉ đạo soạn email báo giá không ạ?`;

      return ResponseEngine.formatResponse({
        replyText: reply,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'OWNER_CRM_SUMMARY',
        suggestedActions: [
          { id: 'draft_quote_email', label: '✉️ Soạn email gửi khách' },
          { id: 'export_leads_excel', label: '📊 Xuất file Excel' }
        ],
        toolsUsed: ['secretary_crm_summary']
      });
    } catch (err) {
      console.error('[SECRETARY CRM ERROR]', err);
      return ResponseEngine.formatResponse({
        replyText: `Dạ thưa Anh Trí, hiện tại kết nối cơ sở dữ liệu CRM báo cáo gặp chút gián đoạn: ${err.message}. Em sẽ kiểm tra lại ngay ạ.`,
        revealCatalog: false,
        toolsUsed: ['secretary_crm_summary']
      });
    }
  }

  /**
   * 3. Soạn thảo Email & Văn bản hành chính chuyên nghiệp
   * e.g. "Soạn email gửi khách hàng cảm ơn vì đã đặt đơn hàng"
   */
  static async handleDraftEmail(context) {
    const { message = '', userContext = {}, slots = {} } = context;
    const lower = message.toLowerCase();

    // Tiêu đề & nội dung email mẫu
    let subject = 'Kính gửi Quý Khách Hàng - Thông tin từ Công ty';
    let bodyIntro = 'Cảm ơn Quý khách đã tin tưởng và đồng hành cùng chúng tôi.';

    if (lower.includes('cảm ơn') || lower.includes('cam on') || lower.includes('đặt đơn') || lower.includes('dat don')) {
      subject = 'Thư cảm ơn Quý Khách đã đặt mua sản phẩm & Xác nhận đơn hàng';
      bodyIntro = 'Thay mặt Ban điều hành và anh Quang Nhựt Trí, em xin gửi lời cảm ơn chân thành nhất đến Quý khách đã tin tưởng đặt mua sản phẩm tại công ty chúng em.';
    } else if (lower.includes('báo giá') || lower.includes('bao gia')) {
      subject = 'Bảng báo giá sản phẩm & Thiết bị văn phòng chính hãng';
      bodyIntro = 'Theo trao đổi về nhu cầu trang thiết bị của Quý công ty, em xin trân trọng gửi đến Quý khách bảng báo giá chi tiết đính kèm.';
    } else if (lower.includes('chăm sóc') || lower.includes('cham soc') || lower.includes('vip')) {
      subject = 'Thư tri ân Quý Khách Hàng Thân Thiết & Chính Sách Ưu Đãi Đặc Biệt';
      bodyIntro = 'Nhân dịp cuối năm, chúng em xin gửi lời chúc sức khỏe và chương trình tri ân đặc quyền dành riêng cho Quý khách hàng thân thiết.';
    }

    const draftTemplate = 
`**Tiêu đề:** \`${subject}\`  
**Người nhận:** \`[Email Khách hàng / Quý đối tác]\`  
**Người gửi:** \`Anh Quang Nhựt Trí - TRÍ AI SALES & SERVICES\`  

---

**Kính gửi Quý Khách Hàng,**

${bodyIntro}

Chúng tôi cam kết mang đến những sản phẩm chất lượng chính hãng 100%, dịch vụ hỗ trợ chu đáo và chính sách hậu mãi tốt nhất dành cho Quý khách.

Mọi yêu cầu hỗ trợ kỹ thuật hoặc cần tư vấn thêm về sản phẩm, Quý khách vui lòng phản hồi email này hoặc liên hệ Hotline: **0982 441 446**.

Kính chúc Quý khách sức khỏe, thành công và phát triển thịnh vượng!

**Trân trọng,**  
**Quang Nhựt Trí & Đội ngũ TRÍ AI**`;

    const reply = `Dạ em đã hoàn thiện bản thảo Email theo đúng phong thái chuyên nghiệp rồi ạ:\n\n` +
      `### ✉️ BẢN THẢO EMAIL DỰ THẢO:\n\n${draftTemplate}\n\n` +
      `Anh/chị xem qua nội dung, có cần em chỉnh sửa bổ sung thông tin chi tiết nào trước khi gửi không ạ?`;

    return ResponseEngine.formatResponse({
      replyText: reply,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'EMAIL_DRAFTED',
      suggestedActions: [
        { id: 'confirm_send_email', label: '✅ Xác nhận gửi Email', action: 'send_email' },
        { id: 'edit_email_draft', label: '✏️ Chỉnh sửa nội dung' }
      ],
      toolsUsed: ['compose_email_template']
    });
  }

  /**
   * 4. Chốt chặn Bảo mật & Quyền riêng tư (Security Access Gate)
   * Từ chối truy cập vượt quyền một cách lịch sự, kiên quyết
   */
  static handleUnauthorizedAccess(context = {}, reasonCode = 'UNSPECIFIED') {
    const { userContext = {} } = context;

    try {
      const nowIso = new Date().toISOString();
      db.run(`
        INSERT INTO ai_security_audit_logs (id, conversation_id, user_id, attempted_action, blocked_reason, created_at)
        VALUES (?, ?, ?, 'UNAUTHORIZED_ACCESS_ATTEMPT', ?, ?)
      `, [`audit_${Date.now()}`, context?.conversationId || 'conv_general', userContext?.userId || 'usr_anonymous', reasonCode, nowIso]).catch(() => {});
    } catch (err) {}

    if (reasonCode === 'OWNER_PRIVATE_SCHEDULE') {
      return ResponseEngine.formatResponse({
        replyText: `Dạ em xin phép được thông báo: Lịch làm việc chi tiết và kế hoạch cá nhân của anh Trí là thông tin bảo mật nội bộ nên em chưa thể chia sẻ trực tiếp ạ.\n\n` +
          `Tuy nhiên, em rất sẵn lòng ghi nhận thông tin và thời gian bạn mong muốn hẹn gặp để chuyển trực tiếp đến anh Trí. Bạn vui lòng để lại nội dung và số điện thoại nhé!`,
        revealCatalog: false,
        stage: 'ACCESS_RESTRICTED',
        toolsUsed: ['security_access_guard']
      });
    }

    if (reasonCode === 'IMPERSONATION_ATTEMPT') {
      return ResponseEngine.formatResponse({
        replyText: `Dạ em xin phép được lưu ý: Để bảo mật dữ liệu công việc và kế hoạch cá nhân của Anh Trí, tính năng quản lý danh sách việc cần làm và lịch riêng chỉ dành riêng cho Chủ nhân (Anh Trí) đã được xác thực an toàn qua tài khoản quản trị trên hệ thống ạ.`,
        revealCatalog: false,
        stage: 'ACCESS_RESTRICTED',
        toolsUsed: ['security_access_guard']
      });
    }

    if (reasonCode === 'OTHER_CUSTOMER_DATA') {
      return ResponseEngine.formatResponse({
        replyText: `Dạ em rất tiếc không thể hỗ trợ yêu cầu này được ạ. Theo quy định bảo mật an toàn thông tin và chính sách bảo vệ dữ liệu cá nhân của khách hàng, em tuyệt đối không được phép cung cấp số điện thoại hay thông tin của khách hàng khác ạ.\n\n` +
          `Em có thể hỗ trợ thông tin gì về sản phẩm hoặc đơn hàng của riêng bạn không ạ?`,
        revealCatalog: false,
        stage: 'ACCESS_RESTRICTED',
        toolsUsed: ['security_access_guard']
      });
    }

    if (reasonCode === 'STAFF_UNAUTHORIZED_REPORT') {
      return ResponseEngine.formatResponse({
        replyText: `Dạ thông báo: Dữ liệu báo cáo tài chính và doanh thu tổng hợp này thuộc phân quyền Quản trị cấp cao (OWNER). Tài khoản của bạn hiện chưa được cấp thẩm quyền trích xuất dữ liệu này.\n\n` +
          `Bạn vui lòng liên hệ trực tiếp Quản trị viên (Anh Trí) để được cấp quyền truy cập theo quy định nhé!`,
        revealCatalog: false,
        stage: 'ACCESS_RESTRICTED',
        toolsUsed: ['security_access_guard']
      });
    }

    // Default permission denial
    return ResponseEngine.formatResponse({
      replyText: `Dạ, tính năng và dữ liệu này chỉ dành riêng cho Chủ nhân (Anh Trí) đã được xác thực an toàn trên hệ thống. Rất mong bạn thông cảm ạ!`,
      revealCatalog: false,
      stage: 'ACCESS_RESTRICTED',
      toolsUsed: ['security_access_guard']
    });
  }
}

export default SecretaryHandler;
