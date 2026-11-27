/**
 * NATURAL HUMAN CONVERSATION ENGINE – BỘ MÁY GIAO TIẾP TỰ NHIÊN NHƯ CON NGƯỜI
 * (TRÍ AI ULTIMATE ROBOT – MASTER CONVERSATION UPGRADE)
 * 
 * Triết lý cốt lõi: ONE BRAIN – MANY CAPABILITIES – ONE ROBOT
 * 
 * 6 Nguyên tắc chuẩn mực:
 * 1. Giao tiếp tự nhiên, linh hoạt, có chiều sâu ngữ cảnh như một chuyên gia tư vấn thực thụ.
 * 2. Loại bỏ hoàn toàn giao tiếp máy móc, loại bỏ các câu giới thiệu danh mục và quảng cáo gượng ép.
 * 3. Giao tiếp theo ngữ cảnh: Xác định mục tiêu khách hàng (tìm hiểu, giải quyết vấn đề hay mua hàng).
 * 4. Bán hàng thông minh: Chỉ tư vấn sản phẩm khi khách CÓ NHU CẦU MUA THỰC SỰ, không ép mua.
 * 5. Duy trì hội thoại: Trả lời ngắn khi đơn giản, giải thích sâu khi tìm hiểu, không hỏi dồn dập.
 * 6. Thứ tự ưu tiên: 1. Hiểu khách -> 2. Giải quyết quan tâm -> 3. Tư vấn giải pháp -> 4. Hỗ trợ giao dịch.
 */

import { IntentEngine, DOMAIN_INTENTS, INTENT_GROUPS } from './intentEngine.js';
import { callGemini } from '../../geminiService.js';
import { DomainRegistry } from '../domains/domainRegistry.js';
import { DeepResearchEngine } from './deepResearchEngine.js';

export class NaturalHumanConversationEngine {
  /**
   * Cụm từ máy móc BẮT BUỘC LOẠI BỎ (User-prohibited robotic patterns)
   */
  static PROHIBITED_ROBOTIC_PHRASES = [
    /hệ thống bên tôi hiện đang cung cấp[^\n.!?]*[.!?]?/gi,
    /bên em hiện đang cung cấp rất nhiều[^\n.!?]*[.!?]?/gi,
    /bạn có đang cần tư vấn sản phẩm nào không\??/gi,
    /anh\/chị có đang cần tư vấn sản phẩm nào không\??/gi,
    /chúng tôi có rất nhiều sản phẩm[^\n.!?]*[.!?]?/gi,
    /bạn có nhu cầu mua hàng không\??/gi,
    /anh\/chị có nhu cầu mua hàng không\??/gi,
    /bạn có nhu cầu mua sắm sản phẩm nào không\??/gi,
    /dưới đây là một số sản phẩm bên em đang kinh doanh[^\n.!?]*[.!?]?/gi,
    /toàn bộ danh mục sản phẩm hiện có của shop đã được mở sẵn ở \*\*cột 2\*\*[^\n.!?]*[.!?]?/gi,
    /bạn có thể tham khảo trực tiếp các mẫu khác ở cột 2 nhé[.!?]?/gi,
    /bạn có muốn em hỗ trợ đặt mua hay tư vấn thêm ưu đãi cho sản phẩm này không ạ\??/gi,
    /bạn có muốn tôi hỗ trợ lập bảng báo giá chính thức cho sản phẩm này không ạ\??/gi,
    /xin lỗi,?\s*(?:bạn|quý khách)?\s*vui lòng cho tôi biết tên hoặc cách xưng hô[^\n.!?]*[.!?]?/gi,
    /tôi là\s+\*?\*?trí ai sales robot\*?\*?[^\n.!?]*[.!?]?/gi,
    /do tôi là trợ lý ảo[^\n.!?]*[.!?]?/gi,
    /tôi sẽ mở bộ sản phẩm ở cột 2[^\n.!?]*[.!?]?/gi
  ];

  /**
   * 1. PHÂN TÍCH NGỮ CẢNH HỘI THOẠI (Context Analyzer)
   */
  static analyzeConversationContext({ message = '', conversationHistory = [], context = {} }) {
    const raw = (message || '').trim();
    const cleanLower = raw.toLowerCase();
    const unaccented = IntentEngine.stripDiacritics(cleanLower);

    // 1. Kiểm tra tín hiệu mua hàng rõ ràng (Explicit Purchase Signals)
    const hasExplicitSalesIntent = this.detectExplicitSalesIntent(cleanLower, unaccented);

    // 2. Xác định mục tiêu của người dùng (User Goal)
    let userGoal = 'INQUIRY'; // Default: Tìm hiểu
    if (hasExplicitSalesIntent) {
      userGoal = 'PURCHASE_INTENT';
    } else if (this.isProblemSolving(cleanLower, unaccented)) {
      userGoal = 'PROBLEM_SOLVING';
    } else if (this.isGreetingOrSmallTalk(cleanLower, unaccented)) {
      userGoal = 'CASUAL_CHAT';
    } else if (this.isKnowledgeInquiry(cleanLower, unaccented)) {
      userGoal = 'SEEK_KNOWLEDGE';
    }

    // 3. Xác định chế độ phản hồi (Response Mode: Ngắn gọn vs Giải thích sâu)
    const isSimpleFactOrShort = raw.split(/\s+/).length <= 6 && !cleanLower.includes('tại sao') && !cleanLower.includes('vì sao') && !cleanLower.includes('nguyên nhân') && !cleanLower.includes('làm thế nào');
    const responseMode = isSimpleFactOrShort ? 'CONCISE' : 'COMPREHENSIVE';

    // 4. Xác định chủ đề (Topic)
    const topic = this.detectTopic(cleanLower, unaccented);

    return {
      message: raw,
      topic,
      userGoal,
      responseMode,
      hasExplicitSalesIntent,
      isProblemSolving: userGoal === 'PROBLEM_SOLVING',
      isSeekingKnowledge: userGoal === 'SEEK_KNOWLEDGE',
      isCasualChat: userGoal === 'CASUAL_CHAT'
    };
  }

  /**
   * Nhận diện tín hiệu mua sắm thực sự
   */
  static detectExplicitSalesIntent(cleanLower, unaccented) {
    // Chỉ kích hoạt Sales Engine khi khách nói về mua, bán, giá, đặt hàng cụ thể
    const explicitSignals = [
      /\b(mua|bán|đặt hàng|chốt đơn|báo giá|bao gia|gia bao nhieu|giá bao nhiêu|gia ca|chi phi|ngân sách|ngan sach)\b/i,
      /\b(shop có bán|shop co ban|bên bạn có bán|ben ban co ban|có sẵn hàng|co san hang|còn hàng không|con hang khong)\b/i,
      /\b(tư vấn giúp mình mua|tư vấn mua|chon mua|nên mua con nào|nen mua may nao|mua may nao)\b/i,
      /\b(tầm \d+|khoảng \d+tr|ngân sách \d+)\b/i
    ];

    // Loại trừ các câu hỏi học thuật/nguyên lý có chứa từ "giá" nhưng không mua (ví dụ: "giá trị thặng dư", "định giá tài sản là gì")
    if (/(giá trị thặng dư|định giá tài sản là gì|khái niệm giá|nguyên lý giá)/i.test(cleanLower)) {
      return false;
    }

    return explicitSignals.some(pattern => pattern.test(cleanLower) || pattern.test(unaccented));
  }

  /**
   * Nhận diện yêu cầu giải quyết vấn đề / khắc phục sự cố (Troubleshooting)
   */
  static isProblemSolving(cleanLower, unaccented) {
    const patterns = [
      /\b(bị lỗi|bị hỏng|bị nóng|chạy chậm|không lên|kêu to|rung lắc|kẹt giấy|mất kết nối|không in được|treo máy|màn hình xanh)\b/i,
      /\b(cách khắc phục|cách sửa|sửa thế nào|xử lý sao|làm sao để hết|bảo dưỡng|bảo quản)\b/i,
      /\b(tai sao bi|nguyên nhân bị|nguyen nhan bi)\b/i
    ];
    return patterns.some(p => p.test(cleanLower) || p.test(unaccented));
  }

  /**
   * Nhận diện câu chào hoặc giao tiếp xã giao
   */
  static isGreetingOrSmallTalk(cleanLower, unaccented) {
    const patterns = [
      /^(hi|hello|chào|chao|alo|xin chào|xin chao|ê|hey|hê lô|bạn là ai|ban la ai|em là ai|em tên gì|bạn tên gì)(\s.*)?$/i,
      /^(khỏe không|khoe khong|hôm nay thế nào|hom nay the nao|thời tiết|thoi tiet|buồn quá|vui quá)(\s.*)?$/i,
      /^(cảm ơn|cam on|thanks|thank you|tạm biệt|tam biet|bye)(\s.*)?$/i
    ];
    return patterns.some(p => p.test(cleanLower) || p.test(unaccented));
  }

  /**
   * Nhận diện câu hỏi tìm hiểu kiến thức, giải thích khoa học / đời sống / kỹ thuật
   */
  static isKnowledgeInquiry(cleanLower, unaccented) {
    const patterns = [
      /\b(tại sao|tai sao|vì sao|vi sao|nguyên nhân|nguyen nhan|là gì|la gi|nghĩa là gì|khái niệm|định nghĩa)\b/i,
      /\b(giải thích|giai thich|làm thế nào|lam the nao|như thế nào|nhu the nao|nguyên lý|nguyen ly|cách hoạt động)\b/i,
      /\b(so sánh sự khác biệt|khác nhau thế nào|khac nhau the nao|ưu nhược điểm|uu nhuoc diem)\b/i,
      /\b(cho tôi biết|tìm hiểu về|kien thuc ve|nghiên cứu về)\b/i
    ];
    return patterns.some(p => p.test(cleanLower) || p.test(unaccented));
  }

  /**
   * Nhận diện lĩnh vực chủ đề câu hỏi
   */
  static detectTopic(cleanLower, unaccented) {
    if (/(laptop|máy tính|cpu|ram|ssd|card đồ họa|màn hình|windows|macbook|pc|phần mềm)/i.test(cleanLower)) return 'TECHNOLOGY';
    if (/(máy in|mực in|in ấn|scan|photocopy|brother|canon|hp)/i.test(cleanLower)) return 'PRINTING_HARDWARE';
    if (/(trà|cà phê|pha trà|oolong|rang mộc|ẩm thực|đồ uống)/i.test(cleanLower)) return 'BEVERAGE_CULINARY';
    if (/(luật|hợp đồng|pháp lý|kinh doanh|thuế|doanh nghiệp)/i.test(cleanLower)) return 'LAW_BUSINESS';
    if (/(sức khỏe|y tế|dinh dưỡng|thể thao|bệnh|thuốc)/i.test(cleanLower)) return 'HEALTH_MEDICINE';
    if (/(khoa học|vũ trụ|vật lý|hóa học|toán học|lịch sử|địa lý)/i.test(cleanLower)) return 'SCIENCE_ACADEMIC';
    return 'GENERAL_LIFE';
  }

  /**
   * 2. XỬ LÝ HỘI THOẠI TỰ NHIÊN NHƯ CHUYÊN GIA (Natural Conversational Handler)
   * 
   * Trả lời trực tiếp điều khách quan tâm, tuyệt đối không chèn ép sản phẩm khi khách không có nhu cầu mua.
   */
  static async handleConversation(context = {}) {
    const {
      message = '',
      conversationId,
      userContext = {},
      customerInfo = null,
      orgId = 'org_default'
    } = context;

    const analyzed = this.analyzeConversationContext({ message, context });

    // 1. Chào hỏi xã giao / Small Talk
    if (analyzed.isCasualChat) {
      return this.handleCasualChat(message, customerInfo);
    }

    // 2. Chuyên gia tư vấn Đa Lĩnh Vực (Domain Expert) hoặc Nghiên Cứu Sâu (Deep Research)
    const identifiedDomain = DomainRegistry.identifyDomain(message, context);
    if (identifiedDomain && !analyzed.hasExplicitSalesIntent) {
      const domainResult = DomainRegistry.executeDomainConsultation(identifiedDomain, message, context);
      return {
        replyText: this.sanitizeResponse(domainResult.consultationText, { hasExplicitSalesIntent: false }),
        stage: 'NATURAL_DOMAIN_CONSULTATION',
        toolsUsed: ['natural_human_conversation_engine', 'domain_registry', identifiedDomain.toLowerCase()]
      };
    }

    // 3. Giải đáp kiến thức / Hướng dẫn xử lý sự cố qua Gemini LLM với System Prompt chuẩn mực
    const humanPrompt = this.buildHumanExpertPrompt({
      message,
      analyzed,
      customerInfo
    });

    let replyText = '';
    try {
      replyText = await callGemini(humanPrompt);
    } catch (err) {
      console.warn('[NATURAL CONVERSATION] Gemini call fallback:', err.message);
      replyText = this.buildDirectExpertFallback(message, analyzed);
    }

    // Làm sạch mọi dấu hiệu máy móc
    const cleanReply = this.sanitizeResponse(replyText, {
      hasExplicitSalesIntent: analyzed.hasExplicitSalesIntent
    });

    return {
      replyText: cleanReply,
      stage: 'NATURAL_HUMAN_CONVERSATION_RESOLVED',
      toolsUsed: ['natural_human_conversation_engine']
    };
  }

  /**
   * Xây dựng Prompt cho LLM đóng vai Chuyên gia tư vấn tự nhiên như con người
   */
  static buildHumanExpertPrompt({ message, analyzed, customerInfo }) {
    const customerName = customerInfo?.name ? customerInfo.name : 'bạn';

    return `Bạn là TRÍ AI ULTIMATE ROBOT – một chuyên gia trí tuệ nhân tạo đa lĩnh vực, có tư duy sắc bén, hiểu biết sâu rộng và phong thái giao tiếp tự nhiên, ấm áp, tinh tế như một con người thực thụ.

NGỮ CẢNH HỘI THOẠI HIỆN TẠI:
- Người dùng đang: ${analyzed.userGoal === 'PROBLEM_SOLVING' ? 'GẶP VẤN ĐỀ / SỰ CỐ CẦN GIẢI PHÁP KHẮC PHỤC' : (analyzed.userGoal === 'SEEK_KNOWLEDGE' ? 'TÌM HIỂU KIẾN THỨC / NGUYÊN LÝ CHUYÊN SÂU' : 'TRÒ CHUYỆN / TRAO ĐỔI Ý KIẾN')}
- Chế độ phản hồi: ${analyzed.responseMode === 'CONCISE' ? 'NGẮN GỌN, TRỰC DIỆN, ĐÚNG TRỌNG TÂM' : 'SÂU SẮC, RÕ RÀNG, ĐA CHIỀU, CÓ CẤU TRÚC'}
- Khách hàng có nhu cầu mua sắm không: ${analyzed.hasExplicitSalesIntent ? 'CÓ' : 'HOÀN TOÀN KHÔNG'}

QUY TẮC PHẢN HỒI BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ):
1. BẬC THẦY TƯ VẤN: Trả lời trực tiếp, chính xác, mạch lạc điều người dùng đang hỏi. Đặt trọng tâm 100% vào việc GIẢI QUYẾT ĐIỀU NGƯỜI DÙNG QUAN TÂM.
2. LOẠI BỎ TOÀN BỘ QUẢNG CÁO MÁY MÓC:
   - TUYỆT ĐỐI KHÔNG giới thiệu danh mục sản phẩm, KHÔNG nói "Hệ thống bên tôi cung cấp...", KHÔNG nói "Bạn có đang cần tư vấn sản phẩm nào không?".
   - TUYỆT ĐỐI KHÔNG chèn câu hỏi mua hàng, không ép khách mua, không nhắc đến Cột 2 nếu khách không yêu cầu xem sản phẩm.
   - Không lặp lại những câu chào hỏi hay kết bài rập khuôn.
3. PHONG THÁI TỰ NHIÊN:
   - Dùng đại từ xưng hô lịch sự, thân thiện: "Dạ...", xưng "em" hoặc "mình" tùy ngữ cảnh, gọi đối phương là "${customerName}" hoặc "anh/chị".
   - Nếu câu hỏi đơn giản: Trả lời súc tích, ngắn gọn.
   - Nếu câu hỏi tìm hiểu sâu hoặc sự cố: Phân tích nguyên nhân rõ ràng, đưa ra các bước giải quyết cụ thể, có thể kèm theo một lưu ý hữu ích.
   - Nếu cần hỏi thêm thông tin: CHỈ HỎI ĐÚNG 1 CÂU CẦN THIẾT NHẤT, tuyệt đối không hỏi dồn dập.
4. KẾT NỐI TỰ NHIÊN: Kết thúc câu trả lời một cách tự nhiên (có thể là một lời chúc, một góc nhìn gợi mở hoặc để ngỏ sẵn sàng hỗ trợ thêm nếu cần), không chèn lời kêu gọi mua hàng.

CÂU HỎI CỦA NGƯỜI DÙNG: "${message}"`;
  }

  /**
   * Fallback chuyên gia trực tiếp khi không có kết nối LLM
   */
  static buildDirectExpertFallback(message, analyzed) {
    const rawLower = (message || '').toLowerCase();

    if (analyzed.isProblemSolving) {
      if (analyzed.topic === 'PRINTING_HARDWARE' || /kẹt giấy|ket giay|máy in|may in/i.test(rawLower)) {
        return `Dạ, đối với hiện tượng máy in bị kẹt giấy, các nguyên nhân phổ biến nhất thường gồm:
1. **Chất lượng và nạp giấy:** Giấy bị ẩm, mép giấy quăn, giấy quá mỏng/quá dày hoặc khay giấy nạp lệch, ép thanh chặn quá chặt.
2. **Bánh cao su cuốn giấy (Pickup Roller) mòn hoặc bám bụi mực:** Trục cao su bị trơn trượt sau thời gian hoạt động, không kéo giấy dứt khoát hoặc kéo lệch một bên.
3. **Dị vật hoặc mảnh vụn giấy cũ:** Có mẩu giấy vụn rách cũ, kẹp ghim kẹt trong đường dẫn hoặc sensor cảm biến giấy bị kẹt lẫy.

**Hướng dẫn xử lý an toàn:**
- Tắt nguồn máy in, rút dây nguồn để đảm bảo an toàn.
- Mở nắp máy, dùng cả hai tay nhẹ nhàng kéo giấy **theo chiều đi tới của trang in** (tuyệt đối không giật ngược chiều làm gãy cò sensor hoặc rách để lại vụn).
- Dùng khăn ẩm không xơ vệ sinh nhẹ nhàng quả đào cuốn giấy.
- Trước khi nạp xấp giấy mới, hãy vỗ đều và tơi xốp các mép giấy.

Hiện tại giấy đang bị kẹt ở khay nạp dưới, cụm trống ở giữa hay phía cụm sấy ra ngoài vậy bạn?`;
      }

      if (analyzed.topic === 'TECHNOLOGY' || /nóng|chậm|treo|đơ/i.test(rawLower)) {
        return `Dạ, hiện tượng thiết bị bị nóng hoặc chạy chậm thường xuất phát từ các nguyên nhân kỹ thuật sau:
1. **Tản nhiệt suy giảm:** Bụi bẩn bám dày ở khe tản gió/quạt làm mát, hoặc keo tản nhiệt CPU/GPU bị khô sau 1-2 năm sử dụng khiến máy bị giảm xung nhịp (Thermal Throttling) để tự bảo vệ.
2. **Ứng dụng chạy ngầm & xung đột phần mềm:** Quá nhiều tiến trình khởi động cùng hệ thống, hoặc trình duyệt mở nhiều tab chiếm dụng RAM/CPU cao.
3. **Môi trường hoạt động:** Đặt máy trên đệm, giường hoặc bề mặt vải làm bít kín các khe hút gió dưới đáy.

**Giải pháp khắc phục tức thì:**
- Mở Task Manager (Ctrl + Shift + Esc) kiểm tra xem tiến trình nào đang chiếm CPU/RAM bất thường và tắt bớt tác vụ nền.
- Kê cao phần đáy sau của máy lên khoảng 1-2 cm hoặc dùng đế tản nhiệt để không khí lưu thông tối đa.
- Nếu đã lâu chưa bảo dưỡng, bạn nên vệ sinh cánh quạt và thay keo tản nhiệt chất lượng cao.

Bạn đang gặp hiện tượng nóng máy khi làm tác vụ văn phòng nhẹ hay lúc mở phần mềm đồ họa/chơi game thế ạ?`;
      }

      return `Dạ, đối với vấn đề "${message}", nguyên nhân phổ biến thường xuất phát từ việc thiết bị hoạt động quá tải, cấu hình chưa tối ưu hoặc xung đột giữa phần cứng và phần mềm.\n\n` +
        `Để xử lý hiệu quả nhất, bạn có thể thử khởi động lại thiết bị, kiểm tra các kết nối vật lý và rà soát các ứng dụng đang chạy. Bạn có thể cho em biết cụ thể hơn biểu hiện lúc xảy ra để em hỗ trợ phương án chuẩn xác nhất nhé!`;
    }

    if (analyzed.topic === 'SCIENCE_ACADEMIC' || /thuyết tương đối|einstein|lá cây|màu xanh|vũ trụ|quang hợp/i.test(rawLower)) {
      if (/thuyết tương đối|einstein/i.test(rawLower)) {
        return `Thuyết tương đối của Albert Einstein là một trong hai trụ cột của vật lý hiện đại, gồm hai lý thuyết mang tính cách mạng:

1. **Thuyết tương đối hẹp (Special Relativity - 1905):**
   - Nguyên lý tương đối: Các định luật vật lý có cùng dạng trong mọi hệ quy chiếu quán tính.
   - Vận tốc ánh sáng trong chân không ($c \\approx 300.000$ km/s) là hằng số vũ trụ tuyệt đối, không phụ thuộc chuyển động của nguồn sáng hay người quan sát.
   - Hệ quả: Thời gian không tuyệt đối mà bị co giãn (thời gian trôi chậm hơn với vật thể di chuyển ở tốc độ cao), không gian co ngắn và phương trình tương đương khối lượng - năng lượng bất hủ $E = mc^2$.

2. **Thuyết tương đối rộng (General Relativity - 1915):**
   - Einstein mở rộng hệ quy chiếu có gia tốc và định nghĩa lại lực hấp dẫn: Hấp dẫn không phải là một lực vô hình kéo hai vật thể, mà là **sự cong của không - thời gian** (spacetime curvature) do khối lượng và năng lượng tạo ra.
   - Các hành tinh hay tia sáng di chuyển theo các đường trắc địa ngắn nhất trong không-thời gian bị uốn cong này (giải thích hoàn hảo hiện tượng thấu kính hấp dẫn, sóng hấp dẫn và sự tồn tại của lỗ đen).

Bạn đang muốn tìm hiểu sâu về phương diện toán học, ý nghĩa vật lý hay ứng dụng thực tế (như hiệu chỉnh thời gian của hệ thống định vị GPS) thế ạ?`;
      }

      if (/lá cây|màu xanh/i.test(rawLower)) {
        return `Dạ, lá cây có màu xanh lục chủ yếu bắt nguồn từ sắc tố **diệp lục (chlorophyll)** nằm trong các bào quan lục lạp của tế bào thực vật:

1. **Cơ chế hấp thụ quang phổ:** Ánh sáng mặt trời là ánh sáng trắng bao gồm nhiều dải sóng màu khác nhau. Diệp lục hấp thụ mạnh nhất các photon ở vùng ánh sáng **xanh lam (blue - bước sóng ~430-450 nm)** và vùng **đỏ (red - bước sóng ~640-660 nm)** để cung cấp năng lượng cho phản ứng quang hợp.
2. **Cơ chế phản xạ ánh sáng:** Phân tử diệp lục hầu như **không hấp thụ bước sóng màu xanh lục (green - ~500-550 nm)** mà phản xạ ngược lại vào môi trường. Khi ánh sáng phản xạ này đi tới võng mạc, mắt người nhận biết lá cây có màu xanh lục.

Đặc biệt, vào mùa thu khi cây giảm trao đổi chất, lượng diệp lục phân rã nhanh hơn sự tổng hợp mới, để lộ ra các sắc tố phụ như carotenoid (vàng/cam) và anthocyanin (đỏ/tím), tạo nên cảnh sắc thay lá rất đẹp đấy ạ!`;
      }
    }

    return `Dạ, về câu hỏi "${message}": Đây là một chủ đề rất thú vị. Theo các nguyên lý chuyên môn, cốt lõi của vấn đề nằm ở sự tương tác giữa các quy luật vận hành và điều kiện thực tế.\n\n` +
      `Nếu bạn đang muốn tìm hiểu sâu hơn về khía cạnh nào cụ thể, cứ nhắn em cùng trao đổi chi tiết nhé!`;
  }

  /**
   * Xử lý giao tiếp xã giao nhẹ nhàng, thông minh, không rập khuôn
   */
  static handleCasualChat(message, customerInfo) {
    const raw = (message || '').toLowerCase();
    const name = customerInfo?.name ? customerInfo.name : '';
    const nameGreeting = name ? ` ${name}` : '';

    const greetings = [
      `Dạ em chào${nameGreeting}! Rất vui được trò chuyện cùng bạn hôm nay. Hôm nay bạn thế nào rồi ạ?`,
      `Chào${nameGreeting}! Chúc bạn một ngày thật nhiều năng lượng và niềm vui nhé. Bạn đang quan tâm đến chủ đề gì hôm nay thế?`,
      `Dạ em đây ạ! Em có thể đồng hành hỗ trợ gì cùng${nameGreeting} hôm nay nào?`
    ];

    const thanksReplies = [
      `Dạ không có chi đâu ạ! Rất vui vì có thể giúp ích được cho bạn. Cứ thoải mái nhắn em bất cứ khi nào nhé!`,
      `Dạ niềm vui của em là được hỗ trợ bạn thật chu đáo. Chúc bạn có một ngày tuyệt vời nhé ạ!`
    ];

    let replyText = greetings[Math.floor(Math.random() * greetings.length)];

    if (/(cảm ơn|cam on|thanks|thank you)/i.test(raw)) {
      replyText = thanksReplies[Math.floor(Math.random() * thanksReplies.length)];
    } else if (/(tạm biệt|tam biet|bye)/i.test(raw)) {
      replyText = `Dạ tạm biệt bạn nhé! Chúc bạn mọi điều thuận lợi và hẹn gặp lại bạn trong những lần trò chuyện tiếp theo ạ! ✨`;
    } else if (/(khỏe không|khoe khong|thế nào)/i.test(raw)) {
      replyText = `Dạ em khỏe, cảm ơn bạn đã hỏi thăm nhé! Em luôn sẵn sàng lắng nghe và hỗ trợ bạn. Còn bạn hôm nay công việc có thuận lợi không ạ?`;
    } else if (/(bạn là ai|ban la ai|em là ai|em ten gi|bạn tên gì|gioi thieu ve minh|giới thiệu về mình)/i.test(raw)) {
      replyText = `Dạ em là TRÍ AI – trợ lý trí tuệ nhân tạo toàn năng. Em có thể đồng hành cùng bạn trong việc quản lý lịch trình, phân tích dữ liệu, nghiên cứu kiến thức đa lĩnh vực và tư vấn kỹ thuật. Rất vui được trò chuyện cùng bạn hôm nay ạ!`;
    } else if (/(thời tiết|thoi tiet)/i.test(raw)) {
      replyText = `Dạ một ngày với thời tiết dễ chịu sẽ giúp tinh thần làm việc hứng khởi hơn rất nhiều! Bạn đang ở khu vực nào thế, để em chia sẻ cùng bạn nhé?`;
    }

    return {
      replyText,
      stage: 'NATURAL_CASUAL_CHAT',
      toolsUsed: ['natural_human_conversation_engine']
    };
  }

  /**
   * 3. BỘ LỌC CHỐNG GIAO TIẾP MÁY MÓC (Anti-Robotic Sanitizer)
   * 
   * Quét và làm sạch 100% các câu quảng cáo gượng ép hoặc lời mời chào máy móc.
   */
  static sanitizeResponse(text = '', { hasExplicitSalesIntent = false, isSalesContext = false } = {}) {
    if (!text || typeof text !== 'string') return '';

    let cleaned = text;

    // 1. Quét và loại bỏ tất cả các cụm từ cấm đã được định nghĩa
    for (const phraseRegex of this.PROHIBITED_ROBOTIC_PHRASES) {
      cleaned = cleaned.replace(phraseRegex, '');
    }

    // 2. Nếu người dùng KHÔNG có nhu cầu mua hàng, triệt để loại bỏ câu kéo sang sản phẩm / Cột 2
    if (!hasExplicitSalesIntent && !isSalesContext) {
      cleaned = cleaned
        .replace(/(?:thông tin chi tiết|các sản phẩm liên quan|danh mục sản phẩm).*?(?:cột 2|cot 2)[^\n.!?]*[.!?]?/gi, '')
        .replace(/(?:bạn có muốn|anh\/chị có muốn).*?(?:báo giá|đặt mua|mua hàng|tham khảo thêm sản phẩm)[^\n.!?]*[.!?]?/gi, '')
        .replace(/(?:hiện tại bên em đang có sản phẩm).*?(?:cột 2)[^\n.!?]*[.!?]?/gi, '');
    }

    // 3. Chuẩn hóa thương hiệu TRÍ AI và khoảng trắng
    cleaned = cleaned.replace(/\b(?:Trí\s+AI|trí\s+ai|Tri\s+AI)\b/g, 'TRÍ AI');
    cleaned = cleaned
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/([.!?])\s*\n\s*([.!?])/g, '$1')
      .trim();

    return cleaned;
  }
}
