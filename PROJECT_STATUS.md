# Yalla Market — Project Status

## Sprint الحالي
Sprint 1 — Foundation & Security (مكتمل ✅)
Sprint 2 — Products & Search (مكتمل ✅)
Sprint 3 — Cart & Orders (مكتمل ✅)
Sprint 4 — Courier (مكتمل ✅)
Sprint 5 — Alternatives & Weighted Items (قيد التنفيذ)

## ما اكتمل حتى الآن
- [x] تهيئة المشروع: Next.js 16.x, TypeScript strict, Tailwind 4
- [x] Prisma Schema كامل (User, CustomerProfile, CourierProfile, Store, StoreHours, Category, Product, StoreProduct, PriceHistory, SearchLog)
- [x] lib/config.ts — Config module موحد
- [x] lib/prisma.ts — Prisma singleton
- [x] lib/auth.ts — Auth.js مع Credentials Provider
- [x] middleware.ts — RBAC كامل
- [x] .env.example و .env.local
- [x] Sprint 1: Database, Auth, Admin basic CRUD, PriceHistory
- [x] Sprint 2: Customer UI (Home, Categories, Search, Product, Store pages)
- [x] Sprint 2: Search API مع SearchLog recording
- [x] Sprint 2: Price Freshness display (price, store, last updated)
- [x] Sprint 2: Open/Closed store logic
- [x] Sprint 2: Security fix — Customer API routes require authentication
- [x] Sprint 3: Schema — Address, Order, OrderStore, OrderItem, OrderEvent, IdempotencyRecord
- [x] Sprint 3: Migration `20260902123457_sprint3_orders` (مطبق — DB up to date)
- [x] Sprint 3: lib/pricing.ts — معادلة توصيل `60 + MAX(20, 2% × CartValue)` + Yalla/Courier breakdown
- [x] Sprint 3: lib/state-machine.ts — State Machine للانتقالات المسموحة فقط
- [x] Sprint 3: lib/idempotency.ts — التحقق (replay) والتسجيل داخل الـTransaction
- [x] Sprint 3: lib/services/order-service.ts — إنشاء الطلب (Order + OrderStores + OrderItems + OrderEvents) في Transaction واحدة، DRAFT→PENDING عبر State Machine، Idempotent
- [x] Sprint 3: lib/services/pricing-service.ts — حساب السعر على الخادم (Server is source of truth)
- [x] Sprint 3: lib/validations/order.ts — Zod schemas (cartItem, createOrder, createAddress)

## Sprint 4 — Courier (مكتمل ✅)
- [x] Prisma Schema جاهز (OrderStatus, CourierStatus, OrderEvent, IdempotencyRecord)
- [x] lib/services/courier-service.ts — getAvailableOrders, acceptOrder (Atomic), updateCourierStatus, transitionOrderStatus
- [x] API routes: /api/courier/*
- [x] Courier UI: Online/Offline, Available/Busy, orders list, order details
- [x] اختبارات التزامن (Atomic Accept) — 16/16 نجح
- [x] CodeRabbit review + PR

## Sprint 5 — Alternatives & Weighted Items (قيد التنفيذ)

## البنية التحتية للمراجعة (مضافة في Sprint 4)
- `.coderabbit.yaml` — مراجعة صارمة على الأمان والماليات (`request_changes_workflow: true`، `tone_instructions` صارمة، `language: ar`)
- `.kilo/command/pre-flight.md` — بوابة إلزامية قبل كل رفع (`tsc + build + lint + Done Criteria`)
- `.kilo/command/code-review.md` — دليل دورة المراجعة الثنائية (VS Code + GitHub)
- `.kilo/agent/reviewer.md` — وكيل مراجعة فرعي يكرر دور CodeRabbit ↔ Kilo حتى تنقضي Blockers
- `.kilo/skills/coderabbit-review/SKILL.md` — مهارة مدمجة بالخطة الكاملة والقواعد الذهبية

## قاعدة ذهبية من الآن
قبل كل `git push`:
شغّل `/pre-flight` أولاً — ثم افتح الـ PR واترك CodeRabbit يراجع السياق الكامل.

## Sprints القادمة
- Sprint 6: Delivery & Finance
- Sprint 7: Full Admin
- Sprint 8: QA & Production

## القرارات الثابتة التي لا تتغير
- Server هو مصدر الحقيقة دائماً
- Yalla Share = 20 ليرة كحد أدنى (فرضية قابلة للقياس بعد 200 طلب)
- Delivery Fee = 60 + MAX(20, 2% × Cart Value)
- Cash on Delivery فقط في MVP
- Polling كل 10 ثوانٍ (لا Pusher لا WebSocket في MVP)
- لا SMS، لا OTP، لا Push خارجي
- dayOfWeek: 0=Sunday حتى 6=Saturday في كل النظام
- Financial Ledger Append-only (لا حذف، لا تعديل)
- كل State Transition عبر State Machine فقط

## ملفات المرجع
- `Yalla Market Finder.docx` — رؤية المشروع والقرارات التشغيلية
- `MVP Technical Specification V1.1.docx` — المرجع التقني الكامل
- `Sprint 4 Brief.md` — تفاصيل Sprint الحالي
- `CLAUDE.md` — قواعد العمل الدائمة

## تعليمات لأي محادثة جديدة
اقرأ هذه الملفات بالترتيب:
1. PROJECT_STATUS.md (هذا الملف)
2. CLAUDE.md
3. Sprint Brief الخاص بالـSprint الحالي
4. MVP Technical Specification V1.1.docx عند الحاجة
