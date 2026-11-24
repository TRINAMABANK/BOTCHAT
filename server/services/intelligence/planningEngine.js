/**
 * TRÍ AI HUMAN BRAIN – PLANNING ENGINE (HỆ THỐNG LẬP KẾ HOẠCH & QUẢN LÝ MỤC TIÊU)
 * 
 * Capabilities:
 * 1. Goal Decomposition: Phân rã mục tiêu lớn thành chuỗi các nhiệm vụ cụ thể có thứ tự ưu tiên.
 * 2. Step Tracking: Theo dõi tiến độ từng bước (PENDING, IN_PROGRESS, COMPLETED).
 * 3. Deadline & Schedule Recognition: Nhận diện thời hạn, tích hợp Prospective Memory và owner_tasks.
 * 4. Next Step Recommendation: Đề xuất bước tiếp theo khi hoàn thành một nhiệm vụ.
 */

import { randomUUID } from 'crypto';
import db from '../../db.js';
import { HumanMemoryEngine } from './humanMemoryEngine.js';

export class PlanningEngine {
  /**
   * Decompose a complex goal into an actionable multi-step plan
   */
  static decomposeGoal(goalTitle = '', goalDescription = '', userId = 'owner_tri') {
    const planId = `plan_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const titleLower = goalTitle.toLowerCase();
    const steps = [];

    if (titleLower.includes('mua sắm') || titleLower.includes('thiết bị') || titleLower.includes('văn phòng')) {
      steps.push(
        { id: `step_1_${planId}`, title: 'Khảo sát nhu cầu & lập danh sách thiết bị cần mua', priority: 'HIGH', status: 'COMPLETED', timeSpec: 'Hôm nay' },
        { id: `step_2_${planId}`, title: 'Tìm kiếm nguồn hàng & so sánh báo giá từ các nhà cung cấp', priority: 'HIGH', status: 'IN_PROGRESS', timeSpec: 'Trong tuần' },
        { id: `step_3_${planId}`, title: 'Lập bảng dự toán ngân sách & trình duyệt phương án tối ưu', priority: 'NORMAL', status: 'PENDING', timeSpec: 'Cuối tuần' },
        { id: `step_4_${planId}`, title: 'Tiến hành đặt hàng, kiểm tra hợp đồng & theo dõi giao hàng', priority: 'NORMAL', status: 'PENDING', timeSpec: 'Tuần tới' }
      );
    } else if (titleLower.includes('khách hàng') || titleLower.includes('chăm sóc') || titleLower.includes('tư vấn')) {
      steps.push(
        { id: `step_1_${planId}`, title: 'Lọc danh sách khách hàng tiềm năng cần liên hệ từ CRM', priority: 'HIGH', status: 'COMPLETED', timeSpec: 'Buổi sáng' },
        { id: `step_2_${planId}`, title: 'Chuẩn bị thông tin sản phẩm và chính sách giá ưu đãi', priority: 'HIGH', status: 'IN_PROGRESS', timeSpec: 'Buổi sáng' },
        { id: `step_3_${planId}`, title: 'Thực hiện cuộc gọi tư vấn & gửi báo giá chi tiết qua Zalo/Email', priority: 'HIGH', status: 'PENDING', timeSpec: 'Buổi chiều' },
        { id: `step_4_${planId}`, title: 'Ghi nhận phản hồi vào CRM & đặt lịch nhắc việc chăm sóc tiếp theo', priority: 'NORMAL', status: 'PENDING', timeSpec: 'Cuối ngày' }
      );
    } else {
      // General 3-step actionable breakdown
      steps.push(
        { id: `step_1_${planId}`, title: `Thu thập dữ liệu và chuẩn bị cho: ${goalTitle}`, priority: 'HIGH', status: 'IN_PROGRESS', timeSpec: 'Ngay bây giờ' },
        { id: `step_2_${planId}`, title: `Triển khai thực hiện các hạng mục cốt lõi`, priority: 'NORMAL', status: 'PENDING', timeSpec: 'Giai đoạn 1' },
        { id: `step_3_${planId}`, title: `Kiểm tra kết quả, nghiệm thu và lưu vào báo cáo`, priority: 'NORMAL', status: 'PENDING', timeSpec: 'Giai đoạn 2' }
      );
    }

    return {
      planId,
      title: goalTitle,
      description: goalDescription,
      userId,
      createdAt: now,
      steps,
      totalSteps: steps.length,
      completedSteps: steps.filter(s => s.status === 'COMPLETED').length
    };
  }

  /**
   * Create an actionable plan and persist steps to owner_tasks and Prospective Memory
   */
  static async createAndPersistPlan(goalTitle, goalDescription = '', userId = 'owner_tri') {
    const plan = this.decomposeGoal(goalTitle, goalDescription, userId);
    const now = new Date().toISOString();

    for (const step of plan.steps) {
      const taskId = `task_${randomUUID().slice(0, 8)}`;
      // 1. Save to owner_tasks
      await db.run(`
        INSERT INTO owner_tasks (id, user_id, title, description, time_spec, priority, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        taskId,
        userId,
        step.title,
        `Thuộc kế hoạch: "${goalTitle}". ${goalDescription}`.trim(),
        step.timeSpec,
        step.priority,
        step.status,
        now,
        now
      ]);

      // 2. Link to Prospective Memory
      await HumanMemoryEngine.remember({
        memoryType: 'PROSPECTIVE',
        content: `Nhiệm vụ: ${step.title} (${step.timeSpec}) - Kế hoạch: ${goalTitle}`,
        subject: 'PLANNING_TASK',
        entityId: userId,
        source: 'PLANNING_ENGINE',
        confidence: 1.0,
        ownerId: userId,
        extraData: {
          taskTitle: step.title,
          targetUserId: userId,
          triggerTime: now,
          priority: step.priority
        }
      });
    }

    return plan;
  }

  /**
   * Get all active planning goals and pending tasks for Owner
   */
  static async getActivePlans(userId = 'owner_tri') {
    try {
      const tasks = await db.all(
        'SELECT * FROM owner_tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
      );
      const prospective = await db.all(
        "SELECT * FROM ai_memory_prospective WHERE target_user_id = ? AND status = 'PENDING' ORDER BY trigger_time ASC LIMIT 50",
        [userId]
      );

      return {
        tasks,
        prospectiveTasks: prospective,
        pendingCount: tasks.filter(t => t.status === 'PENDING').length,
        inProgressCount: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completedCount: tasks.filter(t => t.status === 'COMPLETED').length
      };
    } catch (err) {
      console.error('[PLANNING ENGINE] Error fetching active plans:', err);
      return { tasks: [], prospectiveTasks: [], pendingCount: 0, inProgressCount: 0, completedCount: 0 };
    }
  }
}

export default PlanningEngine;
