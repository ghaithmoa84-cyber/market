Sprint 6 Brief — Delivery & Finance
الهدف

إكمال دورة الطلب من التسليم إلى التسوية المالية مع ضمان سلامة البيانات المالية.

§1 — المهام المطلوبة
1.1 Delivery Confirmation
المندوب يضغط "تم التسليم" → Order.status → DELIVERED
يُسجل OrderEvent: DELIVERED, actorType: COURIER
يُسجل Order.deliveredAt = now()
1.2 Customer Confirmation
العميل يضغط "استلمت" → Order.status → CONFIRMED
يُسجل OrderEvent: CUSTOMER_CONFIRMED, actorType: CUSTOMER
يُسجل Order.confirmedAt = now()
1.3 Auto-Confirm
بعد 30 دقيقة من DELIVERED بدون رد العميل
Order.status → CONFIRMED
يُسجل OrderEvent: AUTO_CONFIRMED, actorType: SYSTEM
القيمة من Config: AUTO_CONFIRM_TIMEOUT_MINUTES=30
يُنفَّذ عبر Polling check وليس Cron Job خارجي
1.4 Financial Ledger
عند CONFIRMED → أنشئ مدخلتين في FinancialLedger:
YALLA_SHARE / CREDIT / المبلغ من order.yallaShare
COURIER_EARNING / CREDIT / المبلغ من order.courierEarning
Idempotency إلزامي — لا تكرار
Append-only — لا تعديل أبداً
1.5 Settlement
Order.status → SETTLEMENT_PENDING
Admin ينشئ SettlementBatch يومياً لكل مندوب
SettlementBatch يجمع كل Orders بحالة SETTLEMENT_PENDING للمندوب
عند الدفع → SettlementBatch.status → SETTLED
كل Order → SETTLED
§2 — Schema المطلوب إضافته
prisma
model FinancialLedger {
  id               String           @id @default(cuid())
  orderId          String
  courierId        String?
  order            Order            @relation(fields: [orderId], references: [id])
  type             LedgerEntryType
  direction        LedgerDirection
  amount           Decimal          @db.Decimal(14,2)
  idempotencyKey   String           @unique
  referenceLedgerId String?
  note             String?
  createdAt        DateTime         @default(now())

  @@index([orderId, createdAt])
  @@index([courierId, createdAt])
}

enum LedgerEntryType {
  YALLA_SHARE
  COURIER_EARNING
  ADJUSTMENT
}

enum LedgerDirection {
  CREDIT
  DEBIT
}

model SettlementBatch {
  id                   String           @id @default(cuid())
  courierId            String
  courier              CourierProfile   @relation(fields: [courierId], references: [id])
  settlementDate       DateTime
  totalDeliveryFees    Decimal          @db.Decimal(14,2)
  totalYallaShare      Decimal          @db.Decimal(14,2)
  totalCourierEarnings Decimal          @db.Decimal(14,2)
  amountDue            Decimal          @db.Decimal(14,2)
  amountSettled        Decimal          @db.Decimal(14,2)
  status               SettlementStatus @default(PENDING)
  settledAt            DateTime?
  settledBy            String?
  items                SettlementItem[]
  createdAt            DateTime         @default(now())

  @@unique([courierId, settlementDate])
}

enum SettlementStatus {
  PENDING
  PARTIAL
  SETTLED
}

model SettlementItem {
  id                String          @id @default(cuid())
  settlementBatchId String
  orderId           String
  settlementBatch   SettlementBatch @relation(fields: [settlementBatchId], references: [id])
  order             Order           @relation(fields: [orderId], references: [id])
  yallaShare        Decimal         @db.Decimal(14,2)
  amountSettled     Decimal          @db.Decimal(14,2)
  createdAt         DateTime        @default(now())

  @@unique([settlementBatchId, orderId])
  @@index([orderId])
}
§3 — API Routes المطلوبة
POST  /api/orders/[id]/deliver          ← COURIER
POST  /api/orders/[id]/confirm          ← CUSTOMER
POST  /api/orders/[id]/auto-confirm     ← SYSTEM (يُستدعى من Polling)
POST  /api/admin/settlements            ← ADMIN: إنشاء SettlementBatch
PATCH /api/admin/settlements/[id]       ← ADMIN: تحديث حالة Settlement
GET   /api/admin/settlements            ← ADMIN: قائمة Settlements
GET   /api/courier/settlements          ← COURIER: تسوياته المستحقة
§4 — Service Layer

DeliveryService (جديد):

confirmDelivery(orderId, courierId) — DELIVERED
confirmByCustomer(orderId, customerUserId) — CONFIRMED + Ledger
autoConfirm(orderId) — CONFIRMED + Ledger (SYSTEM)
checkAndAutoConfirm() — يفحص كل DELIVERED منذ > 30 دقيقة

FinanceService (جديد):

postLedgerEntries(orderId, tx) — ينشئ YALLA_SHARE + COURIER_EARNING
createSettlementBatch(courierId, date) — Admin
markSettled(batchId, adminId) — Admin
§5 — UI المطلوب
Courier UI
زر "تم التسليم" في صفحة الطلب النشط عند status = DELIVERING
Customer UI
زر "استلمت" في صفحة تتبع الطلب عند status = DELIVERED
عداد تنازلي يوضح "سيتم التأكيد تلقائياً خلال X دقيقة"
Admin UI
صفحة app/(admin)/settlements/page.tsx
قائمة التسويات المعلقة لكل مندوب
زر "تم الدفع" لكل Batch
§6 — قواعد مالية صارمة
Ledger Append-only — لا update لا delete على FinancialLedger
كل Ledger Entry له idempotencyKey فريد
postLedgerEntries يُستدعى مرة واحدة فقط عند CONFIRMED
Product Value ليس Yalla Revenue
Yalla Revenue = yallaShare فقط
كل عملية مالية داخل Transaction
§7 — Done Criteria
#	المعيار	الاختبار
1	المندوب يضغط "تم التسليم" → DELIVERED + Event + deliveredAt	يدوي
2	العميل يضغط "استلمت" → CONFIRMED + Event + Ledger entries	يدوي
3	Auto-confirm بعد 30 دقيقة → CONFIRMED + AUTO_CONFIRMED Event	يدوي
4	Ledger: YALLA_SHARE + COURIER_EARNING منشآن مرة واحدة	يدوي
5	Ledger Idempotent — تكرار الطلب لا ينشئ entries مكررة	اختبار
6	SETTLEMENT_PENDING بعد Ledger	يدوي
7	Admin ينشئ SettlementBatch لمندوب	يدوي
8	5 طلبات مكتملة → التسوية الإجمالية صحيحة	حسابي
9	tsc --noEmit + build + lint نجاح	آلي
10	CodeRabbit review نظيف	آلي