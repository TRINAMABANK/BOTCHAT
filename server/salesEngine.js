import { randomUUID } from 'crypto';
import db from './db.js';

async function callOpenAI(messages) {
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.startsWith('sk-')) {
    return null;
  }
  const endpoint = `${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.65
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  str = str.replace(/\u02C6|\u0306|\u031B/g, '');
  return str;
}

export class SalesEngine {
  /**
   * Main chat processing pipeline
   */
  static async processMessage({ conversationId, message, selectedProduct, actionType, customerInfo }) {
    const now = new Date().toISOString();
    let convId = conversationId;

    // 1. Fetch current bot settings
    const settingsList = await db.all('SELECT key, value FROM bot_settings');
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const botName = settings.bot_name || 'TRÍ AI SALES ROBOT';
    const ownerName = settings.owner_name || 'Quang Nhựt Trí';
    const phonePrompt = settings.phone_invitation_prompt || 'Tôi có thể ghi nhận yêu cầu để chủ nhân trực tiếp liên hệ với anh/chị. Anh/chị vui lòng để lại số điện thoại nhé.';
    const tone = settings.ai_tone || 'Chuyên nghiệp & Thân thiện';
    const hotline = settings.hotline || '0982441446';
    const showHotline = settings.show_hotline === '1';

    // 2. Ensure Conversation exists
    let conv = null;
    if (convId) {
      conv = await db.get('SELECT id FROM conversations WHERE id = ?', [convId]);
    }

    if (!conv) {
      if (!convId) {
        convId = `conv_${randomUUID().slice(0, 8)}`;
      }
      await db.run(
        `INSERT INTO conversations (id, user_id, agent_id, skill_id, title, is_archived, created_at, updated_at)
         VALUES (?, 'usr_customer', 'tri-ai-sales-robot', 'chatbot-sales-ai', ?, 0, ?, ?)`,
        [convId, message ? message.slice(0, 45) : (selectedProduct ? `Quan tâm ${selectedProduct.name}` : 'Cuộc tư vấn bán hàng'), now, now]
      );
    }

    // 3. Save User message to database
    const userMsgId = `msg_${randomUUID().slice(0, 8)}`;
    await db.run(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, metadata_json, created_at)
       VALUES (?, ?, 'user', 'customer', ?, ?, ?)`,
      [
        userMsgId,
        convId,
        message || (selectedProduct ? `[${actionType || 'Chọn sản phẩm'}]: ${selectedProduct.name}` : ''),
        JSON.stringify({ selectedProduct, actionType, customerInfo }),
        now
      ]
    );

    // 4. Fetch recent conversation history
    const history = await db.all(
      `SELECT sender_type, content, metadata_json FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 12`,
      [convId]
    );

    // 5. Detect Phone, Name, Consent and create Lead if applicable
    const phoneRegex = /(0[3|5|7|8|9][0-9]{8})\b/g;
    const phoneMatches = message ? message.match(phoneRegex) : null;
    let extractedPhone = phoneMatches ? phoneMatches[0] : (customerInfo?.phone || null);
    let leadCreated = null;

    // Check if customer gave phone number or explicitly agreed
    if (extractedPhone) {
      let customerName = customerInfo?.name || 'Quý Khách';
      
      // Try to extract name from message like "Tôi tên Minh, sđt 0918..."
      const nameMatch = message ? message.match(/(?:tên|tôi là|mình là|anh|chị)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{2,25})/i) : null;
      if (nameMatch && nameMatch[1]) {
        customerName = nameMatch[1].trim();
      }

      // Check if lead already created for this phone and conversation
      const existingLead = await db.get(
        'SELECT id FROM leads WHERE conversation_id = ? AND phone = ?',
        [convId, extractedPhone]
      );

      if (!existingLead) {
        const leadId = `lead_${randomUUID().slice(0, 8)}`;
        const reqDetail = actionType || (selectedProduct ? `Quan tâm ${selectedProduct.name}` : 'Yêu cầu tư vấn trực tiếp');
        const prodId = selectedProduct?.id || null;
        const prodName = selectedProduct?.name || 'Sản phẩm tổng quan';

        await db.run(`
          INSERT INTO leads (
            id, customer_name, phone, email, product_id, product_name, quantity, customer_requirement,
            conversation_id, website_source, widget_id, consent_to_contact, created_time, lead_status, notes, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'TRÍ AI Humanoid Widget', 'WIDGET_HUMANOID_V1', 1, ?, 'NEW – WAITING FOR OWNER CONTACT', ?, ?)
        `, [
          leadId,
          customerName,
          extractedPhone,
          customerInfo?.email || null,
          prodId,
          prodName,
          reqDetail,
          convId,
          now,
          `Khách để lại số điện thoại trong phiên chat: "${message}". Sản phẩm quan tâm: ${prodName}.`,
          now
        ]);

        leadCreated = {
          id: leadId,
          name: customerName,
          phone: extractedPhone,
          product: prodName,
          status: 'NEW – WAITING FOR OWNER CONTACT'
        };

        console.log(`[CRM INTEGRATION] New Lead created successfully: ${leadId} (${customerName} - ${extractedPhone})`);
      }
    }

    // 6. Generate Response (OpenAI or Rule-based Sales Intelligence)
    let replyText = '';
    const hasOpenAiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-');

    if (hasOpenAiKey) {
      try {
        const systemPrompt = `
Bạn là ${botName}, xưng hô chuẩn mực: "Tôi là trợ lý bán hàng của chủ nhân (${ownerName})".
Phong cách và giọng điệu: ${tone}. Luôn lịch sự, trân trọng, chuyên nghiệp và nhiệt tình.

QUY TẮC CỐT LÕI BẮT BUỘC (TUÂN THỦ 100%):
1. Tên chatbot: ${botName}.
2. Cách xưng hô: Luôn xưng là "Tôi là trợ lý bán hàng của chủ nhân."
3. Khi khách hỏi số điện thoại hoặc thông tin liên lạc của chủ nhân:
   Bắt buộc trả lời theo đúng kịch bản:
   "${phonePrompt}"
4. Khi khách muốn mua, hỏi giá, yêu cầu báo giá hoặc so sánh:
   - Xác nhận sản phẩm khách quan tâm.
   - Hỏi số lượng nếu cần.
   - Ghi nhận yêu cầu cụ thể.
   - Xin tên và số điện thoại.
   - Xin sự đồng ý rõ ràng để chủ nhân trực tiếp liên hệ chăm sóc.
   - Tuyệt đối KHÔNG tự tạo đơn hàng đã thanh toán hoặc xác nhận tồn kho nếu chưa có tích hợp thực tế.
5. Khi khách đã để lại số điện thoại:
   - Cảm ơn và xác nhận: "Yêu cầu của anh/chị đã được ghi nhận vào hệ thống CRM thành công! Tôi đã chuyển thông tin tới chủ nhân (${ownerName}). Chủ nhân sẽ liên hệ lại qua số ${extractedPhone || 'điện thoại'} sớm nhất để phục vụ anh/chị."
${showHotline ? `Hotline hỗ trợ: ${hotline}` : ''}
${selectedProduct ? `SẢN PHẨM KHÁCH ĐANG CHỌN TRONG PHIÊN:
- Tên: ${selectedProduct.name}
- Lĩnh vực: ${selectedProduct.field}
- Nhóm: ${selectedProduct.group_name}
- Giá niêm yết đã phê duyệt: ${selectedProduct.price_formatted || selectedProduct.price?.toLocaleString('vi-VN') + ' ₫'}
- Thông số: ${selectedProduct.specs_json || ''}
- Mô tả: ${selectedProduct.description || ''}
- Nhu cầu hành động: ${actionType || 'Quan tâm'}
` : ''}
`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.map(h => ({
            role: h.sender_type === 'user' ? 'user' : 'assistant',
            content: h.content
          }))
        ];

        replyText = await callOpenAI(messages);
        if (!replyText) throw new Error('Empty response from OpenAI');
      } catch (err) {
        console.error('[OPENAI ERROR] Falling back to Master Sales Rule Engine:', err.message);
        replyText = this.generateMasterSalesScriptReply({
          message,
          selectedProduct,
          actionType,
          extractedPhone,
          leadCreated,
          botName,
          ownerName,
          phonePrompt,
          hotline,
          showHotline
        });
      }
    } else {
      // High-performance intelligent Rule Engine implementing exact Prompt 08 logic
      replyText = this.generateMasterSalesScriptReply({
        message,
        selectedProduct,
        actionType,
        extractedPhone,
        leadCreated,
        botName,
        ownerName,
        phonePrompt,
        hotline,
        showHotline
      });
    }

    // 7. Save Assistant Reply to Database
    const assistantMsgId = `msg_${randomUUID().slice(0, 8)}`;
    const assistantNow = new Date().toISOString();
    await db.run(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, metadata_json, created_at)
       VALUES (?, ?, 'assistant', 'tri-ai-sales-robot', ?, ?, ?)`,
      [assistantMsgId, convId, replyText, JSON.stringify({ leadCreated, selectedProduct, actionType }), assistantNow]
    );

    // Update conversation timestamp
    await db.run('UPDATE conversations SET updated_at = ?, last_message_at = ? WHERE id = ?', [assistantNow, assistantNow, convId]);

    return {
      success: true,
      conversationId: convId,
      messageId: assistantMsgId,
      reply: replyText,
      leadCreated,
      botState: leadCreated ? 'success' : (actionType === 'Đặt mua' ? 'thinking' : 'speaking')
    };
  }

  /**
   * High-Precision Sales Script Generator conforming strictly to Prompt 08
   */
  static generateMasterSalesScriptReply({
    message,
    selectedProduct,
    actionType,
    extractedPhone,
    leadCreated,
    botName,
    ownerName,
    phonePrompt,
    hotline,
    showHotline
  }) {
    const lower = (message || '').toLowerCase();
    const norm = removeVietnameseTones(lower);
    const normAction = removeVietnameseTones(actionType || '');

    // 1. If Lead just created
    if (leadCreated || extractedPhone) {
      return `Dạ, tôi là trợ lý bán hàng của chủ nhân (${ownerName}).

Tôi đã ghi nhận thành công thông tin của anh/chị:
- **Khách hàng:** ${leadCreated?.name || 'Quý khách'}
- **Số điện thoại:** ${extractedPhone}
- **Sản phẩm quan tâm:** ${selectedProduct ? selectedProduct.name : 'Tư vấn chuyên sâu'}
- **Trạng thái Lead:** NEW – WAITING FOR OWNER CONTACT (Đã ghi nhận trên hệ thống CRM)

Chủ nhân sẽ trực tiếp liên hệ lại với anh/chị trong thời gian sớm nhất để tư vấn chu đáo và báo giá tốt nhất. Nếu anh/chị cần hỗ trợ gấp${showHotline ? `, có thể gọi trực tiếp Hotline: **${hotline}**` : ''}. Cảm ơn anh/chị đã quan tâm!`;
    }

    // 2. Customer asks for Owner's phone number
    if (
      lower.includes('số điện thoại') ||
      lower.includes('sđt') ||
      lower.includes('chủ nhân') ||
      lower.includes('cho xin số') ||
      norm.includes('so dien thoai') ||
      norm.includes('sdt') ||
      norm.includes('chu nhan') ||
      norm.includes('cho xin so') ||
      norm.includes('lien he chu nhan') ||
      lower.includes('di?n tho?i') ||
      lower.includes('ch? nhn') ||
      lower.includes('ch? nhan')
    ) {
      return `Dạ kính chào anh/chị, tôi là trợ lý bán hàng của chủ nhân (${ownerName}).

${phonePrompt}

Chủ nhân của tôi sẽ trực tiếp gọi điện lại tư vấn tỉ mỉ và đồng hành cùng anh/chị ngay khi nhận được thông tin ạ.`;
    }

    // 3. Action from Column 2: Đặt mua
    if (normAction.includes('dat mua') || lower.includes('đặt mua') || lower.includes('mua ngay') || norm.includes('dat mua') || norm.includes('mua ngay') || norm.includes('mua san pham') || lower.includes('d?t mua')) {
      const prodName = selectedProduct ? selectedProduct.name : 'sản phẩm';
      const prodPrice = selectedProduct?.price_formatted || (selectedProduct?.price ? selectedProduct.price.toLocaleString('vi-VN') + ' ₫' : 'Giá niêm yết phê duyệt');
      return `Dạ tuyệt vời ạ! Tôi là trợ lý bán hàng của chủ nhân.

Tôi xin xác nhận yêu cầu đặt mua sản phẩm:
- **Sản phẩm:** ${prodName}
- **Đơn giá đã được quản trị viên phê duyệt:** ${prodPrice}

Để ghi nhận yêu cầu chính xác và chuyển tới chủ nhân chuẩn bị đóng gói, anh/chị vui lòng cho tôi xin:
1. **Số lượng** anh/chị dự kiến đặt mua?
2. **Họ tên & Số điện thoại** của anh/chị?
3. Anh/chị đồng ý cho chủ nhân trực tiếp liên hệ xác nhận đơn hàng nhé?

*(Lưu ý: Tôi là trợ lý AI ghi nhận yêu cầu và tạo Lead trực tiếp vào CRM cho chủ nhân, không tự ý trừ tiền hoặc chốt đơn tự động khi chưa có sự xác nhận từ chủ nhân).*`;
    }

    // 4. Action from Column 2: Yêu cầu báo giá
    if (normAction.includes('bao gia') || lower.includes('báo giá') || lower.includes('gửi báo giá') || norm.includes('bao gia') || lower.includes('bo gi')) {
      const prodName = selectedProduct ? selectedProduct.name : 'sản phẩm';
      const prodPrice = selectedProduct?.price_formatted || (selectedProduct?.price ? selectedProduct.price.toLocaleString('vi-VN') + ' ₫' : 'Giá ưu đãi');
      return `Dạ kính chào anh/chị! Tôi là trợ lý bán hàng của chủ nhân.

Về sản phẩm **${prodName}**:
- **Mức giá niêm yết chính thức:** ${prodPrice}
- **Chính sách ưu đãi doanh nghiệp & số lượng lớn:** Đang được áp dụng chiết khấu đặc quyền từ chủ nhân.

Anh/chị vui lòng để lại **Họ tên, Số điện thoại (hoặc Email)** và số lượng dự kiến để tôi chuyển bảng báo giá chi tiết và kết nối chủ nhân liên hệ hỗ trợ mức chiết khấu tốt nhất nhé ạ!`;
    }

    // 5. Action from Column 2: So sánh sản phẩm
    if (normAction.includes('so sanh') || lower.includes('so sánh') || norm.includes('so sanh') || lower.includes('khác nhau thế nào')) {
      const prodName = selectedProduct ? selectedProduct.name : 'dòng sản phẩm này';
      return `Dạ chào anh/chị! Tôi là trợ lý bán hàng của chủ nhân.

Anh/chị đang quan tâm so sánh **${prodName}** với các dòng sản phẩm khác trong cùng danh mục.
- **Điểm nổi bật:** Được tuyển chọn theo tiêu chuẩn kiểm định nghiêm ngặt của chủ nhân.
- **Đặc tính kỹ thuật & hương sắc:** Tối ưu hóa trải nghiệm thực tế, giữ trọn vẹn giá trị cốt lõi.

Anh/chị đang phân vân sản phẩm này với mã sản phẩm nào ạ? Anh/chị có thể bấm chọn thêm sản phẩm bên Cột 2 (Product Selector) hoặc để lại số điện thoại để chủ nhân tư vấn sâu hơn nhé!`;
    }

    // 6. Action from Column 2: Hỏi giá
    if (normAction.includes('hoi gia') || lower.includes('giá bao nhiêu') || lower.includes('nhiêu tiền') || norm.includes('hoi gia') || norm.includes('gia bao nhieu')) {
      if (selectedProduct) {
        return `Dạ, tôi là trợ lý bán hàng của chủ nhân.

Thông tin giá chính thức đã được quản trị viên phê duyệt cho **${selectedProduct.name}** là:
💰 **Đơn giá:** ${selectedProduct.price_formatted || selectedProduct.price.toLocaleString('vi-VN') + ' ₫'}
📦 **Quy cách & Đặc tính:** ${selectedProduct.specs_json ? Object.entries(JSON.parse(selectedProduct.specs_json)).map(([k, v]) => `\n- *${k}:* ${v}`).join('') : selectedProduct.description}

Nếu anh/chị cần đặt mua hoặc nhận ưu đãi riêng từ chủ nhân, xin vui lòng để lại số điện thoại để chủ nhân liên hệ trực tiếp nhé!`;
      }
    }

    // 7. Action from Column 2: Yêu cầu chủ nhân liên hệ
    if (normAction.includes('chu nhan') || lower.includes('gọi lại cho tôi') || norm.includes('goi lai')) {
      return `Dạ rất sẵn lòng ạ! Tôi là trợ lý bán hàng của chủ nhân.

${phonePrompt}

Ngay khi nhận được số điện thoại của anh/chị, tôi sẽ tạo Lead vào hệ thống CRM và gửi thông báo trực tiếp đến chủ nhân (${ownerName}) để liên hệ với anh/chị ngay ạ.`;
    }

    // 8. Action from Column 2: Tìm hiểu sản phẩm
    if (selectedProduct) {
      let specsText = '';
      try {
        if (selectedProduct.specs_json) {
          const parsed = JSON.parse(selectedProduct.specs_json);
          specsText = Object.entries(parsed).map(([k, v]) => `\n• **${k}:** ${v}`).join('');
        }
      } catch (e) {
        specsText = '';
      }

      return `Dạ kính chào anh/chị! Tôi là trợ lý bán hàng của chủ nhân.

Tôi xin gửi thông tin chi tiết về sản phẩm anh/chị vừa chọn:
🌟 **${selectedProduct.name}**
🏷️ **Phân loại:** ${selectedProduct.field} → ${selectedProduct.group_name}
💵 **Giá niêm yết đã phê duyệt:** ${selectedProduct.price_formatted || selectedProduct.price.toLocaleString('vi-VN') + ' ₫'}

📋 **Thông số & Đặc điểm nổi bật:**${specsText || '\n• ' + selectedProduct.description}

Anh/chị cần tôi tư vấn thêm về tính năng, so sánh với dòng sản phẩm khác hay muốn đặt mua để chủ nhân liên hệ phục vụ ạ?`;
    }

    // 9. Default greeting / general questions
    return `Kính chào anh/chị! Tôi là TRÍ AI Sales Robot - trợ lý bán hàng của chủ nhân (${ownerName}).

Tôi luôn túc trực 24/7 để:
1. Giúp anh/chị tra cứu, tìm hiểu chi tiết các dòng sản phẩm chất lượng cao ở **Cột 2 (Product Selector)**.
2. Cung cấp bảng giá và thông số kỹ thuật đã được quản trị viên phê duyệt.
3. Ghi nhận nhu cầu mua hàng, yêu cầu báo giá để chủ nhân trực tiếp liên hệ và hỗ trợ chu đáo nhất.

Anh/chị đang quan tâm đến lĩnh vực hay sản phẩm nào hôm nay ạ? Anh/chị có thể nhấn chọn trực tiếp danh mục bên phải hoặc nhắn cho tôi bất kỳ lúc nào nhé!`;
  }
}

export default SalesEngine;
