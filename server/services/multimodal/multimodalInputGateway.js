/**
 * TRÍ AI ONE SUPER BRAIN – MULTIMODAL INPUT GATEWAY
 * UNIFIED MULTIMODAL INGESTION & NORMALIZATION GATEWAY (STAGE G6)
 * 
 * Supports 5 modalities:
 * 1. TEXT (Tin nhắn hội thoại, câu hỏi tự nhiên)
 * 2. AUDIO / VOICE (Âm thanh Web Speech API vi-VN, tệp ghi âm)
 * 3. DOCUMENT (Tài liệu hợp đồng, báo giá, thông số kỹ thuật PDF/DOCX/XLSX)
 * 4. IMAGE (Ảnh chụp thiết bị viễn thông, ảnh hóa đơn, ảnh sơ đồ mạng)
 * 5. VIDEO (Video ghi hình sự cố, clip hướng dẫn kỹ thuật)
 */

export class MultimodalInputGateway {
  constructor() {
    this.supportedModalities = ['text', 'audio', 'document', 'image', 'video'];
  }

  /**
   * Chuẩn hóa gói dữ liệu đầu vào thành Gói Nhận thức Đa phương thức (Multimodal Context Packet)
   * @param {object} input - { type, content, metadata }
   * @returns {object} Gói dữ liệu chuẩn hóa
   */
  normalizePacket(input = {}) {
    const type = (input.type || 'text').toLowerCase();
    const timestamp = new Date().toISOString();

    if (!this.supportedModalities.includes(type)) {
      throw new Error(`Định dạng phương thức không được hỗ trợ: ${type}`);
    }

    const packet = {
      packetId: `MM_PKT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      modality: type,
      rawContent: input.content || null,
      metadata: {
        timestamp,
        source: input.source || 'client_ui',
        tenantId: input.tenantId || 'default_tenant',
        userId: input.userId || 'guest',
        ...(input.metadata || {})
      },
      extractedText: '',
      features: {}
    };

    switch (type) {
      case 'text':
        packet.extractedText = typeof input.content === 'string' ? input.content.trim() : '';
        break;
      case 'audio':
        packet.extractedText = input.transcript || (typeof input.content === 'string' ? input.content : '');
        packet.features.sampleRate = input.sampleRate || 16000;
        packet.features.language = input.language || 'vi-VN';
        break;
      case 'document':
        packet.extractedText = input.parsedText || '';
        packet.features.fileType = input.fileType || 'unknown';
        packet.features.sheetCount = input.sheetCount || 1;
        break;
      case 'image':
        packet.extractedText = input.ocrText || '';
        packet.features.dimensions = input.dimensions || { width: 0, height: 0 };
        packet.features.detectedObjects = input.detectedObjects || [];
        break;
      case 'video':
        packet.extractedText = input.summary || '';
        packet.features.durationSeconds = input.duration || 0;
        packet.features.keyframeCount = input.keyframeCount || 0;
        break;
    }

    return packet;
  }

  /**
   * Định tuyến gói dữ liệu sang pipeline nhận thức tương ứng
   * @param {object} packet - Multimodal Context Packet
   * @returns {object} Kết quả phân tích chuyên sâu
   */
  routeToEngine(packet) {
    return {
      status: 'ROUTED_TO_CENTRAL_BRAIN',
      packetId: packet.packetId,
      modality: packet.modality,
      readyForContextInjection: true,
      textRepresentation: packet.extractedText
    };
  }
}

export default new MultimodalInputGateway();
