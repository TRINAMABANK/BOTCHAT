/**
 * SERVICE CONSULTANT: CHUYÊN VIÊN TƯ VẤN THI CÔNG – LẮP ĐẶT – KHẢO SÁT
 * 
 * Objectives & Business Rules:
 * 1. Nhận diện các nhu cầu dịch vụ: Thi công, lắp đặt, khảo sát, tháo dỡ, di dời, sửa chữa, bảo trì.
 * 2. Tuyệt đối không từ chối dịch vụ chỉ vì danh mục sản phẩm chưa khai báo.
 * 3. Trả lời theo mẫu chuẩn mực: đề nghị khảo sát thực tế, báo giá sau khảo sát, xin SĐT và địa chỉ.
 * 4. Không tự ý báo giá thi công hoặc ước tính chi phí khi chưa khảo sát.
 * 5. Không tự xác nhận lịch thi công / khảo sát khi chưa có xác nhận từ shop.
 * 6. Thu thập thông tin tự nhiên đa lượt (SĐT, Địa chỉ, Quy mô/Số lượng, Thời gian mong muốn).
 * 7. Tự động lưu / cập nhật Lead Dịch vụ vào CRM (bảng `leads` với `lead_type = 'SERVICE_SURVEY'`).
 * 8. Tuyệt đối không bật `revealCatalog: true`, không chuyển sang Cột 2.
 */

import { db } from '../db.js';
import { CrmLeadService, SERVICE_TYPES } from './crmLeadService.js';
import { ContextEngine } from './intelligence/contextEngine.js';
import { NotificationEngine } from './secretary/notificationEngine.js';

export class ServiceConsultant {
  /**
   * Mẫu câu trả lời chuẩn mực bắt buộc khi khách hỏi về thi công / lắp đặt
   */
  static get STANDARD_RESPONSE() {
    return `Dạ, bên em có thể tiếp nhận nhu cầu thi công, lắp đặt và hỗ trợ anh/chị kiểm tra phương án thực hiện ạ.\n\nĐối với hạng mục này, bên em cần khảo sát thực tế để xác định khối lượng, điều kiện thi công và vật tư cần thiết. Sau khi khảo sát, bên em sẽ lập phương án và gửi báo giá cụ thể cho anh/chị ạ.\n\nAnh/chị cho em xin số điện thoại và địa chỉ công trình để bên em liên hệ sắp xếp khảo sát nhé!`;
  }

  /**
   * Xử lý luồng tư vấn dịch vụ thi công / lắp đặt / khảo sát
   */
  static async handleServiceConsultation(context = {}) {
    const {
      message = '',
      conversationId = 'default_conv',
      intentResult = {},
      userContext = {}
    } = context;

    const unaccented = message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .trim();

    // Duy trì ngữ cảnh đang tiếp nhận dịch vụ
    ContextEngine.updateSessionContext(conversationId, {
      inServiceIntake: true,
      lastIntent: 'SERVICE_SURVEY_REQUEST'
    });

    // 1. Trích xuất thông tin dịch vụ trong tin nhắn hiện tại
    const extracted = CrmLeadService.extractServiceDetails(message);
    const serviceType = intentResult.serviceType || extracted.serviceType || SERVICE_TYPES.SERVICE_SURVEY_REQUEST;

    // 2. Tra cứu dữ liệu Lead dịch vụ đã có trong phiên hội thoại này (nếu có)
    const existingLead = await db.get(
      `SELECT * FROM leads WHERE conversation_id = ? AND lead_type = 'SERVICE_SURVEY' ORDER BY created_time DESC LIMIT 1`,
      [conversationId]
    );

    const effectivePhone = extracted.phone || existingLead?.phone || null;
    const effectiveAddress = extracted.surveyAddress || existingLead?.survey_address || null;
    const effectiveScale = extracted.scaleOrQuantity || existingLead?.scale_or_quantity || null;
    const effectiveTime = extracted.expectedTime || existingLead?.expected_time || null;

    // -------------------------------------------------------------
    // QUY TẮC BẮT BUỘC: Khách hỏi đơn giá thi công / chi phí
    // -------------------------------------------------------------
    const isPriceInquiry = /(?:chi\s+phi|bao\s+nhieu\s+tien|gia\s+thi\s+cong|gia\s+lap\s+dat|mat\s+phi\s+khong|bang\s+gia\s+thi\s+cong|don\s+gia)/i.test(unaccented);
    if (isPriceInquiry) {
      // Lưu lại thông tin nếu khách có cung cấp kèm SĐT/địa chỉ
      if (effectivePhone || effectiveAddress) {
        await CrmLeadService.createOrUpdateServiceLead(db, {
          conversationId,
          customerName: userContext.userName || null,
          phone: effectivePhone,
          serviceType,
          surveyAddress: effectiveAddress,
          scaleOrQuantity: effectiveScale,
          expectedTime: effectiveTime,
          customerRequirement: message,
          notes: 'Khách hỏi chi phí thi công/lắp đặt'
        });
      }

      return {
        success: true,
        reply: `Dạ, đối với dịch vụ thi công và lắp đặt, chi phí nhân công và vật tư phụ thuộc trực tiếp vào điều kiện thực tế của công trình, khối lượng và vật tư phát sinh. Vì vậy, bên em chỉ có thể gửi bảng báo giá chính xác sau khi kỹ thuật viên khảo sát thực tế ạ.\n\nAnh/chị cho em xin số điện thoại và địa chỉ công trình để bên em liên hệ khảo sát và lập báo giá cụ thể cho mình nhé!`,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'SERVICE_PRICE_DISCLAIMER',
        toolsUsed: ['service_consultant']
      };
    }

    // -------------------------------------------------------------
    // QUY TẮC BẮT BUỘC: Khách yêu cầu chốt lịch thi công / khảo sát
    // -------------------------------------------------------------
    const isScheduleCommitment = /(?:mai\s+.*(?:qua|lam|den|khao\s+sat)\s+luon|mai\s+(?:qua|lam|den|khao\s+sat)\s+luon|chot\s+lich|qua\s+lam\s+luon|khao\s+sat\s+ngay\s+mai|gio\s+nay\s+qua|khi\s+nao\s+qua|sap\s+xep\s+ngay|qua\s+lam|qua\s+khao\s+sat)/i.test(unaccented);
    if (isScheduleCommitment) {
      if (effectivePhone || effectiveAddress) {
        await CrmLeadService.createOrUpdateServiceLead(db, {
          conversationId,
          customerName: userContext.userName || null,
          phone: effectivePhone,
          serviceType,
          surveyAddress: effectiveAddress,
          scaleOrQuantity: effectiveScale,
          expectedTime: effectiveTime || 'Càng sớm càng tốt',
          customerRequirement: message,
          notes: 'Khách yêu cầu xếp lịch khảo sát cụ thể'
        });
      }

      return {
        success: true,
        reply: `Dạ, em đã ghi nhận thời gian mong muốn của anh/chị${effectiveTime ? ` (dự kiến: **${effectiveTime}**)` : ''}. Tuy nhiên, để đảm bảo chất lượng và sắp xếp đội ngũ kỹ thuật phù hợp, nhân viên phụ trách của bên em sẽ liên hệ qua điện thoại để xác nhận lịch hẹn chính xác với anh/chị trước nhé ạ.\n\nAnh/chị vui lòng để lại số điện thoại và địa chỉ công trình để bên em hỗ trợ sắp xếp nhanh nhất ạ!`,
        revealCatalog: false,
        recommendedField: null,
        recommendedProduct: null,
        stage: 'SERVICE_SCHEDULE_DISCLAIMER',
        toolsUsed: ['service_consultant']
      };
    }

    // -------------------------------------------------------------
    // TIẾP NHẬN THÔNG TIN ĐA LƯỢT (Conversational Intake)
    // -------------------------------------------------------------
    // Nếu có ít nhất SĐT hoặc Địa chỉ mới được cung cấp trong câu này
    if (extracted.phone || extracted.surveyAddress || (existingLead && (extracted.scaleOrQuantity || extracted.expectedTime))) {
      const savedLead = await CrmLeadService.createOrUpdateServiceLead(db, {
        conversationId,
        customerName: userContext.userName || null,
        phone: effectivePhone,
        serviceType,
        surveyAddress: effectiveAddress,
        scaleOrQuantity: effectiveScale,
        expectedTime: effectiveTime,
        customerRequirement: message,
        notes: `Khách cung cấp: ${[
          effectivePhone ? `SĐT: ${effectivePhone}` : null,
          effectiveAddress ? `Địa chỉ: ${effectiveAddress}` : null,
          effectiveScale ? `Quy mô: ${effectiveScale}` : null,
          effectiveTime ? `Thời gian: ${effectiveTime}` : null
        ].filter(Boolean).join(' | ')}`
      });

      // Tạo thông báo cho chủ shop nếu có đầy đủ liên hệ
      if (effectivePhone && effectiveAddress) {
        try {
          await NotificationEngine.createNotification({
            ownerId: 'owner_tri',
            taskId: null,
            reminderId: null,
            title: `Yêu cầu khảo sát công trình: ${savedLead?.customer_name || 'Khách hàng'}`,
            content: `Khách ${savedLead?.customer_name || ''} (${effectivePhone}) yêu cầu khảo sát thi công tại: ${effectiveAddress}. Nhu cầu: ${savedLead?.service_type || 'Thi công lắp đặt'}.`
          });
        } catch {}
      }

      // TRƯỜNG HỢP A: Đã có cả SĐT và Địa chỉ
      if (effectivePhone && effectiveAddress) {
        // Nếu thiếu quy mô hoặc thời gian mong muốn -> hỏi tiếp nhẹ nhàng
        if (!effectiveScale && !effectiveTime) {
          return {
            success: true,
            reply: `Dạ, em đã lưu lại số điện thoại **${effectivePhone}** và địa chỉ công trình tại **${effectiveAddress}** của anh/chị rồi ạ.\n\nAnh/chị dự kiến thực hiện hạng mục này vào thời gian nào và quy mô khoảng bao nhiêu thiết bị/khối lượng để bên em chuẩn bị trước phương án khảo sát ạ?`,
            revealCatalog: false,
            recommendedField: null,
            recommendedProduct: null,
            stage: 'SERVICE_LEAD_CAPTURED',
            toolsUsed: ['service_consultant', 'crm_lead_service']
          };
        }

        // Đã có đầy đủ hoặc đã hỏi thêm -> Xác nhận hoàn tất quy trình tiếp nhận
        const serviceTitles = {
          SERVICE_SURVEY_REQUEST: 'Thi công & Khảo sát công trình',
          INSTALLATION_REQUEST: 'Lắp đặt / Tháo dỡ thiết bị',
          MAINTENANCE_REQUEST: 'Bảo trì & Bảo dưỡng định kỳ',
          REPAIR_REQUEST: 'Sửa chữa & Khắc phục sự cố'
        };
        const titleStr = serviceTitles[serviceType] || 'Thi công & Khảo sát công trình';

        return {
          success: true,
          reply: `Dạ, em đã ghi nhận đầy đủ thông tin yêu cầu khảo sát công trình của anh/chị vào hệ thống CRM bên em ạ:\n\n📋 **THÔNG TIN TIẾP NHẬN KHẢO SÁT:**\n• Hạng mục dịch vụ: **${titleStr}**\n• Số điện thoại: **${effectivePhone}**\n• Địa chỉ công trình: **${effectiveAddress}**\n${effectiveScale ? `• Quy mô dự kiến: **${effectiveScale}**\n` : ''}${effectiveTime ? `• Thời gian mong muốn: **${effectiveTime}**\n` : ''}\nNhân viên phụ trách kỹ thuật/khảo sát của bên em sẽ sớm liên hệ trực tiếp qua số điện thoại trên để trao đổi và thống nhất lịch hẹn khảo sát thực tế với anh/chị nhé ạ!`,
          revealCatalog: false,
          recommendedField: null,
          recommendedProduct: null,
          stage: 'SERVICE_SURVEY_CONFIRMED',
          toolsUsed: ['service_consultant', 'crm_lead_service']
        };
      }

      // TRƯỜNG HỢP B: Chỉ mới có Số điện thoại, chưa có Địa chỉ
      if (effectivePhone && !effectiveAddress) {
        return {
          success: true,
          reply: `Dạ em đã ghi nhận số điện thoại **${effectivePhone}** của anh/chị rồi ạ. Anh/chị cho em xin thêm địa chỉ công trình cần khảo sát để bên em sắp xếp kỹ thuật viên khu vực phù hợp nhé ạ!`,
          revealCatalog: false,
          recommendedField: null,
          recommendedProduct: null,
          stage: 'SERVICE_ASKING_ADDRESS',
          toolsUsed: ['service_consultant', 'crm_lead_service']
        };
      }

      // TRƯỜNG HỢP C: Chỉ mới có Địa chỉ, chưa có Số điện thoại
      if (!effectivePhone && effectiveAddress) {
        return {
          success: true,
          reply: `Dạ em đã ghi nhận địa chỉ công trình tại **${effectiveAddress}** rồi ạ. Anh/chị cho em xin thêm số điện thoại liên hệ để bên em liên hệ sắp xếp lịch khảo sát thực tế nhé ạ!`,
          revealCatalog: false,
          recommendedField: null,
          recommendedProduct: null,
          stage: 'SERVICE_ASKING_PHONE',
          toolsUsed: ['service_consultant', 'crm_lead_service']
        };
      }
    }

    // -------------------------------------------------------------
    // CÂU HỎI BAN ĐẦU: Chưa có SĐT, chưa có Địa chỉ
    // Trả lời theo đúng Mẫu chuẩn mực bắt buộc của Chủ tài khoản
    // -------------------------------------------------------------
    return {
      success: true,
      reply: this.STANDARD_RESPONSE,
      revealCatalog: false,
      recommendedField: null,
      recommendedProduct: null,
      stage: 'SERVICE_SURVEY_INITIATED',
      toolsUsed: ['service_consultant']
    };
  }
}

export default ServiceConsultant;
