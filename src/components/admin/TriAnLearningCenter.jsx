import React, { useState, useEffect } from 'react';
import { 
  Brain, BookOpen, AlertTriangle, CheckCircle, Clock, Search, 
  Filter, Upload, Globe, FileText, Check, X, ArrowRight, 
  Download, RefreshCw, Sparkles, Database, ShieldAlert, Award,
  FileSpreadsheet, Layers, History, CheckCircle2, UserCheck, Tag, 
  ExternalLink, ChevronRight, Eye, Edit3, Plus, SlidersHorizontal,
  ChevronDown, BarChart2, TrendingUp, AlertCircle, Building2, Bot,
  Undo2, GitCommit, SplitSquareVertical, ThumbsUp, ThumbsDown
} from 'lucide-react';

export default function TriAnLearningCenter() {
  // 7 Main Tabs as specified in Master Prompt Section 5
  // 'overview' | 'gap_report' | 'auto_learning' | 'knowledge_entries' | 'audit_history' | 'test_bench' | 'performance_report'
  const [activeTab, setActiveTab] = useState('overview');

  // Stats & KPIs
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    newToday: 0,
    waitingKnowledge: 0,
    readyToTest: 0,
    testing: 0,
    resolved: 0,
    rejected: 0,
    duplicates: 0,
    conflicts: 0,
    resolutionRate: 0,
    topTopics: [],
    topProducts: [],
    dailyTrend: []
  });
  const [top10List, setTop10List] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tab 2 & 3: Gap Reports & Queue
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterOrgId, setFilterOrgId] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab 4: Knowledge Entries Management
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [knowledgePagination, setKnowledgePagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [knowledgeFilterStatus, setKnowledgeFilterStatus] = useState('all');
  const [knowledgeFilterType, setKnowledgeFilterType] = useState('all');
  const [knowledgeConflictOnly, setKnowledgeConflictOnly] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState('');

  // Tab 5: Uploaded Documents
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Tab 7: Audit History
  const [auditLogs, setAuditLogs] = useState([]);

  // Sub-view toggles for combined convenience
  const [gapReportSubView, setGapReportSubView] = useState('all'); // 'all' | 'waiting'
  const [knowledgeSubView, setKnowledgeSubView] = useState('curated'); // 'curated' | 'uploaded'

  // Tab 3: TRÍ AN AUTO LEARNING Studio State
  const [autoLearningActiveQuestion, setAutoLearningActiveQuestion] = useState(null);
  const [autoLearningCorrectedAnswer, setAutoLearningCorrectedAnswer] = useState('');
  const [autoLearningRunning, setAutoLearningRunning] = useState(false);
  const [autoLearningResult, setAutoLearningResult] = useState(null);
  const [autoLearningFilter, setAutoLearningFilter] = useState('all'); // 'all' | 'needs_review' | 'testing' | 'resolved' | 'recurring'
  const [autoLearningSearch, setAutoLearningSearch] = useState('');

  // Version History & Rollback Modal State
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [activeVersionEntry, setActiveVersionEntry] = useState(null);
  const [entryVersions, setEntryVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // Tab 7: Performance & Weakness Analytics State
  const [weaknessAnalytics, setWeaknessAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [regressionResult, setRegressionResult] = useState(null);
  const [runningRegression, setRunningRegression] = useState(false);

  // Detail Modal State
  const [inspectQuestion, setInspectQuestion] = useState(null);

  // Teaching Studio Drawer / Modal State
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [teachingMode, setTeachingMode] = useState('DIRECT_INPUT'); // 'DIRECT_INPUT' | 'FILE_UPLOAD' | 'WEBSITE'
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [studioQuestion, setStudioQuestion] = useState('');
  const [studioAnswer, setStudioAnswer] = useState('');
  const [studioTopic, setStudioTopic] = useState('Thiết bị công nghệ');
  const [studioProductName, setStudioProductName] = useState('');
  const [studioPolicyType, setStudioPolicyType] = useState('');
  const [studioBusinessGroup, setStudioBusinessGroup] = useState('');
  const [studioTenantId, setStudioTenantId] = useState('default');
  const [studioUrl, setStudioUrl] = useState('');
  const [studioFile, setStudioFile] = useState(null);
  const [studioFileBase64, setStudioFileBase64] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [ingestSuccessMsg, setIngestSuccessMsg] = useState('');
  const [ingestWarningMsg, setIngestWarningMsg] = useState('');

  // Edit Knowledge Modal
  const [editingEntry, setEditingEntry] = useState(null);

  // Test Bench State
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testRunning, setTestRunning] = useState(false);

  // Load KPI Stats & Top 10
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, top10Res] = await Promise.all([
        fetch('/api/learning-center/stats').then(r => r.json()),
        fetch('/api/learning-center/top10-report').then(r => r.json())
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (top10Res.success) setTop10List(top10Res.data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Learning Center:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Questions (Gap Reports or Queue)
  const fetchQuestions = async (forcedStatus = null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: forcedStatus || filterStatus,
        failure_reason: filterReason,
        priority: filterPriority,
        topic: filterTopic,
        orgId: filterOrgId,
        dateFrom: filterDateFrom,
        dateTo: filterDateTo,
        search: searchQuery,
        page: pagination.page,
        limit: pagination.limit
      });
      const res = await fetch(`/api/learning-center/questions?${params.toString()}`).then(r => r.json());
      if (res.success) {
        setQuestions(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách câu hỏi:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Knowledge Entries
  const fetchKnowledgeEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: knowledgeFilterStatus,
        entryType: knowledgeFilterType,
        conflictOnly: knowledgeConflictOnly ? '1' : '0',
        search: knowledgeSearch,
        page: knowledgePagination.page,
        limit: knowledgePagination.limit
      });
      const res = await fetch(`/api/learning-center/knowledge-entries?${params.toString()}`).then(r => r.json());
      if (res.success) {
        setKnowledgeList(res.data);
        setKnowledgePagination(res.pagination);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tri thức:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Uploaded Documents
  const fetchUploadedDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/learning-center/uploaded-documents').then(r => r.json());
      if (res.success) {
        setUploadedDocs(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tài liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Audit Log
  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/learning-center/audit-log').then(r => r.json());
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử học tập:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tab Switch Effect
  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'gap_report') {
      fetchQuestions();
    } else if (activeTab === 'waiting_queue') {
      fetchQuestions('NEW');
    } else if (activeTab === 'auto_learning') {
      fetchQuestions().then(() => {});
    } else if (activeTab === 'knowledge_entries') {
      fetchKnowledgeEntries();
    } else if (activeTab === 'uploaded_docs') {
      fetchUploadedDocs();
    } else if (activeTab === 'audit_history') {
      fetchAuditLog();
    } else if (activeTab === 'performance_report') {
      fetchWeaknessAnalytics();
    }
  }, [
    activeTab, 
    filterStatus, 
    filterReason, 
    filterPriority, 
    filterTopic, 
    filterOrgId,
    pagination.page,
    knowledgeFilterStatus,
    knowledgeFilterType,
    knowledgeConflictOnly,
    knowledgePagination.page
  ]);

  // Client-side diff computation for instant preview
  const computeClientDiff = (oldText, newText) => {
    if (!oldText && !newText) return null;
    const oldTokens = (oldText || '').trim().split(/\s+/).filter(Boolean);
    const newTokens = (newText || '').trim().split(/\s+/).filter(Boolean);
    const oldSet = new Set(oldTokens.map(t => t.toLowerCase()));
    const newSet = new Set(newTokens.map(t => t.toLowerCase()));

    const added = newTokens.filter(t => !oldSet.has(t.toLowerCase()));
    const removed = oldTokens.filter(t => !newSet.has(t.toLowerCase()));

    let summary = 'Cập nhật nội dung câu trả lời chuẩn';
    if (removed.length > 0 && added.length > 0) {
      summary = `Thay thế ${removed.length} từ cũ và bổ sung ${added.length} thông tin mới`;
    } else if (added.length > 0) {
      summary = `Bổ sung ${added.length} thông tin chi tiết mới vào tri thức`;
    } else if (removed.length > 0) {
      summary = `Rút gọn và loại bỏ ${removed.length} thông tin không chính xác`;
    }

    return {
      summary,
      addedCount: added.length,
      removedCount: removed.length,
      sampleAdded: added.slice(0, 8).join(' '),
      sampleRemoved: removed.slice(0, 8).join(' '),
      similarityRatio: oldTokens.length > 0
        ? Math.round((newTokens.filter(t => oldSet.has(t.toLowerCase())).length / Math.max(oldTokens.length, newTokens.length)) * 100)
        : 0
    };
  };

  // Fetch Weakness Analytics for Tab 7
  const fetchWeaknessAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch(`/api/learning-center/weakness-analytics?orgId=${filterOrgId}`).then(r => r.json());
      if (res.success) {
        setWeaknessAnalytics(res.analytics);
      }
    } catch (err) {
      console.error('Lỗi tải báo cáo hiệu quả:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Run Regression Suite for Tab 7
  const handleRunRegression = async () => {
    try {
      setRunningRegression(true);
      const res = await fetch('/api/learning-center/run-regression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: filterOrgId })
      }).then(r => r.json());
      if (res.success) {
        setRegressionResult(res);
      }
    } catch (err) {
      console.error('Lỗi chạy regression test:', err);
    } finally {
      setRunningRegression(false);
    }
  };

  // Auto Learn Submit (GHI NHẬN VÀ HỌC)
  const handleAutoLearnSubmit = async () => {
    if (!autoLearningActiveQuestion || !autoLearningCorrectedAnswer.trim()) {
      alert('Vui lòng chọn câu hỏi và nhập câu trả lời chuẩn do quản trị viên sửa!');
      return;
    }
    try {
      setAutoLearningRunning(true);
      const res = await fetch('/api/learning-center/auto-learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: autoLearningActiveQuestion.id,
          correctedAnswer: autoLearningCorrectedAnswer,
          relatedTopic: autoLearningActiveQuestion.related_topic,
          relatedProductName: autoLearningActiveQuestion.related_product_name,
          relatedProductId: autoLearningActiveQuestion.related_product_id,
          runTestNow: true
        })
      }).then(r => r.json());

      if (res.success) {
        setAutoLearningResult(res);
        fetchQuestions();
        fetchDashboardData();
        setAutoLearningActiveQuestion(prev => prev ? {
          ...prev,
          status: res.didRollback ? 'REVIEWING' : 'RESOLVED',
          resolved_answer: autoLearningCorrectedAnswer,
          test_notes: res.didRollback ? 'Kiểm thử không đạt: Tự động khôi phục phiên bản trước.' : 'Kiểm thử đạt yêu cầu (RESOLVED).'
        } : null);
      } else {
        alert('Lỗi tiếp thu tri thức: ' + (res.error || 'Vui lòng kiểm tra lại.'));
      }
    } catch (err) {
      console.error('Lỗi tiếp thu tự học:', err);
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setAutoLearningRunning(false);
    }
  };

  // Ignore Question (BỎ QUA)
  const handleIgnoreQuestion = async (questionId) => {
    if (!confirm('Bạn có chắc chắn muốn bỏ qua câu hỏi này không? Bản ghi sẽ chuyển sang REJECTED.')) return;
    try {
      const res = await fetch(`/api/learning-center/questions/${questionId}/ignore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Bỏ qua trực tiếp bởi Quản trị viên' })
      }).then(r => r.json());

      if (res.success) {
        fetchQuestions();
        fetchDashboardData();
        if (autoLearningActiveQuestion?.id === questionId) {
          setAutoLearningActiveQuestion(prev => prev ? { ...prev, status: 'REJECTED' } : null);
        }
      }
    } catch (err) {
      console.error('Lỗi bỏ qua câu hỏi:', err);
    }
  };

  // Open Version History Modal
  const handleOpenVersions = async (entryOrKnowledgeId) => {
    try {
      setLoadingVersions(true);
      const kId = typeof entryOrKnowledgeId === 'object' ? (entryOrKnowledgeId.id || entryOrKnowledgeId.resolved_knowledge_id) : entryOrKnowledgeId;
      setActiveVersionEntry(typeof entryOrKnowledgeId === 'object' ? entryOrKnowledgeId : { id: kId });
      setShowVersionModal(true);

      const res = await fetch(`/api/learning-center/knowledge/${kId}/versions`).then(r => r.json());
      if (res.success) {
        setEntryVersions(res.versions || []);
      }
    } catch (err) {
      console.error('Lỗi tải lịch sử phiên bản:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  // Rollback to target version
  const handleRollbackVersion = async (targetVersion) => {
    if (!activeVersionEntry || !targetVersion) return;
    if (!confirm(`Bạn có chắc chắn muốn khôi phục tri thức về phiên bản v${targetVersion} không?`)) return;
    try {
      setRollingBack(true);
      const kId = activeVersionEntry.id || activeVersionEntry.resolved_knowledge_id;
      const res = await fetch(`/api/learning-center/knowledge/${kId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetVersion })
      }).then(r => r.json());

      if (res.success) {
        alert(`Khôi phục thành công về phiên bản v${targetVersion}!`);
        handleOpenVersions(kId);
        fetchKnowledgeEntries();
        fetchQuestions();
        fetchDashboardData();
      } else {
        alert('Lỗi khôi phục: ' + (res.error || 'Vui lòng thử lại.'));
      }
    } catch (err) {
      console.error('Lỗi khôi phục phiên bản:', err);
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setRollingBack(false);
    }
  };

  // File Upload to Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStudioFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result.split(',')[1];
      setStudioFileBase64(base64Str);
    };
    reader.readAsDataURL(file);
  };

  // Open Studio Drawer for a Specific Question
  const handleOpenStudioForQuestion = (q) => {
    setSelectedQuestion(q);
    setStudioQuestion(q.original_question || q.question);
    setStudioProductName(q.related_product_name || '');
    setStudioTopic(q.related_topic || 'Thiết bị công nghệ');
    setStudioTenantId(q.org_id || 'default');
    setTestQuery(q.original_question || q.question);
    setIngestSuccessMsg('');
    setIngestWarningMsg('');
    setPreviewContent('');
    setShowStudioModal(true);
  };

  // Submit Ingestion (Teaching TRÍ AN)
  const handleIngestKnowledge = async (e) => {
    e.preventDefault();
    setIngestSuccessMsg('');
    setIngestWarningMsg('');
    try {
      setLoading(true);
      let sourceType = 'DIRECT_INPUT';
      if (teachingMode === 'WEBSITE') sourceType = 'WEBSITE';
      else if (teachingMode === 'FILE_UPLOAD' && studioFile) {
        const ext = studioFile.name.split('.').pop().toUpperCase();
        if (ext === 'PDF') sourceType = 'PDF';
        else if (ext === 'DOCX' || ext === 'DOC') sourceType = 'WORD';
        else if (ext === 'XLSX' || ext === 'XLS') sourceType = 'EXCEL';
        else if (ext === 'CSV') sourceType = 'CSV';
        else sourceType = 'TXT';
      }

      const payload = {
        unansweredQuestionId: selectedQuestion?.id || null,
        entryType: teachingMode === 'WEBSITE' ? 'WEBSITE' : (teachingMode === 'FILE_UPLOAD' ? 'DOCUMENT' : 'QA'),
        standardQuestion: studioQuestion,
        standardAnswer: studioAnswer,
        relatedTopic: studioTopic,
        relatedProductName: studioProductName,
        policyType: studioPolicyType,
        businessGroup: studioBusinessGroup,
        orgId: studioTenantId || 'default',
        sourceType,
        sourceFilename: studioFile ? studioFile.name : null,
        sourceUrl: studioUrl,
        fileBase64: studioFileBase64 || null,
        approvedBy: 'Admin',
        isDraft: isDraftMode
      };

      const res = await fetch('/api/learning-center/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());

      if (res.success) {
        if (isDraftMode) {
          setIngestSuccessMsg('Đã lưu BẢN NHÁP (DRAFT). Tri thức chưa đưa vào phê duyệt.');
        } else {
          setIngestSuccessMsg('Đã nạp kiến thức thành công! Đang ở trạng thái PENDING_REVIEW chờ duyệt.');
        }

        if (res.result?.conflictFlag) {
          setIngestWarningMsg(res.result.conflictNotes);
        }

        setPreviewContent(res.result.extractedPreview || '');
        fetchDashboardData();
        setTestQuery(studioQuestion);
      } else {
        alert(`Lỗi: ${res.error}`);
      }
    } catch (err) {
      alert(`Lỗi kết nối máy chủ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Run Before vs After Test Bench
  const handleRunTestBench = async () => {
    if (!testQuery) return;
    try {
      setTestRunning(true);
      const res = await fetch('/api/learning-center/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unansweredQuestionId: selectedQuestion?.id || null,
          customQuery: testQuery,
          orgId: selectedQuestion?.org_id || studioTenantId || 'default'
        })
      }).then(r => r.json());

      if (res.success) {
        setTestResult(res.testResult);
        fetchDashboardData();
      } else {
        alert(`Lỗi kiểm thử: ${res.error}`);
      }
    } catch (err) {
      alert(`Lỗi kiểm thử: ${err.message}`);
    } finally {
      setTestRunning(false);
    }
  };

  // Approve Knowledge Entry
  const handleApproveEntry = async (entryId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/learning-center/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, approvedBy: 'Admin' })
      }).then(r => r.json());

      if (res.success) {
        alert('🌟 Đã PHÊ DUYỆT sử dụng! Tri thức đã chính thức có hiệu lực trong chat bán hàng của TRÍ AN.');
        fetchDashboardData();
        if (activeTab === 'knowledge_entries') fetchKnowledgeEntries();
        if (activeTab === 'gap_report') fetchQuestions();
      } else {
        alert(`Lỗi duyệt: ${res.error}`);
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Reject Knowledge Entry
  const handleRejectEntry = async (entryId) => {
    const reason = prompt('Nhập lý do từ chối tri thức này:', 'Không phù hợp hoặc thông tin chưa chuẩn xác');
    if (!reason) return;
    try {
      setLoading(true);
      const res = await fetch('/api/learning-center/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, reason, rejectedBy: 'Admin' })
      }).then(r => r.json());

      if (res.success) {
        alert('Đã từ chối tri thức.');
        fetchDashboardData();
        if (activeTab === 'knowledge_entries') fetchKnowledgeEntries();
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Knowledge Active/Inactive
  const handleToggleActive = async (entryId, currentActive) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/learning-center/knowledge-entries/${entryId}/toggle-active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      }).then(r => r.json());

      if (res.success) {
        fetchKnowledgeEntries();
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update Question Status (Manual override)
  const handleUpdateQuestionStatus = async (questionId, newStatus) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/learning-center/questions/${questionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).then(r => r.json());

      if (res.success) {
        fetchQuestions();
        fetchDashboardData();
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Inspect Question Detail
  const handleInspectQuestion = async (qId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/learning-center/questions/${qId}`).then(r => r.json());
      if (res.success) {
        setInspectQuestion(res);
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold rounded">MỚI (NEW)</span>;
      case 'REVIEWING':
        return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded">ĐANG XEM XÉT</span>;
      case 'WAITING_KNOWLEDGE':
        return <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold rounded">CHỜ BỔ SUNG</span>;
      case 'READY_TO_TEST':
        return <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold rounded">CHỜ KIỂM THỬ</span>;
      case 'TESTING':
        return <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold rounded">ĐANG KIỂM THỬ</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded flex items-center space-x-1"><Check className="w-3 h-3" /><span>ĐÃ GIẢI QUYẾT</span></span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-bold rounded">TỪ CHỐI</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded">ĐÃ DUYỆT</span>;
      case 'PENDING_REVIEW':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-[10px] font-bold rounded">CHỜ DUYỆT</span>;
      case 'DRAFT':
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold rounded">BẢN NHÁP</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">{status}</span>;
    }
  };

  // Priority Badge Helper
  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 bg-red-600/30 text-red-300 border border-red-500 text-[10px] font-black rounded uppercase animate-pulse">KHẨN CẤP</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 border border-orange-500/40 text-[10px] font-bold rounded uppercase">CAO</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold rounded uppercase">TRUNG BÌNH</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold rounded uppercase">THẤP</span>;
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0a192f] via-[#0d2847] to-[#112240] p-6 rounded-3xl border border-cyan-500/40 shadow-[0_0_30px_rgba(0,240,255,0.15)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-cyan-500/20 rounded-2xl border border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <Brain className="w-8 h-8 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300">
                TRÍ AN LEARNING CENTER
              </h1>
              <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] font-extrabold rounded-full">
                LEVEL 2.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Phân hệ Báo cáo Kiến thức Thiếu & Dạy AI Bổ sung • Quản trị Đa Doanh nghiệp & Học tập Liên tục
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedQuestion(null);
              setStudioQuestion('');
              setStudioAnswer('');
              setStudioProductName('');
              setShowStudioModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Dạy Kiến Thức Mới</span>
          </button>

          <a
            href="/api/learning-center/export-excel"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Xuất Báo Cáo Excel</span>
          </a>

          <button
            onClick={fetchDashboardData}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Primary 7-Section Sub-Navigation Bar (Master Prompt Section 5) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-cyan-500/30 overflow-x-auto">
        {[
          { id: 'overview', label: '1. Tổng quan tự học', icon: BarChart2 },
          { id: 'gap_report', label: '2. Câu hỏi cần cải thiện', icon: AlertTriangle, count: stats.total },
          { id: 'auto_learning', label: '3. Sửa lỗi AI', icon: Sparkles, badgeColor: 'bg-rose-500', count: stats.waitingKnowledge },
          { id: 'knowledge_entries', label: '4. Kiến thức đã tiếp thu', icon: BookOpen, count: stats.totalUpdatedKnowledge || (stats.readyToTest + stats.resolved) },
          { id: 'audit_history', label: '5. Lịch sử học tập', icon: History },
          { id: 'test_bench', label: '6. Kiểm thử chất lượng', icon: Award },
          { id: 'performance_report', label: '7. Báo cáo hiệu quả', icon: TrendingUp }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-slate-950 text-cyan-300' : (tab.badgeColor ? `${tab.badgeColor} text-white` : 'bg-slate-800 text-slate-300')
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TỔNG QUAN TỰ HỌC (OVERVIEW DASHBOARD) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 8 KPI Stat Cards (Master Prompt Section 5) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-slate-700/80 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">Tổng câu hỏi tiếp nhận</span>
              <div className="text-xl font-black text-white">{stats.total}</div>
              <span className="text-[9px] text-slate-500">Khách hàng tương tác</span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-orange-500/40 shadow-md">
              <span className="text-[10px] font-bold text-orange-300 block mb-1">Chưa có kiến thức</span>
              <div className="text-xl font-black text-orange-400">{stats.waitingKnowledge}</div>
              <span className="text-[9px] text-orange-400/80">Cần bổ sung dữ liệu</span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-rose-500/40 shadow-md">
              <span className="text-[10px] font-bold text-rose-300 block mb-1">Lỗi được phát hiện</span>
              <div className="text-xl font-black text-rose-400">{stats.totalErrorsDetected || stats.total}</div>
              <span className="text-[9px] text-rose-400/80">Nhầm lẫn/thiếu căn cứ</span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-emerald-500/40 shadow-md">
              <span className="text-[10px] font-bold text-emerald-300 block mb-1">Số lỗi đã sửa</span>
              <div className="text-xl font-black text-emerald-400">{stats.resolved}</div>
              <span className="text-[9px] text-emerald-400/80">Đã học thành công</span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-blue-500/40 shadow-md">
              <span className="text-[10px] font-bold text-blue-300 block mb-1">Kiến thức cập nhật</span>
              <div className="text-xl font-black text-blue-400">{stats.totalUpdatedKnowledge || 0}</div>
              <span className="text-[9px] text-blue-400/80">Có lưu phiên bản</span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-purple-500/40 shadow-md">
              <span className="text-[10px] font-bold text-purple-300 block mb-1">Đang kiểm thử</span>
              <div className="text-xl font-black text-purple-400">{stats.testing}</div>
              <span className="text-[9px] text-purple-400/80">Đo lường Before/After</span>
            </div>

            <div className="bg-gradient-to-br from-cyan-950 to-blue-950 p-3.5 rounded-2xl border border-cyan-500/50 shadow-md">
              <span className="text-[10px] font-bold text-cyan-300 block mb-1">Tỷ lệ cải thiện</span>
              <div className="text-xl font-black text-cyan-200">{stats.improvementRate || stats.resolutionRate}%</div>
              <span className="text-[9px] text-cyan-400/80">Chất lượng phản hồi</span>
            </div>

            <div className="bg-slate-900/90 p-3.5 rounded-2xl border border-red-500/40 shadow-md">
              <span className="text-[10px] font-bold text-red-300 block mb-1">Số lỗi tái diễn</span>
              <div className="text-xl font-black text-red-400">{stats.recurringErrors || 0}</div>
              <span className="text-[9px] text-red-400/80">Lặp lại trên 2 lần</span>
            </div>
          </div>

          {/* Top Insights: 3 Columns (Top Topics, Top Products, Frequency Duplicates) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Missing Knowledge Groups */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Tag className="w-4 h-4 text-cyan-400" />
                  <span>Nhóm kiến thức thiếu nhiều nhất</span>
                </span>
                <span className="text-[10px] text-slate-500">Top 5</span>
              </div>
              <div className="space-y-2">
                {stats.topTopics && stats.topTopics.length > 0 ? (
                  stats.topTopics.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                      <span className="font-semibold text-slate-300 truncate max-w-[180px]">{t.topic}</span>
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md font-bold text-[11px]">
                        {t.count} câu
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Chưa có dữ liệu thống kê nhóm.</p>
                )}
              </div>
            </div>

            {/* Top Products Inquired but Missing */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Sản phẩm hỏi nhiều nhưng thiếu</span>
                </span>
                <span className="text-[10px] text-slate-500">Top lượt hỏi</span>
              </div>
              <div className="space-y-2">
                {stats.topProducts && stats.topProducts.length > 0 ? (
                  stats.topProducts.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                      <span className="font-semibold text-slate-300 truncate max-w-[180px]">{p.product}</span>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-md font-bold text-[11px]">
                        {p.total_hits || p.count} lượt
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Chưa có sản phẩm thiếu nào ghi nhận.</p>
                )}
              </div>
            </div>

            {/* Trend & Health Status */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Xu hướng & Kiểm soát trùng lặp</span>
                </span>
                <span className="text-[10px] text-slate-500">14 ngày</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Câu hỏi trùng lặp đã gộp:</span>
                  <span className="font-bold text-white">{stats.duplicates} câu hỏi</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Cảnh báo mâu thuẫn tri thức:</span>
                  <span className={`font-bold ${stats.conflicts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {stats.conflicts} mâu thuẫn
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Cơ chế phát hiện tự động:</span>
                  <span className="font-bold text-cyan-300">Active (Lọc 5 lớp)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 Most Frequently Asked Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>TOP 10 CÂU HỎI KHÁCH HỎI NHIỀU NHẤT NHƯNG TRÍ AN CHƯA CÓ KIẾN THỨC</span>
              </h3>
              <button
                onClick={() => setActiveTab('waiting_queue')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1"
              >
                <span>Xem hàng đợi xử lý</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Câu hỏi của khách</th>
                    <th className="py-2.5 px-3 text-center">Tần suất</th>
                    <th className="py-2.5 px-3">Sản phẩm / Chủ đề</th>
                    <th className="py-2.5 px-3">Mức ưu tiên</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {top10List && top10List.length > 0 ? (
                    top10List.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-white max-w-[280px]">
                          {item.question}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 font-black rounded-full text-xs">
                            {item.frequency || item.hit_count || 1} lần
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <div className="font-semibold text-slate-200">{item.product || 'Chưa định danh'}</div>
                          <div className="text-[10px] text-slate-500">{item.topic || 'Chung'}</div>
                        </td>
                        <td className="py-3 px-3">
                          {renderPriorityBadge(item.priority || 'MEDIUM')}
                        </td>
                        <td className="py-3 px-3">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenStudioForQuestion(item)}
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-[11px] transition-all shadow-sm"
                          >
                            Dạy AI ngay
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-500">
                        Chưa có câu hỏi nào trong danh sách Top 10.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: BÁO CÁO KIẾN THỨC THIẾU (FULL GAP REPORT WITH FILTERS) */}
      {/* ========================================================================= */}
      {activeTab === 'gap_report' && (
        <div className="space-y-4">
          {/* Multi-criteria Filter Bar (Section 3 & 4) */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span>BỘ LỌC ĐA TIÊU CHÍ BÁO CÁO</span>
              </span>
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterReason('all');
                  setFilterPriority('all');
                  setFilterTopic('all');
                  setFilterOrgId('all');
                  setSearchQuery('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  fetchQuestions();
                }}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Đặt lại bộ lọc
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {/* Search input */}
              <div className="col-span-2">
                <input
                  type="text"
                  placeholder="Tìm theo câu hỏi, sản phẩm, topic..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchQuestions()}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="NEW">MỚI (NEW)</option>
                  <option value="REVIEWING">Đang xem xét</option>
                  <option value="WAITING_KNOWLEDGE">Chờ bổ sung</option>
                  <option value="READY_TO_TEST">Chờ kiểm thử</option>
                  <option value="TESTING">Đang kiểm thử</option>
                  <option value="RESOLVED">Đã giải quyết</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>

              {/* Reason filter */}
              <div>
                <select
                  value={filterReason}
                  onChange={e => setFilterReason(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Tất cả lý do</option>
                  <option value="PRODUCT_NOT_FOUND">Sản phẩm không có</option>
                  <option value="MODEL_NOT_FOUND">Model không có</option>
                  <option value="MISIDENTIFIED_PRODUCT">Nhầm sản phẩm</option>
                  <option value="UNCERTAIN_SPEC_PRICE">Thiếu thông số/giá</option>
                  <option value="CUSTOMER_COMPLAINT">Khách phàn nàn</option>
                  <option value="STAFF_HELP_REQUIRED">Yêu cầu nhân viên</option>
                </select>
              </div>

              {/* Priority filter */}
              <div>
                <select
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Tất cả ưu tiên</option>
                  <option value="URGENT">Khẩn cấp (URGENT)</option>
                  <option value="HIGH">Cao (HIGH)</option>
                  <option value="MEDIUM">Trung bình</option>
                  <option value="LOW">Thấp</option>
                </select>
              </div>

              {/* Tenant filter */}
              <div>
                <select
                  value={filterOrgId}
                  onChange={e => setFilterOrgId(e.target.value)}
                  className="w-full bg-slate-950 text-white text-xs p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                >
                  <option value="all">Tất cả đối tác/Tenant</option>
                  <option value="default">Mặc định (default)</option>
                  <option value="org_namabank">Nam A Bank</option>
                  <option value="org_retail">Chuỗi Bán lẻ</option>
                </select>
              </div>

              {/* Apply button */}
              <div>
                <button
                  onClick={() => fetchQuestions()}
                  className="w-full h-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Áp dụng lọc</span>
                </button>
              </div>
            </div>
          </div>

          {/* Full Data Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <th className="py-3 px-3">Mã</th>
                    <th className="py-3 px-3">Câu hỏi gốc của khách</th>
                    <th className="py-3 px-3">AI đã trả lời</th>
                    <th className="py-3 px-3">Lý do</th>
                    <th className="py-3 px-3">Sản phẩm / Nhóm</th>
                    <th className="py-3 px-3">Tenant</th>
                    <th className="py-3 px-3 text-center">Tần suất</th>
                    <th className="py-3 px-3">Ưu tiên</th>
                    <th className="py-3 px-3">Trạng thái</th>
                    <th className="py-3 px-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {questions && questions.length > 0 ? (
                    questions.map(q => (
                      <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                          {q.id.slice(-6)}
                        </td>
                        <td className="py-3 px-3 font-medium text-white max-w-[200px]">
                          <span className="line-clamp-2" title={q.original_question || q.question}>
                            {q.original_question || q.question}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-[200px]">
                          <span className="line-clamp-2 text-[11px] text-slate-400" title={q.ai_response}>
                            {q.ai_response || 'Chưa ghi nhận'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-300 font-medium">
                          {q.failure_reason || 'Chưa phân loại'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-200">{q.related_product_name || '—'}</div>
                          <div className="text-[10px] text-slate-500">{q.related_topic || 'Chung'}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                          {q.org_id || 'default'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-800 font-bold text-cyan-300 rounded text-xs">
                            {q.hit_count || 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {renderPriorityBadge(q.priority)}
                        </td>
                        <td className="py-3 px-3">
                          {renderStatusBadge(q.status)}
                        </td>
                        <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleInspectQuestion(q.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenStudioForQuestion(q)}
                            className="px-2.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-[11px]"
                          >
                            Dạy AI
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="py-8 text-center text-slate-500">
                        Không tìm thấy bản ghi báo cáo nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-3 bg-slate-950 flex items-center justify-between border-t border-slate-800 text-xs text-slate-400">
                <span>Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total} bản ghi)</span>
                <div className="flex space-x-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40"
                  >
                    Trước
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: CÂU HỎI CHỜ BỔ SUNG (WAITING QUEUE) */}
      {/* ========================================================================= */}
      {activeTab === 'waiting_queue' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-orange-500/30 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-orange-300 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>HÀNG ĐỢI CÂU HỎI CẦN BỔ SUNG KIẾN THỨC GẤP</span>
              </h3>
              <p className="text-xs text-slate-400">
                Các câu hỏi chưa có lời giải đáp hoặc khách hàng yêu cầu nhân viên, cần Admin nạp kiến thức ngay
              </p>
            </div>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded-xl font-bold text-xs">
              {stats.waitingKnowledge} câu hỏi đang chờ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {questions && questions.length > 0 ? (
              questions.map(q => (
                <div key={q.id} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {renderPriorityBadge(q.priority)}
                        <span className="text-[10px] text-slate-500 font-mono">{q.id.slice(-8)}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">
                        "{q.original_question || q.question}"
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-cyan-300 text-[10px] font-black rounded-md shrink-0">
                      Hỏi {q.hit_count || 1} lần
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800/80 text-[11px] space-y-1">
                    <div className="text-slate-400"><strong className="text-slate-300">Lý do:</strong> {q.failure_reason || 'Chưa có dữ liệu'}</div>
                    <div className="text-slate-400"><strong className="text-slate-300">Sản phẩm liên quan:</strong> {q.related_product_name || 'Chưa định danh'}</div>
                    <div className="text-slate-400"><strong className="text-slate-300">Tenant:</strong> {q.org_id || 'default'}</div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">{new Date(q.created_at).toLocaleString('vi-VN')}</span>
                    <button
                      onClick={() => handleOpenStudioForQuestion(q)}
                      className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)] flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Dạy AI ngay</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-12 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                🎉 Tuyệt vời! Hiện không còn câu hỏi nào đang chờ bổ sung kiến thức.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: SỬA LỖI AI (TRÍ AN AUTO LEARNING STUDIO) */}
      {/* ========================================================================= */}
      {activeTab === 'auto_learning' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div>
              <h3 className="text-base font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                <span>TRÍ AN AUTO LEARNING – TRUNG TÂM SỬA SAI & TỰ HỌC THÔNG MINH</span>
              </h3>
              <p className="text-xs text-slate-300">
                Anh Trí chỉ cần can thiệp khi TRÍ AN trả lời sai. Hệ thống tự động ghi nhận, phân tích diff, lưu phiên bản và tự kiểm thử ngăn lỗi tái diễn.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs">
                {stats.waitingKnowledge} câu cần xem xét
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs">
                {stats.resolved} đã giải quyết
              </span>
            </div>
          </div>

          {/* Two-Pane Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Pane: Question Queue (4 cols) */}
            <div className="lg:col-span-4 bg-slate-900/80 rounded-2xl border border-slate-800 p-3 space-y-3 flex flex-col h-[680px]">
              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] overflow-x-auto">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'needs_review', label: 'Cần sửa' },
                  { id: 'testing', label: 'Đang test' },
                  { id: 'resolved', label: 'Đã học' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setAutoLearningFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${
                      autoLearningFilter === f.id ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={autoLearningSearch}
                  onChange={e => setAutoLearningSearch(e.target.value)}
                  placeholder="Tìm câu hỏi..."
                  className="w-full bg-slate-950 text-white text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Question List Scrollable */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const filtered = (questions || []).filter(q => {
                    if (autoLearningSearch.trim()) {
                      const txt = (q.original_question || q.question || '').toLowerCase();
                      if (!txt.includes(autoLearningSearch.toLowerCase())) return false;
                    }
                    if (autoLearningFilter === 'needs_review') return ['NEW', 'REVIEWING', 'WAITING_KNOWLEDGE'].includes(q.status);
                    if (autoLearningFilter === 'testing') return q.status === 'TESTING' || q.status === 'READY_TO_TEST';
                    if (autoLearningFilter === 'resolved') return q.status === 'RESOLVED';
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Không có câu hỏi nào theo bộ lọc.
                      </div>
                    );
                  }

                  return filtered.map(q => {
                    const isSelected = autoLearningActiveQuestion?.id === q.id;
                    return (
                      <div
                        key={q.id}
                        onClick={() => {
                          setAutoLearningActiveQuestion(q);
                          setAutoLearningCorrectedAnswer(q.resolved_answer || '');
                          setAutoLearningResult(null);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-800/90 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono text-[10px] text-cyan-400 font-bold truncate max-w-[120px]">{q.id}</span>
                          <div className="flex items-center space-x-1">
                            {q.hit_count > 1 && (
                              <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-[9px] font-black">
                                x{q.hit_count} lần
                              </span>
                            )}
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              q.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              q.status === 'TESTING' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            }`}>
                              {q.status === 'RESOLVED' ? 'ĐÃ HỌC' : q.status === 'TESTING' ? 'ĐANG TEST' : 'CẦN XEM XÉT'}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-200 line-clamp-2 mb-1.5">
                          {q.original_question || q.question}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[140px] text-slate-500">{q.related_topic || 'Chung'}</span>
                          <span className="text-slate-500">{new Date(q.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Right Pane: Correction Studio & Diff Viewer (8 cols) */}
            <div className="lg:col-span-8 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 h-[680px] overflow-y-auto">
              {autoLearningActiveQuestion ? (
                <>
                  {/* Selected Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-slate-800 text-cyan-300 font-bold rounded">
                        {autoLearningActiveQuestion.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        Chủ đề: <strong className="text-white">{autoLearningActiveQuestion.related_topic || 'Chung'}</strong>
                      </span>
                      {autoLearningActiveQuestion.related_product_name && (
                        <span className="text-xs font-semibold text-slate-400">
                          SP: <strong className="text-cyan-300">{autoLearningActiveQuestion.related_product_name}</strong>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {renderStatusBadge(autoLearningActiveQuestion.status)}
                      <button
                        onClick={() => handleOpenVersions(autoLearningActiveQuestion)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-bold border border-slate-700 flex items-center space-x-1"
                        title="Xem lịch sử các lần sửa và khôi phục"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Xem Lịch Sử</span>
                      </button>
                    </div>
                  </div>

                  {/* 1. Customer Original Question */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] font-black uppercase text-cyan-400 flex items-center space-x-1">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Câu hỏi của khách hàng:</span>
                    </span>
                    <p className="text-sm font-bold text-white">
                      "{autoLearningActiveQuestion.original_question || autoLearningActiveQuestion.question}"
                    </p>
                  </div>

                  {/* 2. TRÍ AN's Initial Answer & Failure Reason */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/30 space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-400 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Câu trả lời ban đầu của TRÍ AN:</span>
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed max-h-[110px] overflow-y-auto">
                        {autoLearningActiveQuestion.ai_response || 'Chưa ghi nhận câu trả lời.'}
                      </p>
                    </div>

                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30 space-y-2">
                      <span className="text-[10px] font-black uppercase text-amber-400 flex items-center space-x-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Lý do nghi ngờ & Nguồn đã tìm:</span>
                      </span>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>Lý do: <strong className="text-amber-300">{autoLearningActiveQuestion.failure_reason || 'Chưa có kiến thức phù hợp'}</strong></div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Nguồn tra cứu: {autoLearningActiveQuestion.sources_searched_json || 'Catalog/Brain'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Input Box for Correct Answer */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Nhập câu trả lời đúng do Quản trị viên cung cấp (Dạy AI):</span>
                      </label>
                      <span className="text-[10px] text-slate-500">
                        {autoLearningCorrectedAnswer.length} ký tự
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      value={autoLearningCorrectedAnswer}
                      onChange={e => setAutoLearningCorrectedAnswer(e.target.value)}
                      placeholder="Nhập nội dung câu trả lời chuẩn xác, có căn cứ vững chắc để TRÍ AN tiếp thu và trả lời cho mọi khách hàng sau này..."
                      className="w-full bg-slate-950 text-white text-xs p-3.5 rounded-xl border border-emerald-500/40 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-sans leading-relaxed"
                    />
                  </div>

                  {/* 4. Real-time Diff Analysis */}
                  {(() => {
                    const diff = computeClientDiff(autoLearningActiveQuestion.ai_response, autoLearningCorrectedAnswer);
                    if (!diff || (!diff.addedCount && !diff.removedCount)) return null;
                    return (
                      <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-300 flex items-center space-x-1">
                            <SplitSquareVertical className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Phân tích khác biệt (Diff): {diff.summary}</span>
                          </span>
                          <span className="font-mono text-cyan-300 font-bold">
                            Độ tương đồng: {diff.similarityRatio}%
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          {diff.addedCount > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-medium">
                              +{diff.addedCount} từ mới ({diff.sampleAdded}...)
                            </span>
                          )}
                          {diff.removedCount > 0 && (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-medium">
                              -{diff.removedCount} từ cũ được loại bỏ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 5. Action Buttons Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={handleAutoLearnSubmit}
                      disabled={autoLearningRunning || !autoLearningCorrectedAnswer.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-40 flex items-center space-x-2"
                    >
                      <CheckCircle className={`w-4 h-4 ${autoLearningRunning ? 'animate-spin' : ''}`} />
                      <span>{autoLearningRunning ? 'Đang tiếp thu & kiểm thử...' : 'GHI NHẬN VÀ HỌC'}</span>
                    </button>

                    <button
                      onClick={() => handleIgnoreQuestion(autoLearningActiveQuestion.id)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>BỎ QUA</span>
                    </button>

                    <button
                      onClick={() => handleOpenVersions(autoLearningActiveQuestion)}
                      className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs border border-slate-700 transition-all flex items-center space-x-1.5"
                    >
                      <GitCommit className="w-3.5 h-3.5" />
                      <span>XEM LỊCH SỬ PHIÊN BẢN</span>
                    </button>
                  </div>

                  {/* 6. Test Outcome & Rollback Banner */}
                  {autoLearningResult && (
                    <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                      autoLearningResult.didRollback
                        ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                        : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span>
                          {autoLearningResult.didRollback
                            ? '⚠️ BÀI TEST KHÔNG ĐẠT: ĐÃ TỰ ĐỘNG KHÔI PHỤC PHIÊN BẢN TRƯỚC'
                            : '🎉 TIẾP THU TRI THỨC THÀNH CÔNG & ĐÃ QUA KIỂM THỬ (RESOLVED)'}
                        </span>
                        <span className="font-mono text-xs">
                          Phiên bản v{autoLearningResult.version}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed">
                        {autoLearningResult.didRollback
                          ? 'Điểm kiểm thử không đạt tiêu chuẩn an toàn (dưới 80%). Hệ thống đã tự động hoàn tác để không đưa phiên bản lỗi ra phục vụ khách hàng.'
                          : 'Tri thức mới đã được xác nhận, chỉ mục tìm kiếm được cập nhật và Central Brain sẽ lập tức sử dụng câu trả lời chuẩn này.'}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                  <Bot className="w-12 h-12 text-slate-600" />
                  <p className="text-xs">Vui lòng chọn một câu hỏi bên danh sách trái để bắt đầu sửa lỗi cho TRÍ AN.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: QUẢN LÝ KIẾN THỨC (KNOWLEDGE ENTRIES MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'knowledge_entries' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <select
                value={knowledgeFilterStatus}
                onChange={e => setKnowledgeFilterStatus(e.target.value)}
                className="bg-slate-950 text-white text-xs p-2 rounded-xl border border-slate-700"
              >
                <option value="all">Tất cả trạng thái duyệt</option>
                <option value="APPROVED">ĐÃ DUYỆT (APPROVED)</option>
                <option value="PENDING_REVIEW">CHỜ DUYỆT (PENDING_REVIEW)</option>
                <option value="DRAFT">BẢN NHÁP (DRAFT)</option>
                <option value="REJECTED">TỪ CHỐI</option>
              </select>

              <select
                value={knowledgeFilterType}
                onChange={e => setKnowledgeFilterType(e.target.value)}
                className="bg-slate-950 text-white text-xs p-2 rounded-xl border border-slate-700"
              >
                <option value="all">Tất cả loại tri thức</option>
                <option value="QA">Hỏi đáp chuẩn (QA)</option>
                <option value="DOCUMENT">Tài liệu (Document)</option>
                <option value="WEBSITE">Website</option>
                <option value="EXCEL">Bảng tính</option>
              </select>

              <label className="flex items-center space-x-1.5 text-xs text-amber-300 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={knowledgeConflictOnly}
                  onChange={e => setKnowledgeConflictOnly(e.target.checked)}
                  className="rounded text-cyan-500"
                />
                <span>Chỉ hiện có cảnh báo mâu thuẫn</span>
              </label>
            </div>

            <button
              onClick={() => {
                setSelectedQuestion(null);
                setStudioQuestion('');
                setStudioAnswer('');
                setShowStudioModal(true);
              }}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nạp thêm kiến thức</span>
            </button>
          </div>

          {/* Knowledge Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <th className="py-3 px-3">Câu hỏi / Tiêu đề chuẩn</th>
                  <th className="py-3 px-3">Câu trả lời chuẩn (Answer)</th>
                  <th className="py-3 px-3">Nguồn / Định dạng</th>
                  <th className="py-3 px-3">Chủ đề / Sản phẩm</th>
                  <th className="py-3 px-3">Tenant</th>
                  <th className="py-3 px-3">Trạng thái duyệt</th>
                  <th className="py-3 px-3 text-center">Hoạt động</th>
                  <th className="py-3 px-3 text-right">Phê duyệt / Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {knowledgeList && knowledgeList.length > 0 ? (
                  knowledgeList.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white max-w-[200px]">
                        <div className="line-clamp-2">{entry.standard_question}</div>
                        {entry.conflict_flag === 1 && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold mt-1 inline-block" title={entry.conflict_notes}>
                            ⚠️ Cảnh báo mâu thuẫn
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300 max-w-[240px]">
                        <span className="line-clamp-2 text-[11px]" title={entry.standard_answer}>
                          {entry.standard_answer}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] rounded">
                          {entry.source_type || entry.entry_type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-medium">{entry.related_product_name || '—'}</div>
                        <div className="text-[10px] text-slate-500">{entry.related_topic}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        {entry.org_id || 'default'}
                      </td>
                      <td className="py-3 px-3">
                        {renderStatusBadge(entry.approval_status)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleActive(entry.id, entry.is_active)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                            entry.is_active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {entry.is_active ? 'BẬT' : 'TẮT'}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {entry.approval_status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveEntry(entry.id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px]"
                            title="Phê duyệt kiến thức này"
                          >
                            Duyệt
                          </button>
                        )}
                        {entry.approval_status !== 'REJECTED' && (
                          <button
                            onClick={() => handleRejectEntry(entry.id)}
                            className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 font-bold rounded-lg text-[10px]"
                            title="Từ chối"
                          >
                            Từ chối
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenVersions(entry)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold rounded-lg text-[10px] inline-flex items-center space-x-1"
                          title="Lịch sử phiên bản & Khôi phục"
                        >
                          <GitCommit className="w-3 h-3 inline mr-1" />
                          <span>v{entry.version || 1}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500">
                      Chưa có mục tri thức nào được nạp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: TÀI LIỆU ĐÃ TẢI LÊN (UPLOADED DOCUMENTS) */}
      {/* ========================================================================= */}
      {activeTab === 'uploaded_docs' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>KHO TÀI LIỆU HUẤN LUYỆN (PDF, WORD, EXCEL, CSV, TXT, WEBSITE)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Toàn bộ các tệp tài liệu và trang web đã được trích xuất thành tri thức có cấu trúc
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {uploadedDocs && uploadedDocs.length > 0 ? (
              uploadedDocs.map(doc => (
                <div key={doc.id} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl font-bold font-mono text-xs">
                        {doc.source_type}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate max-w-[180px]">
                        {doc.source_filename || doc.source_url || doc.title}
                      </h4>
                    </div>
                    {renderStatusBadge(doc.approval_status)}
                  </div>

                  <p className="text-[11px] text-slate-400 bg-slate-950/80 p-3 rounded-xl border border-slate-800 line-clamp-3">
                    {doc.preview || 'Không có bản xem trước'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Phiên bản: v{doc.version}</span>
                    <span>{new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 py-10 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
                Chưa có tài liệu tải lên nào trong kho.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6: KIỂM THỬ AI (TEST BENCH BEFORE VS AFTER) */}
      {/* ========================================================================= */}
      {activeTab === 'test_bench' && (
        <div className="bg-[#081838] p-6 rounded-3xl border border-cyan-500/30 space-y-6">
          <div className="border-b border-slate-700/60 pb-4">
            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>PHÒNG KIỂM ĐỊNH TRI THỨC (BEFORE VS AFTER TEST BENCH)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Kiểm tra thực tế câu trả lời của Trí An trước và sau khi học, đánh giá 5 tiêu chí: Nhận diện đúng SP, Có căn cứ, Không nhầm thương hiệu, Nguồn tin cậy và Cách ly đối tác.
            </p>
          </div>

          {/* Test Input Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              placeholder="Nhập câu hỏi cần kiểm định (ví dụ: Điện thoại bàn Panasonic KX-TSC11 có bán không?)"
              className="flex-1 min-w-[280px] bg-slate-900 text-white text-xs p-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={handleRunTestBench}
              disabled={testRunning || !testQuery}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${testRunning ? 'animate-spin' : ''}`} />
              <span>{testRunning ? 'Đang chạy kiểm định...' : 'Chạy Kiểm Thử Ngay'}</span>
            </button>
          </div>

          {/* Test Result Comparison: 2 Columns */}
          {testResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column Left: BEFORE */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                      Trước Khi Học (Before)
                    </span>
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-bold rounded">
                      Chưa có tri thức
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {testResult.beforeResponse}
                  </p>
                </div>

                {/* Column Right: AFTER */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/40 space-y-3 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Sau Khi Học (After)</span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/40">
                      Điểm chính xác: {testResult.metrics.accuracyScore}%
                    </span>
                  </div>
                  <p className="text-xs text-white whitespace-pre-wrap leading-relaxed font-medium">
                    {testResult.afterResponse}
                  </p>
                </div>
              </div>

              {/* 5 Automatic Criteria Cards (Section 6) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-700">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.isCorrectProduct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.isCorrectProduct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Nhận diện đúng SP</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.isGrounded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.isGrounded ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Có căn cứ tri thức</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.brandConfusionFree ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.brandConfusionFree ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Không nhầm nhãn hàng</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.hasValidSource ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.hasValidSource ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Nguồn dữ liệu hợp lệ</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${testResult.metrics.tenantIsolated ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {testResult.metrics.tenantIsolated ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </div>
                  <span className="text-xs text-slate-300 font-medium">Cách ly đối tác</span>
                </div>
              </div>

              {/* Status Outcome Banner */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Trạng thái sau kiểm định: <strong className="text-white">{renderStatusBadge(testResult.questionStatus)}</strong>
                </span>
                {testResult.passed && (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Đạt tiêu chuẩn nghiệm thu & sẵn sàng vận hành</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: LỊCH SỬ HỌC TẬP (AUDIT TRAIL & HISTORY) */}
      {/* ========================================================================= */}
      {activeTab === 'audit_history' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>NHẬT KÝ KIỂM TOÁN HỌC TẬP (AUDIT LOG & CHANGE HISTORY)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ghi nhận mọi thao tác tạo gap, cập nhật trạng thái, nạp kiến thức, phê duyệt và chạy kiểm thử
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <th className="py-3 px-3">Thời gian</th>
                  <th className="py-3 px-3">Hành động</th>
                  <th className="py-3 px-3">Người thực hiện</th>
                  <th className="py-3 px-3">Tenant / Org</th>
                  <th className="py-3 px-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-slate-800 font-bold text-cyan-300 text-[10px] rounded font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {log.actor || 'SYSTEM'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        {log.org_id || 'default'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400 max-w-[300px] truncate" title={log.details_json}>
                        {log.details_json || '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">
                      Chưa có lịch sử audit log nào được ghi nhận.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7: BÁO CÁO HIỆU QUẢ VÀ TỰ CẢI THIỆN THEO THỜI GIAN */}
      {/* ========================================================================= */}
      {activeTab === 'performance_report' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div>
              <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>BÁO CÁO HIỆU QUẢ TỰ HỌC & ĐỀ XUẤT CẢI THIỆN THEO THỜI GIAN</span>
              </h3>
              <p className="text-xs text-slate-400">
                Theo dõi các chủ đề hiểu tốt, chủ đề còn yếu, tỷ lệ trích dẫn và các lỗi tái diễn để tối ưu hóa tri thức
              </p>
            </div>
            <button
              onClick={handleRunRegression}
              disabled={runningRegression}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-40 flex items-center space-x-1.5"
            >
              <Award className={`w-4 h-4 ${runningRegression ? 'animate-spin' : ''}`} />
              <span>{runningRegression ? 'Đang chạy kiểm định hồi quy...' : 'Chạy Kiểm Định Hồi Quy (Regression)'}</span>
            </button>
          </div>

          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Tỷ lệ truy xuất tri thức</span>
              <div className="text-2xl font-black text-cyan-300">{weaknessAnalytics?.retrievalRate || stats.resolutionRate}%</div>
              <span className="text-[10px] text-slate-500">Khách hỏi có tri thức giải đáp</span>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Tỷ lệ trích dẫn nguồn</span>
              <div className="text-2xl font-black text-emerald-300">{weaknessAnalytics?.citationRate || 95}%</div>
              <span className="text-[10px] text-slate-500">Có căn cứ xác thực rõ ràng</span>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Số lỗi đã khắc phục</span>
              <div className="text-2xl font-black text-emerald-400">{weaknessAnalytics?.errorsFixed || stats.resolved}</div>
              <span className="text-[10px] text-emerald-400/80">Khách hỏi lại trả lời đúng</span>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">Lỗi tái diễn cần chú ý</span>
              <div className="text-2xl font-black text-rose-400">{weaknessAnalytics?.recurringErrorsCount || stats.recurringErrors || 0}</div>
              <span className="text-[10px] text-rose-400/80">Lặp lại từ 2 lần trở lên</span>
            </div>
          </div>

          {/* Regression Suite Results if run */}
          {regressionResult && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-purple-400" />
                  <span>Kết quả kiểm định hồi quy (Regression Test): {regressionResult.passedCount}/{regressionResult.total} bài test ĐẠT ({regressionResult.passRate}%)</span>
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${regressionResult.failedCount === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {regressionResult.failedCount === 0 ? 'HOÀN HẢO' : `${regressionResult.failedCount} lỗi phát sinh`}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto">
                {regressionResult.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-900 rounded-lg text-xs border border-slate-800">
                    <span className="text-slate-300 truncate max-w-[260px]">{r.testName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {r.passed ? `ĐẠT (${r.accuracyScore}%)` : 'KHÔNG ĐẠT'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4 Analytics Grid Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Strong Topics */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
                <span>Những chủ đề TRÍ AN hiểu tốt nhất</span>
              </span>
              <div className="space-y-2">
                {weaknessAnalytics?.strongTopics && weaknessAnalytics.strongTopics.length > 0 ? (
                  weaknessAnalytics.strongTopics.map((st, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-200">{st.topic}</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[11px]">
                        {st.count} tri thức chuẩn
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Đang thu thập dữ liệu chủ đề.</p>
                )}
              </div>
            </div>

            {/* Box 2: Weak Topics */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
                <ThumbsDown className="w-4 h-4 text-rose-400" />
                <span>Những chủ đề còn yếu (Cần nạp tài liệu)</span>
              </span>
              <div className="space-y-2">
                {weaknessAnalytics?.weakTopics && weaknessAnalytics.weakTopics.length > 0 ? (
                  weaknessAnalytics.weakTopics.map((wt, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-200">{wt.topic}</span>
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold text-[11px]">
                        {wt.total_hits || wt.count} lượt hỏi thiếu
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Tuyệt vời! Không có chủ đề yếu nổi cộm.</p>
                )}
              </div>
            </div>

            {/* Box 3: Recurring Errors */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Các câu hỏi thường bị trả lời sai / Tái diễn</span>
              </span>
              <div className="space-y-2">
                {weaknessAnalytics?.recurringQuestions && weaknessAnalytics.recurringQuestions.length > 0 ? (
                  weaknessAnalytics.recurringQuestions.slice(0, 5).map(rq => (
                    <div key={rq.id} className="flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                      <div className="truncate max-w-[280px]">
                        <p className="font-semibold text-slate-200 truncate">{rq.original_question || rq.question}</p>
                        <span className="text-[10px] text-amber-400">Lý do: {rq.failure_reason}</span>
                      </div>
                      <button
                        onClick={() => {
                          setAutoLearningActiveQuestion(rq);
                          setAutoLearningCorrectedAnswer(rq.resolved_answer || '');
                          setActiveTab('auto_learning');
                        }}
                        className="px-2 py-1 bg-cyan-500 text-slate-950 font-bold rounded text-[10px] whitespace-nowrap"
                      >
                        Sửa ngay
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Không có lỗi tái diễn nào.</p>
                )}
              </div>
            </div>

            {/* Box 4: AI Recommendations */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Đề xuất tự động từ AI TRÍ AN</span>
              </span>
              <div className="space-y-2">
                {weaknessAnalytics?.suggestedTopics && weaknessAnalytics.suggestedTopics.length > 0 ? (
                  weaknessAnalytics.suggestedTopics.map((st, i) => (
                    <div key={i} className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed flex items-start space-x-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{st.recommendation}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-4">Chưa có đề xuất bổ sung mới.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VERSION HISTORY & ROLLBACK MODAL (MASTER PROMPT REQUIREMENT 3.C & 3.D) */}
      {/* ========================================================================= */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1b36] border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-[0_0_50px_rgba(0,240,255,0.2)] my-8">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <GitCommit className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  LỊCH SỬ PHIÊN BẢN TRI THỨC & KHÔI PHỤC (ROLLBACK)
                </h3>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {entryVersions && entryVersions.length > 0 ? (
                entryVersions.map((ver, idx) => (
                  <div key={ver.id || idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 font-bold font-mono rounded text-[11px]">
                          Phiên bản v{ver.version_number}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          Sửa bởi: <strong className="text-white">{ver.approved_by || 'Admin'}</strong>
                        </span>
                      </div>
                      <span className="text-slate-500 text-[10px] font-mono">
                        {new Date(ver.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px] font-semibold text-cyan-200">
                      Tóm tắt thay đổi: {ver.change_summary || 'Cập nhật nội dung câu trả lời chuẩn'}
                    </p>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed max-h-[80px] overflow-y-auto">
                      {ver.new_answer || ver.previous_answer}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleRollbackVersion(ver.version_number)}
                        disabled={rollingBack}
                        className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[11px] flex items-center space-x-1 transition-all"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Khôi phục phiên bản v{ver.version_number}</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Chưa có lịch sử phiên bản nào được ghi nhận cho tri thức này.
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-800 pt-3">
              <button
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEACHING STUDIO MODAL / DRAWER (SECTION 5) */}
      {/* ========================================================================= */}
      {showStudioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1b36] border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-[0_0_50px_rgba(0,240,255,0.2)] my-8">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  DẠY TRÍ AN KIẾN THỨC BỔ SUNG (TEACHING STUDIO)
                </h3>
              </div>
              <button
                onClick={() => setShowStudioModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIngestKnowledge} className="space-y-4 text-xs">
              {/* Teaching Mode Toggle */}
              <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {[
                  { id: 'DIRECT_INPUT', label: 'A. Nhập QA chuẩn', icon: FileText },
                  { id: 'FILE_UPLOAD', label: 'B. Tải tài liệu (PDF/Excel)', icon: Upload },
                  { id: 'WEBSITE', label: 'C. Nhập Link Website', icon: Globe }
                ].map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTeachingMode(mode.id)}
                      className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        teachingMode === mode.id
                          ? 'bg-cyan-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Question */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">Câu hỏi chuẩn (Standard Question)</label>
                <input
                  type="text"
                  required
                  value={studioQuestion}
                  onChange={e => setStudioQuestion(e.target.value)}
                  placeholder="Ví dụ: Shop có bán điện thoại bàn Panasonic không?"
                  className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Mode A: Direct QA */}
              {teachingMode === 'DIRECT_INPUT' && (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Câu trả lời chuẩn của Trí An (Approved Standard Answer)</label>
                  <textarea
                    rows="4"
                    required
                    value={studioAnswer}
                    onChange={e => setStudioAnswer(e.target.value)}
                    placeholder="Nhập nội dung trả lời chính xác, mạch lạc..."
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Mode B: File Upload */}
              {teachingMode === 'FILE_UPLOAD' && (
                <div className="space-y-2">
                  <label className="text-slate-300 font-bold block mb-1">Tải file tài liệu (PDF, Word, Excel, CSV, TXT)</label>
                  <div className="border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 transition-all">
                    <input
                      type="file"
                      id="docFileModal"
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="docFileModal" className="cursor-pointer flex flex-col items-center">
                      <Upload className="w-8 h-8 text-cyan-400 mb-2" />
                      <span className="font-semibold text-white">
                        {studioFile ? studioFile.name : 'Bấm để chọn file hoặc kéo thả tài liệu vào đây'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">Hỗ trợ PDF, Word .docx, Excel .xlsx, CSV, TXT</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Mode C: Website URL */}
              {teachingMode === 'WEBSITE' && (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Đường dẫn Website an toàn</label>
                  <input
                    type="url"
                    value={studioUrl}
                    onChange={e => setStudioUrl(e.target.value)}
                    placeholder="https://example.com/product-specs..."
                    className="w-full bg-slate-950 text-white p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Tagging & Scope Bindings (Section 5D) */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Gắn sản phẩm</label>
                  <input
                    type="text"
                    value={studioProductName}
                    onChange={e => setStudioProductName(e.target.value)}
                    placeholder="Ví dụ: ThinkPad E14 Gen 7"
                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Chủ đề / Ngành hàng</label>
                  <input
                    type="text"
                    value={studioTopic}
                    onChange={e => setStudioTopic(e.target.value)}
                    placeholder="Ví dụ: Thiết bị văn phòng"
                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Chính sách liên quan</label>
                  <input
                    type="text"
                    value={studioPolicyType}
                    onChange={e => setStudioPolicyType(e.target.value)}
                    placeholder="Ví dụ: Bảo hành / Đổi trả / Giao hàng"
                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Doanh nghiệp / Tenant</label>
                  <select
                    value={studioTenantId}
                    onChange={e => setStudioTenantId(e.target.value)}
                    className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-700"
                  >
                    <option value="default">Dùng chung (default)</option>
                    <option value="org_namabank">Nam A Bank</option>
                    <option value="org_retail">Chuỗi bán lẻ</option>
                  </select>
                </div>
              </div>

              {/* Draft Option */}
              <label className="flex items-center space-x-2 text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDraftMode}
                  onChange={e => setIsDraftMode(e.target.checked)}
                  className="rounded text-cyan-500"
                />
                <span>Lưu dưới dạng BẢN NHÁP (DRAFT) - Chưa gửi duyệt ngay</span>
              </label>

              {/* Messages */}
              {ingestSuccessMsg && (
                <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/40 font-bold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{ingestSuccessMsg}</span>
                </div>
              )}

              {ingestWarningMsg && (
                <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/40 font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{ingestWarningMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStudioModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {loading ? 'Đang lưu...' : (isDraftMode ? 'Lưu Bản Nháp' : 'Lưu & Gửi Duyệt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUESTION DETAIL INSPECT MODAL */}
      {/* ========================================================================= */}
      {inspectQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0b1b36] border border-cyan-500/40 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8 text-xs">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-sm font-black text-white flex items-center space-x-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>CHI TIẾT BÁO CÁO THIẾU KIẾN THỨC</span>
              </h3>
              <button
                onClick={() => setInspectQuestion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div><strong className="text-slate-400">Mã báo cáo:</strong> <span className="font-mono text-cyan-300">{inspectQuestion.question.id}</span></div>
              <div><strong className="text-slate-400">Câu hỏi gốc:</strong> <span className="text-white font-semibold">"{inspectQuestion.question.original_question || inspectQuestion.question.question}"</span></div>
              <div><strong className="text-slate-400">AI đã trả lời:</strong> <p className="text-slate-300 mt-1 whitespace-pre-wrap">{inspectQuestion.question.ai_response || '—'}</p></div>
              <div><strong className="text-slate-400">Lý do không trả lời được:</strong> <span className="text-amber-300 font-bold">{inspectQuestion.question.failure_reason}</span></div>
              <div><strong className="text-slate-400">Mức ưu tiên:</strong> {renderPriorityBadge(inspectQuestion.question.priority)}</div>
              <div><strong className="text-slate-400">Trạng thái:</strong> {renderStatusBadge(inspectQuestion.question.status)}</div>
              <div><strong className="text-slate-400">Sản phẩm liên quan:</strong> <span className="text-white">{inspectQuestion.question.related_product_name || '—'}</span></div>
              <div><strong className="text-slate-400">Đối tác / Tenant:</strong> <span className="font-mono">{inspectQuestion.question.org_id || 'default'}</span></div>
              <div><strong className="text-slate-400">Thời gian ghi nhận:</strong> <span>{new Date(inspectQuestion.question.created_at).toLocaleString('vi-VN')}</span></div>
              <div><strong className="text-slate-400">Số lần xuất hiện:</strong> <span className="font-bold text-cyan-300">{inspectQuestion.question.hit_count || 1} lần</span></div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-x-1">
                {['REVIEWING', 'WAITING_KNOWLEDGE', 'RESOLVED', 'REJECTED'].map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      handleUpdateQuestionStatus(inspectQuestion.question.id, st);
                      setInspectQuestion(null);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px]"
                  >
                    Chuyển {st}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  const q = inspectQuestion.question;
                  setInspectQuestion(null);
                  handleOpenStudioForQuestion(q);
                }}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Dạy AI ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
