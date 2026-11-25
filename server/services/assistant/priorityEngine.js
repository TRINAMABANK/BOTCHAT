/**
 * PRIORITY ENGINE – BỘ MÁY ĐÁNH GIÁ VÀ XẾP HẠNG MỨC ĐỘ ƯU TIÊN THÔNG MINH
 * (MASTER PROMPT 03: TRÍ AI PERSONAL ASSISTANT)
 * 
 * Logic:
 * Urgency Score = (Deadline Weight * 0.5) + (Explicit Priority Weight * 0.3) + (Age Weight * 0.2)
 * Trả về xếp hạng: LOW (1), MEDIUM (2), HIGH (3), URGENT (4)
 */

export class PriorityEngine {
  static PRIORITY_WEIGHTS = {
    LOW: 1,
    NORMAL: 2,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4
  };

  /**
   * Tính toán điểm khẩn cấp (Urgency Score) từ 0 đến 100
   */
  static calculateUrgencyScore({ dueAt, priority = 'NORMAL', createdAt = null }) {
    const now = Date.now();
    let deadlineScore = 20; // Default when no deadline

    if (dueAt) {
      const dueTime = new Date(dueAt).getTime();
      const diffHours = (dueTime - now) / (1000 * 60 * 60);

      if (diffHours < 0) {
        // Đã quá hạn: Điểm tối đa và ưu tiên khẩn cấp
        deadlineScore = 100;
      } else if (diffHours <= 2) {
        deadlineScore = 95;
      } else if (diffHours <= 6) {
        deadlineScore = 85;
      } else if (diffHours <= 24) {
        deadlineScore = 70;
      } else if (diffHours <= 72) {
        deadlineScore = 50;
      } else {
        deadlineScore = 25;
      }
    }

    const normPriority = (priority || 'NORMAL').toUpperCase();
    const explicitWeight = this.PRIORITY_WEIGHTS[normPriority] || 2;
    const explicitScore = (explicitWeight / 4) * 100;

    let ageScore = 10;
    if (createdAt) {
      const createdTime = new Date(createdAt).getTime();
      const ageHours = (now - createdTime) / (1000 * 60 * 60);
      ageScore = Math.min(100, Math.max(10, ageHours * 2));
    } else if (dueAt && new Date(dueAt).getTime() < now) {
      // Nếu đã quá hạn mà không có createdAt, coi như đã có tuổi
      ageScore = 50;
    }

    let finalScore = Math.round(
      deadlineScore * 0.6 + explicitScore * 0.25 + ageScore * 0.15
    );

    // Đảm bảo công việc quá hạn luôn có điểm khẩn cấp tối thiểu 85
    if (dueAt && new Date(dueAt).getTime() < now) {
      finalScore = Math.max(85, finalScore);
    }

    return Math.min(100, Math.max(0, finalScore));
  }

  /**
   * Phân loại mức ưu tiên tự động dựa trên điểm số
   */
  static classifyPriority(score) {
    if (score >= 85) return 'URGENT';
    if (score >= 65) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Tự động phát hiện mức độ ưu tiên từ văn bản tiêu đề / mô tả tiếng Việt
   */
  static detectPriorityFromText(text = '') {
    if (!text) return 'NORMAL';
    const lower = text.toLowerCase();

    if (lower.includes('khẩn') || lower.includes('gấp') || lower.includes('ngay lập tức') || lower.includes('hỏa tốc')) {
      return 'URGENT';
    }
    if (lower.includes('quan trọng') || lower.includes('ưu tiên cao') || lower.includes('chú ý')) {
      return 'HIGH';
    }
    if (lower.includes('khi nào rảnh') || lower.includes('không vội') || lower.includes('ưu tiên thấp')) {
      return 'LOW';
    }
    return 'NORMAL';
  }
}
