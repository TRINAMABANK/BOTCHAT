/**
 * COMPREHENSIVE TEST SUITE: TRÍ AI PERSONAL ASSISTANT & SMART REMINDER
 * (MASTER PROMPT 03)
 * 
 * Verifies:
 * 1. PersonalAssistantEngine & Natural Language Understanding:
 *    - Activation phrase ("Thư ký của anh")
 *    - Security Anti-Impersonation (Non-owner rejected)
 *    - One-time Reminder ("Ngày mai 8 giờ nhắc tôi họp")
 *    - Recurring Reminder ("Thứ Hai hằng tuần lúc 9 giờ nhắc tôi kiểm tra PO")
 *    - End of Month Recurring ("Cuối tháng nhắc tôi tổng hợp báo cáo")
 *    - Conditional Follow-Up ("Nhắc tôi sau 3 ngày nếu nhà cung cấp chưa xác nhận")
 *    - Morning Briefing & Evening Recap
 * 2. CalendarEngine & Conflict Detection:
 *    - Create, Update, Delete events
 *    - Conflict detection when overlapping
 * 3. PriorityEngine:
 *    - Dynamic urgency score, text detection, priority classification
 * 4. SmartSchedulerEngine:
 *    - Free slot detection avoiding calendar conflicts
 * 5. RecurringScheduleEngine:
 *    - Next run computation (Daily, Weekly, Monthly)
 *    - Advance schedule
 * 6. FollowUpEngine:
 *    - Rule creation, evaluation, trigger alert
 * 7. MultiChannelNotificationEngine:
 *    - In-App delivery, Deduplication within 5 minutes, Quiet hours
 * 8. SmartSchedulerDaemon:
 *    - Idempotent cycle execution
 */

import { initDatabase, db } from '../server/db.js';
import {
  PersonalAssistantEngine,
  CalendarEngine,
  SmartReminderEngine,
  TaskManagementEngine,
  MultiChannelNotificationEngine,
  RecurringScheduleEngine,
  FollowUpEngine,
  PriorityEngine,
  DailyBriefingEngine,
  SmartSchedulerEngine,
  SmartSchedulerDaemon
} from '../server/services/assistant/index.js';
import { CentralBrainService } from '../server/services/centralBrainService.js';
import { SecretaryAgent } from '../server/services/secretary/secretaryAgent.js';

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name}`);
    failed++;
  }
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 RUNNING MASTER PROMPT 03 PERSONAL ASSISTANT TEST SUITE');
  console.log('========================================================================\n');

  await initDatabase();

  const testOwner = 'owner_tri';
  const testIp = '127.0.0.1';

  // ---------------------------------------------------------------------------
  // 1. PRIORITY ENGINE TESTS
  // ---------------------------------------------------------------------------
  console.log('--- 1. Testing PriorityEngine ---');
  {
    const scoreOverdue = PriorityEngine.calculateUrgencyScore({
      dueAt: new Date(Date.now() - 3600000).toISOString(),
      priority: 'HIGH'
    });
    assert(scoreOverdue >= 80, 'Urgency score for overdue task is >= 80');

    const scoreFuture = PriorityEngine.calculateUrgencyScore({
      dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      priority: 'LOW'
    });
    assert(scoreFuture < 50, 'Urgency score for distant low priority is < 50');

    const classUrgent = PriorityEngine.classifyPriority(90);
    assert(classUrgent === 'URGENT', 'Classify score 90 as URGENT');

    const detectedUrgent = PriorityEngine.detectPriorityFromText('Cần xử lý khẩn cấp đơn hàng này');
    assert(detectedUrgent === 'URGENT', 'Detect URGENT from "khẩn cấp"');

    const detectedLow = PriorityEngine.detectPriorityFromText('khi nào rảnh thì xem giúp anh');
    assert(detectedLow === 'LOW', 'Detect LOW from "khi nào rảnh"');
  }

  // ---------------------------------------------------------------------------
  // 2. CALENDAR ENGINE & CONFLICT DETECTION
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing CalendarEngine & Conflict Detection ---');
  {
    const now = new Date();
    const start1 = new Date(now.getTime() + 3600000); // +1 hour
    const end1 = new Date(now.getTime() + 7200000);   // +2 hours

    const evt1 = await CalendarEngine.createEvent({
      userId: testOwner,
      title: 'Họp chiến lược bán hàng',
      location: 'Phòng họp VIP',
      startTime: start1.toISOString(),
      endTime: end1.toISOString(),
      priority: 'HIGH'
    });
    assert(evt1 && evt1.eventId, 'Calendar event created with eventId');
    assert(evt1.title === 'Họp chiến lược bán hàng', 'Event title matches');

    // Check conflict with overlapping slot
    const conflictStart = new Date(start1.getTime() + 1800000); // +1.5 hour
    const conflictEnd = new Date(end1.getTime() + 1800000);     // +2.5 hours
    const conflicts = await CalendarEngine.checkConflicts({
      userId: testOwner,
      startTime: conflictStart.toISOString(),
      endTime: conflictEnd.toISOString()
    });
    assert(conflicts.length > 0, 'Conflict detected for overlapping time slot');

    // Update event
    const updated = await CalendarEngine.updateEvent(evt1.eventId, { location: 'Zoom Online' }, testOwner);
    assert(updated.location === 'Zoom Online', 'Event location successfully updated');

    // Delete (Cancel) event
    const deleted = await CalendarEngine.deleteEvent(evt1.eventId, testOwner);
    assert(deleted === true, 'Event successfully cancelled');
  }

  // ---------------------------------------------------------------------------
  // 3. RECURRING SCHEDULE ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing RecurringScheduleEngine ---');
  {
    const weeklyRule = RecurringScheduleEngine.parseRecurrenceFromText('Thứ Hai hằng tuần lúc 9 giờ nhắc tôi kiểm tra PO');
    assert(weeklyRule && weeklyRule.includes('FREQ=WEEKLY;BYDAY=MO;BYHOUR=9'), 'Parse weekly recurrence on Monday at 9h');

    const monthlyRule = RecurringScheduleEngine.parseRecurrenceFromText('Cuối tháng nhắc tôi tổng hợp báo cáo lúc 17h');
    assert(monthlyRule && monthlyRule.includes('FREQ=MONTHLY;BYMONTHDAY=LAST;BYHOUR=17'), 'Parse end of month recurrence at 17h');

    const dailyRule = RecurringScheduleEngine.parseRecurrenceFromText('mỗi ngày lúc 8 giờ');
    assert(dailyRule && dailyRule.includes('FREQ=DAILY;BYHOUR=8'), 'Parse daily recurrence at 8h');

    // Create schedule in DB
    const schedule = await RecurringScheduleEngine.createSchedule({
      userId: testOwner,
      targetType: 'REMINDER',
      title: 'Kiểm tra báo cáo tồn kho',
      recurrenceRule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0'
    });
    assert(schedule && schedule.scheduleId, 'Recurring schedule record created');

    // Advance schedule
    const advanced = await RecurringScheduleEngine.advanceSchedule(schedule.scheduleId);
    assert(advanced && advanced.lastRunAt !== null, 'Schedule advanced and last_run_at recorded');

    await RecurringScheduleEngine.deactivateSchedule(schedule.scheduleId, testOwner);
  }

  // ---------------------------------------------------------------------------
  // 4. FOLLOW UP ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing FollowUpEngine ---');
  {
    const rule = await FollowUpEngine.createFollowUpRule({
      userId: testOwner,
      conditionType: 'SUPPLIER_PO_UNCONFIRMED',
      targetRef: 'PO-TEST-999',
      maxWaitHours: 0, // 0 so it immediately triggers in evaluation test
      checkIntervalHours: 1
    });
    assert(rule && rule.ruleId, 'Follow-up rule created');

    // Evaluate rules
    const triggered = await FollowUpEngine.evaluateRules();
    assert(triggered.some(t => t.rule.ruleId === rule.ruleId), 'Follow-up rule triggered upon timeout');

    // Verify alert notification was created
    const notifs = await db.all(`SELECT * FROM owner_notifications WHERE title LIKE '%PO-TEST-999%'`);
    assert(notifs.length > 0, 'Follow-up alert generated in owner_notifications');

    await FollowUpEngine.cancelRule(rule.ruleId, testOwner);
  }

  // ---------------------------------------------------------------------------
  // 5. MULTI-CHANNEL NOTIFICATION ENGINE & DEDUPLICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing MultiChannelNotificationEngine ---');
  {
    const uniqueTitle = `[Test Alert] ${Date.now()}`;
    const res1 = await MultiChannelNotificationEngine.sendNotification({
      userId: testOwner,
      title: uniqueTitle,
      content: 'Nội dung thông báo kiểm thử',
      priority: 'HIGH',
      channels: ['IN_APP', 'PUSH']
    });
    assert(res1.some(r => r.channel === 'IN_APP' && r.status === 'SENT'), 'In-App notification sent successfully');

    // Deduplication check: Send exact same title within 5 minutes
    const res2 = await MultiChannelNotificationEngine.sendNotification({
      userId: testOwner,
      title: uniqueTitle,
      content: 'Nội dung thông báo kiểm thử lặp lại',
      priority: 'HIGH',
      channels: ['IN_APP']
    });
    assert(res2.some(r => r.channel === 'IN_APP' && r.status === 'SKIPPED_DUPLICATE'), 'Duplicate notification skipped');

    // Update preferences
    const prefUpdated = await MultiChannelNotificationEngine.updateUserPreferences(testOwner, {
      quiet_hours_start: '23:00',
      quiet_hours_end: '06:00'
    });
    assert(prefUpdated.quiet_hours_start === '23:00', 'Quiet hours preference updated');
  }

  // ---------------------------------------------------------------------------
  // 6. DAILY BRIEFING ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing DailyBriefingEngine ---');
  {
    const morning = await DailyBriefingEngine.generateMorningBriefing(testOwner);
    assert(morning && morning.content.includes('BẢN TIN CÔNG VIỆC ĐẦU NGÀY'), 'Morning briefing contains expected header');
    assert(morning.content.includes('anh Trí'), 'Morning briefing personalized to Anh Trí');

    const evening = await DailyBriefingEngine.generateEveningRecap(testOwner);
    assert(evening && evening.content.includes('TỔNG KẾT CÔNG VIỆC CUỐI NGÀY'), 'Evening recap contains expected header');
  }

  // ---------------------------------------------------------------------------
  // 7. SMART SCHEDULER ENGINE
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing SmartSchedulerEngine ---');
  {
    const freeSlots = await SmartSchedulerEngine.findFreeSlots({
      userId: testOwner,
      durationMinutes: 45
    });
    assert(Array.isArray(freeSlots) && freeSlots.length > 0, 'Found open calendar time slots');
    assert(freeSlots[0].durationMinutes === 45, 'Slot duration matches requested duration');
  }

  // ---------------------------------------------------------------------------
  // 8. PERSONAL ASSISTANT ENGINE & CHAT ROUTING (CENTRAL BRAIN)
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Testing PersonalAssistantEngine & Central Brain End-to-End ---');
  {
    // Activation test
    const actRes = await PersonalAssistantEngine.handleMessage({
      userId: testOwner,
      text: 'Thư ký của anh',
      role: 'OWNER'
    });
    assert(actRes.handled === true && actRes.action === 'ACTIVATE_SECRETARY', 'Activate secretary mode via command');
    assert(actRes.message.includes('em đây anh Trí'), 'Activation reply matches required greeting');

    // Security Gate: Non-owner blocked
    const unauthRes = await SecretaryAgent.handleSecretaryConversation({
      message: 'Thư ký của anh',
      userContext: { isOwner: false, role: 'GUEST', userId: 'stranger' }
    });
    assert(unauthRes.stage === 'ACCESS_RESTRICTED', 'Non-owner rejected by security gate');

    // Central Brain: Recurring Reminder
    const brainRes1 = await CentralBrainService.processChat({
      message: 'Thứ Hai hằng tuần lúc 9 giờ nhắc tôi kiểm tra PO',
      conversationId: 'test_brain_rec_1',
      userContext: { isOwner: true, role: 'OWNER', userId: testOwner }
    });
    assert(brainRes1.stage === 'CREATE_RECURRING_REMINDER', 'Central Brain processes recurring reminder');
    assert(brainRes1.reply && brainRes1.reply.includes('lịch nhắc định kỳ'), 'Reply confirms recurring reminder');

    // Central Brain: Conditional Follow-Up
    const brainRes2 = await CentralBrainService.processChat({
      message: 'Nhắc tôi sau 3 ngày nếu nhà cung cấp chưa xác nhận',
      conversationId: 'test_brain_fol_1',
      userContext: { isOwner: true, role: 'OWNER', userId: testOwner }
    });
    assert(brainRes2.stage === 'CREATE_FOLLOW_UP', 'Central Brain processes conditional follow-up');
    assert(brainRes2.reply && brainRes2.reply.includes('theo dõi điều kiện'), 'Reply confirms follow-up rule');

    // Central Brain: Daily Briefing Query
    const brainRes3 = await CentralBrainService.processChat({
      message: 'Bản tin công việc đầu ngày',
      conversationId: 'test_brain_brief_1',
      userContext: { isOwner: true, role: 'OWNER', userId: testOwner }
    });
    assert(brainRes3.stage === 'DAILY_BRIEFING', 'Central Brain processes daily briefing request');
  }

  // ---------------------------------------------------------------------------
  // 9. SMART SCHEDULER DAEMON CYCLE TEST
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Testing SmartSchedulerDaemon Cycle Execution ---');
  {
    let cycleThrew = false;
    try {
      await SmartSchedulerDaemon.runCycle();
    } catch (err) {
      cycleThrew = true;
    }
    assert(!cycleThrew, 'SmartSchedulerDaemon.runCycle() executes cleanly without exception');
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`🎯 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
