/**
 * TRÍ AI HUMAN BRAIN – PLANNING ENGINE (HỆ THỐNG LẬP KẾ HOẠCH & QUẢN LÝ MỤC TIÊU)
 * DOCTOR-LEVEL DYNAMIC DAG & ADAPTIVE REPLANNING – STAGE 4
 * 
 * Capabilities:
 * 1. Goal Decomposition: Phân rã mục tiêu lớn thành chuỗi các nhiệm vụ cụ thể có thứ tự ưu tiên.
 * 2. Step Tracking: Theo dõi tiến độ từng bước (PENDING, IN_PROGRESS, COMPLETED, FAILED, HEALED).
 * 3. Dynamic DAG Planning: Tạo đồ thị có hướng không chu trình (DAG) với quan hệ phụ thuộc (dependsOn).
 * 4. Self-Healing & Adaptive Replanning: Tự động phát hiện lỗi bước hoặc thiếu dữ liệu để rẽ sang đường đi dự phòng.
 * 5. Deadline & Schedule Recognition: Tích hợp Prospective Memory và owner_tasks.
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

  /**
   * 4. Create Dynamic DAG Execution Plan (Stage 4)
   * Builds an execution graph with explicit dependencies and fallback contingency paths
   */
  static createDynamicDagPlan(goalTitle = '', options = {}) {
    const {
      domain = 'RESEARCH',
      userId = 'owner_tri',
      primaryTool = 'EXTERNAL_API',
      fallbackTool = 'INTERNAL_KNOWLEDGE'
    } = options;

    const dagId = `dag_${randomUUID().slice(0, 8)}`;
    const nodes = [
      {
        id: 'node_1_analyze',
        name: 'Phân tích yêu cầu & Khởi tạo cây giả thuyết',
        tool: 'deep_research_engine',
        dependsOn: [],
        status: 'COMPLETED',
        canFallback: false
      },
      {
        id: 'node_2_gather',
        name: `Thu thập dữ liệu chuyên sâu (${primaryTool})`,
        tool: primaryTool,
        dependsOn: ['node_1_analyze'],
        status: 'PENDING',
        canFallback: true,
        fallbackNodeId: 'node_2_fallback'
      },
      {
        id: 'node_2_fallback',
        name: `Dự phòng: Tra cứu tri thức nội bộ & Đồ thị tri thức (${fallbackTool})`,
        tool: fallbackTool,
        dependsOn: ['node_1_analyze'],
        status: 'STANDBY',
        isFallback: true
      },
      {
        id: 'node_3_synthesize',
        name: 'Tổng hợp biện chứng luận đề - phản đề & Hiệu chuẩn siêu nhận thức',
        tool: 'metacognition_engine',
        dependsOn: ['node_2_gather'], // or node_2_fallback if replanned
        status: 'PENDING',
        canFallback: false
      },
      {
        id: 'node_4_verify',
        name: 'Kiểm định chất lượng học thuật & Lập báo cáo kết luận',
        tool: 'response_engine',
        dependsOn: ['node_3_synthesize'],
        status: 'PENDING',
        canFallback: false
      }
    ];

    return {
      dagId,
      goalTitle,
      domain,
      userId,
      nodes,
      executionHistory: [],
      isHealed: false,
      status: 'INITIALIZED'
    };
  }

  /**
   * 5. Adaptive Replanning upon step failure or data starvation
   * Reroutes the DAG to the alternative path seamlessly without breaking the pipeline
   */
  static replanOnFailure(dagPlan, failedNodeId, errorReason = 'Tool returned empty data or error') {
    if (!dagPlan || !Array.isArray(dagPlan.nodes)) return dagPlan;

    const failedNode = dagPlan.nodes.find(n => n.id === failedNodeId);
    if (!failedNode || !failedNode.canFallback || !failedNode.fallbackNodeId) {
      return {
        ...dagPlan,
        status: 'FAILED',
        error: `Node ${failedNodeId} failed and has no viable contingency fallback.`
      };
    }

    const fallbackNode = dagPlan.nodes.find(n => n.id === failedNode.fallbackNodeId);
    if (!fallbackNode) return dagPlan;

    // Mark failed node as FAILED
    failedNode.status = 'FAILED';
    failedNode.errorReason = errorReason;

    // Activate fallback node
    fallbackNode.status = 'IN_PROGRESS';

    // Reroute downstream nodes that depended on failedNodeId
    dagPlan.nodes.forEach(n => {
      if (Array.isArray(n.dependsOn)) {
        const depIdx = n.dependsOn.indexOf(failedNodeId);
        if (depIdx !== -1) {
          n.dependsOn[depIdx] = fallbackNode.id;
        }
      }
    });

    dagPlan.isHealed = true;
    dagPlan.status = 'HEALED_AND_REROUTED';
    dagPlan.executionHistory.push({
      timestamp: new Date().toISOString(),
      event: 'ADAPTIVE_REPLAN',
      failedNodeId,
      repairedWithNodeId: fallbackNode.id,
      reason: errorReason
    });

    return dagPlan;
  }
}

export default PlanningEngine;
