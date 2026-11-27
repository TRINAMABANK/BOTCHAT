# BÁO CÁO KIỂM TOÁN TÀI SẢN MÃ NGUỒN (SOURCE INVENTORY)
# TRÍ AI ONE SUPER BRAIN — DETAILED MODULE REGISTRY & CALL GRAPH

> **Repository:** `https://github.com/TRINAMABANK/BOTCHAT`  
> **Branch:** `main` | **Commit SHA Baseline:** `65cff35063ccba4703a640a839b83104ef7d64fc`  
> **Kiểm toán viên:** Principal Software Architect & Senior Backend Auditor  
> **Chế độ kiểm toán:** STRICT READ-ONLY AUDIT  

---

## 1. PHÂN LOẠI TRẠNG THÁI 8 CẤP (8-TIER MODULE CLASSIFICATION)

1. **IMPLEMENTED AND VERIFIED (IV):** Đã triển khai đầy đủ, kết nối trong luồng chính và đã kiểm chứng bằng bài test thực tế.
2. **IMPLEMENTED BUT NOT VERIFIED (INV):** Có mã nguồn trong repo nhưng chưa có test suite trực tiếp bao phủ.
3. **PARTIALLY IMPLEMENTED (PI):** Đã triển khai một phần, còn các nhánh logic fallback chưa hoàn thiện.
4. **DESIGNED ONLY (DO):** Mới có khung khai báo class, interface hoặc comment thiết kế, thân hàm chưa xử lý.
5. **NOT IMPLEMENTED (NI):** Được nhắc đến trong tài liệu nhưng không tìm thấy file mã nguồn.
6. **DUPLICATED (DUP):** Logic bị lặp lại hoặc sao chép giữa các file, gây xung đột điều phối.
7. **NOT CONNECTED (NC):** Module được lập trình hoàn chỉnh nhưng **không được import hoặc gọi** từ Central Brain.
8. **BROKEN (BRK):** Module có mã nhưng phát sinh lỗi runtime (Exception/Crash) khi thực thi.

---

## 2. BẢNG KIỂM KÊ TOÀN DIỆN TỪNG PHÂN HỆ

### PHÂN HỆ A: CENTRAL BRAIN (BỘ NÃO TRUNG TÂM)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/centralBrainService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainService.js) | 2,207 | DB, CentralBrainOrchestrator, IntentEngine, ContextEngine, SalesEngineAdapter | `processChat()`, `_processChatInternal()`, `runSmartOrchestratorFallback()` | `server/routes/centralBrainRoutes.js`, API Chat | **Vào:** Message, userId, convId, productContext<br>**Ra:** Response object (reply, revealCatalog, citations, toolsUsed) | **IV + DUP** |
| [server/services/centralBrainOrchestrator.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/centralBrainOrchestrator.js) | 441 | PragmaticIntelligenceEngine, MultiThreadEngine, UnifiedMemoryCore, WeatherService | `runPipeline()`, `_handleResumeGoal()`, `_handleExplainPrinciple()` | `CentralBrainService._processChatInternal()` (Line 380) | **Vào:** PipelineContext, request params<br>**Ra:** Response object nếu bắt được chủ đề, hoặc `null` để fallthrough | **IV + DUP** |

---

### PHÂN HỆ B: LANGUAGE & INTENT (NGÔN NGỮ & Ý ĐỊNH)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/intentEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/intentEngine.js) | 1,554 | `activeProductContext.js`, `salesEngine.js` | `analyzeIntent()`, `normalizeText()`, `stripDiacritics()`, `isWeatherInquiry()`, `isRepairServiceInquiry()` | `CentralBrainService`, `CentralBrainOrchestrator` | **Vào:** Raw string message, conversation context<br>**Ra:** IntentResult (primaryIntent, intentGroup, domain, slots, confidence) | **IV** |
| [server/services/intelligence/pragmaticIntelligenceEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/pragmaticIntelligenceEngine.js) | 185 | Hằng số `COMMUNICATIVE_ACTS` | `analyze()` | `CentralBrainOrchestrator` (Stage 2) | **Vào:** Sanitized string<br>**Ra:** PragmaticProfile (communicativeAct, targetTopic, implicitIntent) | **IV** |
| [server/services/intelligence/naturalHumanConversationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/naturalHumanConversationEngine.js) | 268 | Hằng số quy tắc hội thoại tự nhiên | `analyzeConversationContext()`, `handleConversation()`, `sanitizeHumanTone()` | `CentralBrainService` (Line 1862) | **Vào:** Message, conversation history<br>**Ra:** Humanized natural reply, stage | **IV** |

---

### PHÂN HỆ C: CONTEXT (NGỮ CẢNH HỘI THOẠI)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/contextEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/contextEngine.js) | 228 | `server/db.js` | `resolveUserContext()`, `getConversationHistory()`, `resolveCoReferences()`, `updateSessionContext()` | `CentralBrainService`, `CentralBrainOrchestrator` | **Vào:** Message, auth token, customerInfo<br>**Ra:** UserContext (role, isOwner, impersonationCheck), CoRef resolved | **IV** |
| [server/services/intelligence/multiThreadConversationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/multiThreadConversationEngine.js) | 292 | In-memory `Map()` | `switchTopic()`, `resumeThread()`, `getActiveThread()`, `handleStockInquiry()`, `handleAdministrativeDrafting()` | `CentralBrainOrchestrator` (Stage 4) | **Vào:** SessionId, targetTopic, entities<br>**Ra:** Active Thread object, isolated domain responses | **IV (RAM-only)** |
| [server/services/intelligence/activeProductContext.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/activeProductContext.js) | 165 | In-memory `Map()`, DB | `getContext()`, `setActiveProduct()`, `resolveFromHistory()`, `extractProductFromText()` | `CentralBrainService`, `CentralBrainOrchestrator` | **Vào:** SessionId, productCandidate<br>**Ra:** ActiveProductContext (name, id, field, lockStatus) | **IV** |

---

### PHÂN HỆ D: MEMORY (HỆ THỐNG TRÍ NHỚ ĐA TẦNG)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/unifiedMemoryCore.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/unifiedMemoryCore.js) | 608 | `ai_memories`, `ai_memory_contradictions`, `AssociationEngine` | `pushGoal()`, `peekGoal()`, `popGoal()`, `resumePreviousGoal()`, `rememberFact()`, `handleMemoryCommand()` | `CentralBrainOrchestrator`, `CentralBrainService` | **Vào:** SessionId, goal/fact, truthType<br>**Ra:** Goal object, memory status, contradiction audit | **IV** |
| [server/services/intelligence/humanMemoryEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/humanMemoryEngine.js) | 245 | `ai_human_memories` table | `remember()`, `retrieve()`, `forget()`, `detectContradiction()` | `CentralBrainService` (Lines 674, 934) | **Vào:** Fact entity, sensitivity, tenantId<br>**Ra:** Array of retrieved memory objects | **IV** |
| [server/services/intelligence/memoryEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/memoryEngine.js) | 158 | `customer_memories` table | `rememberCustomerFact()`, `getCustomerMemory()`, `forgetCustomer()` | `CentralBrainService` (Line 606, 647) | **Vào:** UserId, orgId, key, value<br>**Ra:** Key-value memory pairs | **IV** |
| [server/services/intelligence/knowledgeGraphEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/knowledgeGraphEngine.js) | 284 | `knowledge_graph_entities`, `knowledge_graph_relations` | `findCompatibleItems()`, `getAugmentedContext()`, `addRelation()` | `CentralBrainService` (Lines 348, 1098, 1411) | **Vào:** Product target, orgId<br>**Ra:** Compatible supplies list, augmented triples | **IV** |
| [server/services/intelligence/associationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/associationEngine.js) | 134 | Bảng ánh xạ liên tưởng khái niệm | `findCrossDomainAssociations()`, `calculateConceptSimilarity()` | `unifiedMemoryCore.js` (Line 23) | **Vào:** Concept/domain keyword<br>**Ra:** Associated cross-domain concepts | **IV** |

---

### PHÂN HỆ E: REASONING (SUY LUẬN & PHẢN BIỆN)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/reasoningEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/reasoningEngine.js) | 185 | `CriticalThinkingEngine` | `planExecution()`, `evaluateSufficiency()`, `assessComplexity()` | `CentralBrainService` (Line 943) | **Vào:** IntentResult, conversation context<br>**Ra:** ExecutionPlan (complexity, dataSufficient, clarificationQuestion) | **IV** |
| [server/services/intelligence/cognitiveReasoningEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/cognitiveReasoningEngine.js) | 137 | Độc lập (Pure Logic) | `analyzeRootCause()`, `evaluateTradeOffs()`, `detectBiases()` | **KHÔNG CÓ CALLER (Unused)** | **Vào:** Problem description<br>**Ra:** 5-Whys chain, CapEx/OpEx ROI | **NC (Not Connected)** |
| [server/services/intelligence/criticalThinkingEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/criticalThinkingEngine.js) | 317 | Fallacy taxonomy definitions | `analyze()`, `detectFalsePremise()`, `detectFallacies()` | `ReasoningEngine`, `CentralBrainService` (Line 953) | **Vào:** Raw text, context<br>**Ra:** CriticalAnalysis (shouldIntervene, hasFallacy, interventionResponse) | **IV** |
| [server/services/intelligence/metacognitionEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/metacognitionEngine.js) | 165 | Hằng số `EPISTEMIC_LEVELS` | `evaluateConfidence()`, `introspectUncertainty()`, `auditEpistemicGrounding()` | `deepResearchEngine.js` | **Vào:** Proposed answer, evidence sources<br>**Ra:** Confidence score (0-1), epistemicGrade | **PI (Chỉ dùng trong DeepResearch)** |

---

### PHÂN HỆ F: PLANNING & ACTION (KẾ HOẠCH & HÀNH ĐỘNG)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/planningEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/planningEngine.js) | 215 | `ReasoningEngine`, `ToolOrchestrator` | `generateMultiStepPlan()`, `evaluatePreconditions()`, `rollbackPlan()` | `centralBrainService.js` (Line 38) | **Vào:** User objective, constraints<br>**Ra:** Array of PlanSteps, execution status | **INV** |
| [server/services/intelligence/toolOrchestrator.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/toolOrchestrator.js) | 342 | `QuotationService`, `WebSearchService`, `LiveWebsiteRetrieval` | `executeQuotation()`, `executeLiveWebSearch()`, `executeKnowledgeSearch()` | `CentralBrainService` | **Vào:** Tool name, parameters, context<br>**Ra:** Tool execution result, status, citations | **IV** |
| [server/services/intelligence/autonomyApprovalEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/autonomyApprovalEngine.js) | 198 | In-memory pending actions `Map()` | `evaluateTier3Security()`, `registerPendingAction()`, `evaluateConversationalResponse()` | `CentralBrainOrchestrator`, `CentralBrainService` | **Vào:** User message, actionId<br>**Ra:** SecurityCheck (blocked, replyText), approval status | **IV** |

---

### PHÂN HỆ G: VERIFICATION & QUALITY GATE (KIỂM ĐỊNH CHẤT LƯỢNG)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/verificationEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/verificationEngine.js) | 218 | Regex sanitizers, off-topic rules | `guardOffTopic()`, `verifyPriceAccuracy()`, `cleanHallucinations()` | `CentralBrainService` | **Vào:** Proposed replyText, intentResult<br>**Ra:** Verified/Guarded clean replyText | **IV** |
| [server/services/intelligence/selfVerificationQualityGate.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/selfVerificationQualityGate.js) | 185 | Ground truth verifier | `verifyGroundTruth()`, `verifyVatCompliance()`, `gradeConfidence()` | `CentralBrainOrchestrator` (Stage 10) | **Vào:** Proposed response, raw DB data<br>**Ra:** QualityVerdict (pass, correctedText, grade) | **IV** |
| [server/services/intelligence/responseEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/responseEngine.js) | 165 | Formatters | `formatResponse()`, `formatClarification()`, `formatError()` | `CentralBrainService`, `CentralBrainOrchestrator` | **Vào:** Raw reply, metadata, uiDirectives<br>**Ra:** Standardized API JSON response contract | **IV** |

---

### PHÂN HỆ H: LEARNING (TỰ HỌC & TIẾP NHẬN TRI THỨC)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/intelligence/learningCaptureEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/learningCaptureEngine.js) | 210 | `learning_gaps` table | `recordGap()`, `inspectAndLogTurn()` | `CentralBrainService` (Lines 1783, 1934) | **Vào:** Unanswered question, aiResponse, reason<br>**Ra:** Saved learning gap record | **IV** |
| [server/services/intelligence/learningIngestionEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/learningIngestionEngine.js) | 240 | `approved_knowledge` table | `lookupApprovedKnowledge()`, `ingestKnowledgeItem()` | `CentralBrainService` (Line 873) | **Vào:** Message, orgId<br>**Ra:** Approved standard question & answer pair | **IV** |
| [server/services/intelligence/learningTestEngine.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/intelligence/learningTestEngine.js) | 185 | `server/routes/learningRoutes.js` | `runAutomatedEvaluation()`, `calculateAccuracyScore()` | Admin Learning Center API | **Vào:** Test suite parameters<br>**Ra:** Evaluation report, score metrics | **IV** |

---

### PHÂN HỆ I: GATEWAYS & INFRASTRUCTURE (CỔNG ĐIỀU PHỐI & HẠ TẦNG)
| Tên File | Dòng code | Phụ thuộc chính | Hàm trọng tâm | Caller chính | Dữ liệu Vào / Ra | Trạng thái |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| [server/services/gateway/modelGateway.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/gateway/modelGateway.js) | 98 | `callGemini` service | `execute()` | **KHÔNG CÓ CALLER (Chưa kết nối)** | **Vào:** Prompt, taskType (Pro vs Flash)<br>**Ra:** Model output, latencyMs, tierUsed | **NC (Not Connected)** |
| [server/services/gateway/toolGateway.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/gateway/toolGateway.js) | 129 | `ssrfProtection.js`, DB | `executeTool()`, `_dispatchTool()` | **KHÔNG CÓ CALLER (Chưa kết nối)** | **Vào:** ToolName, params, 5s timeout<br>**Ra:** Sandboxed result, audit log | **NC (Not Connected)** |
| [server/services/security/securityGovernanceGate.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/security/securityGovernanceGate.js) | 145 | Hằng số `AUTHORIZATION_LEVELS` | `evaluateAuthorization()` | `CentralBrainOrchestrator` (Stage 6) | **Vào:** Message, userId, tenantId<br>**Ra:** Authorization check (allowed: boolean) | **IV (Sót từ khóa)** |
| [server/services/weather/weatherService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/weather/weatherService.js) | 312 | Open-Meteo REST API | `handleWeatherQuery()`, `fetchLiveWeather()` | `CentralBrainOrchestrator`, `CentralBrainService` | **Vào:** Weather query text, location<br>**Ra:** Satellite radar reply, rain probability % | **IV** |
| [server/services/quotationService.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/services/quotationService.js) | 265 | `quotations` table | `createQuotation()`, `renderMarkdown()` | `CentralBrainOrchestrator`, `ToolOrchestrator` | **Vào:** Items array, customerName, 10% VAT<br>**Ra:** QuoteCode, subtotal, vatAmount, markdown | **IV** |
| [server/db.js](file:///d:/09-%20LAM%20APP%20KIEM%20TIEN/2027%20LAM%20CHATBOT%20BAN%20HANG/server/db.js) | 944 | SQLite3, PRAGMA WAL | `get()`, `all()`, `run()`, `exec()` | Toàn bộ hệ thống | **Vào:** SQL query, params<br>**Ra:** Database rows / execution metadata | **IV** |
