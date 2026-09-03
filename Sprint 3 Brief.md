# Sprint 3 Brief — Cart & Orders
## Yalla Market — يلا ماركت

**المرجع الأعلى:** MVP Technical Specification V1.1
**لا تنفذ أي شيء خارج هذا الملف**

---

## الهدف

إنشاء Order حقيقي.
- سلة تسوق (Multi-store)
- إضافة منتجات من متاجر متعددة
- عناصر مخصصة (Custom Items)
- حساب تسعير التوصيل على الخادم
- اختيار عنوان
- إنشاء الطلب Idempotent
- صفحة حالة الطلب (Order status page)
- صفحة تاريخ الطلبات (Order history)
- الانتقال الحالة DRAFT → PENDING مع تسجيل OrderEvent

---

## التقنية المطلوبة

```
Next.js 16.x (App Router)
TypeScript strict
Tailwind CSS 4.x
Prisma
PostgreSQL (Managed, Vercel-compatible)
Auth.js
Zod
```

---

## الملفات التي يجب إنشاؤها/تعديلها

```
yalla-market/
├── app/
│   ├── (customer)/
│   │   ├── page.tsx              (Home - Sprint 2)
│   │   ├── search/
│   │   │   └── page.tsx          (Search Page - Sprint 2)
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       └── page.tsx      (Product Page - Sprint 2)
│   │   ├── stores/
│   │   │   └── [id]/
│   │   │       └── page.tsx      (Store Page - Sprint 2)
│   │   ├── categories/
│   │   │   ├── page.tsx          (Categories List - Sprint 2)
│   │   │   └── [id]/
│   │   │       └── page.tsx      (Category Browse - Sprint 2)
│   │   ├── cart/
│   │   │   └── page.tsx          (NEW - Cart Page)
│   │   ├── orders/
│   │   │   ├── page.tsx          (NEW - Order History)
│   │   │   └── [id]/
│   │   │       └── page.tsx      (NEW - Order Status Page)
│   │   └── account/
│   │       └── addresses/
│   │           └── page.tsx      (NEW - Address Selection)
│   ├── api/
│   │   ├── auth/                 (Sprint 1)
│   │   ├── orders/
│   │   │   └── route.ts          (NEW - Order creation endpoint, idempotent)
│   │   ├── products/             (Sprint 2)
│   │   └── admin/                (Sprint 1)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                       (Sprint 1)
│   ├── customer/
│   │   ├── ProductCard.tsx       (Sprint 2)
│   │   ├── StoreCard.tsx        (Sprint 2)
│   │   ├── SearchBar.tsx        (Sprint 2)
│   │   ├── CartItem.tsx         (NEW)
│   │   ├── CartSummary.tsx      (NEW)
│   │   ├── AddressForm.tsx      (NEW)
│   │   └── OrderStatus.tsx      (NEW)
│   ├── courier/
│   └── admin/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── config.ts                 (Sprint 1 - config is source of truth)
│   ├── pricing.ts               (NEW - Delivery Fee calculation)
│   ├── state-machine.ts         (NEW - Order state machine)
│   ├── idempotency.ts           (NEW - Idempotency helper)
│   ├── services/
│   │   ├── order-service.ts     (NEW - Order creation logic)
│   │   ├── product-service.ts   (Sprint 2)
│   │   ├── search-service.ts    (Sprint 2)
│   │   ├── pricing-service.ts   (NEW - Pricing Engine service)
│   │   ├── courier-service.ts
│   │   ├── settlement-service.ts
│   │   └── finance-service.ts
│   └── validations/
│       ├── auth.ts              (Sprint 1)
│       ├── product.ts           (Sprint 1)
│       ├── order.ts             (NEW - Order/Cart validation)
│       ├── search.ts            (Sprint 2)
│       ├── courier.ts
│       └── admin.ts
├── prisma/
│   ├── schema.prisma            (UPDATE - add new models)
│   └── migrations/
├── tests/
│   ├── unit/
│   │   ├── pricing.test.ts      (NEW)
│   │   └── state-machine.test.ts (NEW)
│   ├── integration/
│   │   ├── order-creation.test.ts (NEW)
│   │   └── idempotency.test.ts   (NEW)
│   └── e2e/
│       └── cart-flow.test.ts    (NEW)
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
└── README.md
```

---

## Prisma Schema المطلوب في هذا Sprint

النماذج الجديدة المطلوبة: `Address`, `Order`, `OrderStore`, `OrderItem`, `IdempotencyRecord`
(بدعم من `OrderEvent` + الـ enums لضمان الـState Machine).

```prisma
model Address {
  id           String           @id @default(cuid())
  customerId   String
  customer     CustomerProfile  @relation(fields: [customerId], references: [id])
  label        String?
  addressText  String
  lat          Float?
  lng          Float?
  deliveryNotes String?
  isDefault    Boolean          @default(false)
  orders       Order[]
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
}

enum OrderStatus {
  DRAFT
  PENDING
  SEARCHING_COURIER
  COURIER_ASSIGNED
  COURIER_ACCEPTED
  GOING_TO_STORE
  SHOPPING
  WAITING_CUSTOMER_APPROVAL
  PURCHASED
  DELIVERING
  DELIVERED
  CONFIRMED
  SETTLEMENT_PENDING
  SETTLED
  CANCELLED
}

enum CancelReason {
  CUSTOMER_INITIATED
  ADMIN_INITIATED
  AUTO_TIMEOUT
  STORE_UNAVAILABLE
  COURIER_UNAVAILABLE
}

model Order {
  id              String          @id @default(cuid())
  customerId      String
  courierId       String?
  addressId       String
  customer        CustomerProfile @relation(fields: [customerId], references: [id])
  courier         CourierProfile? @relation(fields: [courierId], references: [id])
  address         Address         @relation(fields: [addressId], references: [id])
  status          OrderStatus     @default(DRAFT)
  cancelReason    CancelReason?
  subtotalExpected Decimal        @db.Decimal(14, 2)
  subtotalActual   Decimal?       @db.Decimal(14, 2)
  deliveryFee      Decimal        @db.Decimal(14, 2)
  yallaShare       Decimal        @db.Decimal(14, 2)
  courierEarning   Decimal        @db.Decimal(14, 2)
  totalExpected    Decimal        @db.Decimal(14, 2)
  totalActual      Decimal?       @db.Decimal(14, 2)
  noCourierAt      DateTime?
  deliveredAt      DateTime?
  confirmedAt      DateTime?
  cancelledAt      DateTime?
  orderStores      OrderStore[]
  items            OrderItem[]
  events           OrderEvent[]
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([customerId, createdAt])
  @@index([courierId, status])
  @@index([status, createdAt])
}

model OrderStore {
  id        String      @id @default(cuid())
  orderId   String
  storeId   String
  order     Order       @relation(fields: [orderId], references: [id])
  store     Store       @relation(fields: [storeId], references: [id])
  items     OrderItem[]
  @@unique([orderId, storeId])
}

model OrderItem {
  id             String    @id @default(cuid())
  orderId        String
  orderStoreId   String
  order          Order     @relation(fields: [orderId], references: [id])
  orderStore     OrderStore @relation(fields: [orderStoreId], references: [id])
  productId      String?
  isCustom       Boolean   @default(false)
  customDescription String?
  unit           ItemUnit  @default(PIECE)
  requestedQty   Decimal   @db.Decimal(10, 3)
  actualQty      Decimal?  @db.Decimal(10, 3)
  expectedPrice  Decimal   @db.Decimal(14, 2)
  actualPrice    Decimal?  @db.Decimal(14, 2)
  expectedTotal  Decimal   @db.Decimal(14, 2)
  actualTotal    Decimal?  @db.Decimal(14, 2)
  status         ItemStatus @default(PENDING)
  alternatives   Alternative[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([orderId])
}

enum ItemUnit {
  PIECE
  WEIGHT
  VOLUME
  PACKAGE
}

enum ItemStatus {
  PENDING
  PURCHASED
  UNAVAILABLE
  SUBSTITUTED
  CANCELLED
}

model OrderEvent {
  id        String         @id @default(cuid())
  orderId   String
  order     Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  actorType OrderActorType
  actorId   String?
  event     OrderEventType
  metadata  Json?
  createdAt DateTime       @default(now())

  @@index([orderId, createdAt])
}

enum OrderActorType {
  CUSTOMER
  COURIER
  ADMIN
  SYSTEM
}

enum OrderEventType {
  CREATED
  SUBMITTED
  SEARCHING_COURIER
  COURIER_ASSIGNED
  COURIER_ACCEPTED
  GOING_TO_STORE
  SHOPPING
  ALTERNATIVE_PROPOSED
  ALTERNATIVE_APPROVED
  ALTERNATIVE_REJECTED
  ALTERNATIVE_TIMEOUT
  PRICE_APPROVAL_REQUESTED
  PRICE_APPROVED
  PRICE_REJECTED
  ITEM_UNAVAILABLE
  ITEM_PURCHASED
  ORDER_PURCHASED
  DELIVERING
  DELIVERED
  CUSTOMER_CONFIRMED
  AUTO_CONFIRMED
  CANCELLED
  SETTLEMENT_PENDING
  SETTLED
  ADMIN_INTERVENTION
}

model IdempotencyRecord {
  id          String   @id @default(cuid())
  key         String   @unique
  operation   String
  userId      String?
  resourceId  String?
  response    Json?
  createdAt   DateTime @default(now())

  @@index([userId, operation])
}
```

**ملحوظة:**
- `CustomerProfile` و `Store` و `Product` و `StoreProduct` موجودان من Sprint 1.
- `Order` يشير إلى `ledgerEntries FinancialLedger[]` و `settlementItems SettlementItem[]` — تُضيف في Sprint 6.
- `OrderItem.alternatives` (و `Alternative`) يُضاف في Sprint 5.
- التراكيب الأساسية (Decimal 14,2) إلزامية لكل المبالغ المالية — لا تستخدم Float.

---

## الوظائف المطلوبة في هذا Sprint

**Cart**
- إضافة منتجات من متاجر متعددة إلى السلة
- إظهار السعر الحالي لكل منتج من كل متجر (Price Freshness)
- إظهار عدد القطع / الوزن لكل عنصر
- حذف / تعديل الكمية في السلة
- Empty State واضح عندما تكون السلة فارغة

**Custom Items**
- إضافة عنصر مخصص يدوياً للطلب:
  - isCustom = true
  - customDescription != null
  - expectedPrice يُحدد يدوياً

**Multi-store Order**
- السلة قد تحتوي على منتجات من N متاجر
- إنشاء Order واحد مع:
  - 3 متاجر → 3 OrderStore
  - N طلب منتجات → N OrderItem
  - الكل يحدث في Transaction واحدة

**Delivery Pricing (Pricing Engine)**
- القانون الرسمي:
  - Delivery Fee = 60 + MAX(20, 2% × CartValue)
- الحساب على Server فقط
- المثال:
  - سلة 500 → 60 + 20 = 80
  - سلة 1000 → 60 + 20 = 80
  - سلة 2000 → 60 + 40 = 100
  - سلة 3000 → 60 + 60 = 120
- يقرأ القيم من lib/config.ts (مصدر الحقيقة)
- لا قراءة process.env المباشرة في الـServices

**Price Snapshot**
- عند إضافة المنتج للسلة، يتم حفظ expectedPrice في OrderItem
- هذا هو السعر المرجعي للطلب

**Address Selection**
- اختيار عنوان محفوظ أو إضافة عنوان جديد
- العنوان يحفظ في Address مرتبط بـCustomerProfile
- إمكانية تعيين عنوان افتراضي (isDefault)

**Order Creation (Idempotent)**
- إنشاء الطلب يدخل في Transaction واحدة:
  - Order + OrderStores + OrderItems + initial OrderEvent
  - إما all succeed أو all rollback
- العملية Idempotent باستخدام IdempotencyRecord:
  - إرسال الطلب مرتين (double click / timeout / retry) ينتج طلباً واحداً فقط
- الانتقال الحالة: DRAFT → PENDING مع تسجيل OrderEvent (event = CREATED + SUBMITTED)
- حساب القيم على Server:
  - subtotalExpected = SUM(expectedTotal لكل OrderItem)
  - deliveryFee = 60 + MAX(20, 2% × subtotalExpected)
  - yallaShare = MAX(20, configured rule) → MVP = 20
  - courierEarning = deliveryFee - yallaShare
  - totalExpected = subtotalExpected + deliveryFee

**Order Status Page**
- عرض حالة الطلب الحالية
- عرض العناصر مع الأسعار
- عرض تفاصيل العنوان
- عرض أجرة التوصيل والمشاركة والمبلغ الإجمالي

**Order History**
- قائمة بطلبات العميل الماضية
- عرض الحالة، التاريخ، والمبلغ الإجمالي
- إمكانية الوصول لصفحة حالة الطلب

**State Machine**
- كل انتقال حالة يمر عبر OrderStateMachine (lib/state-machine.ts)
- مثال ممنوع: DRAFT → PENDING مباشرة داخل Route بدون State Machine
- كل transition يسجل OrderEvent

**UI/UX**
- RTL كامل
- dir="rtl"
- Noto Sans Arabic
- أزرار بحد أدنى 48px
- Loading States واضحة
- Empty States واضحة
- مقاوم للنقر المزدوج (Anti-double-click) على زر إنشاء الطلب

---

## ما هو ممنوع في هذا Sprint

```
❌ Courier UI
❌ Courier Assignment
❌ Couriers Online/Offline
❌ Polling
❌ Alternatives (1:N)
❌ Alternative Approval Flow
❌ Unavailable handling
❌ Weighted Items
❌ Price Change Approval Flow
❌ Financial Ledger
❌ Settlement Batches / Items
❌ Notifications
❌ Admin Order Detail / Intervention
❌ Pusher / Ably / WebSocket
❌ Electronic Payment
❌ PWA Manifest
❌ Any Feature من Sprint 4 أو أبعد
```

---

## قواعد صارمة

```
✅ TypeScript strict — لا any بلا سبب موثق
✅ Zod لكل input خارجي
✅ Role check على Server في كل API
✅ Business Logic داخل Services (ليس في Routes)
✅ Prisma Transactions لـOrder Creation (all-or-nothing)
✅ State Machine لكل Order state transition
✅ كل transition يسجل OrderEvent
✅ Idempotency لعمليات الطلب الحساسة (Order Creation)
✅ الـPricing Engine على Server فقط — Server هو مصدر الحقيقة للأسعار
✅ Decimal @db.Decimal(14,2) لكل المبالغ المالية — لا JavaScript Float
✅ expectedTotal = requestedQty × expectedPrice — يحسب على Server
✅ لا تعرض Prisma errors للمستخدم
✅ لا secrets في source code
✅ القيم من lib/config.ts — لا process.env مباشرة في Services
✅ dayOfWeek: 0=Sunday حتى 6=Saturday
✅ Anti-double-click على زر إنشاء الطلب
```

---

## Done Criteria

يجب أن تنجح جميع البنود التالية قبل اعتبار Sprint 3 مكتملاً:

```
☐ السلة تدعم منتجات من متاجر متعددة
☐ إضافة Custom Item (isCustom=true, customDescription != null) يعمل
☐ حساب Delivery Fee = 60 + MAX(20, 2% × CartValue) على الخادم
☐ اختيار عنوان أو إضافة عنوان جديد يعمل
☐ إنشاء الطلب Idempotent (double submit → طلب واحد فقط)
☐ مثال: 3 متاجر، طلب واحد، 3 OrderStores، N OrderItems في Transaction واحدة
☐ الانتقال DRAFT → PENDING مع تسجيل OrderEvent
☐ صفحة حالة الطلب تعرض الحالة والعناصر والعنوان والأسعار
☐ صفحة تاريخ الطلام تعرض طلبات العميل
☐ State Machine يمنع انتقالات غير مسموحة
☐ TypeScript build يمر بلا أخطاء
☐ لا توجد secrets في الكود
☐ الواجهة RTL كاملة
☐ الصفحات تعمل على موبايل
☐ Anti-double-click على زر إنشاء الطلب
```

---

## الاختبارات المطلوبة

**Pricing Tests**
- السلة 500 ← Delivery = 80
- السلة 1000 ← Delivery = 80
- السلة 2000 ← Delivery = 100
- السلة 3000 ← Delivery = 120
- السلة 5000 ← Delivery = 160
- السلة 10000 ← Delivery = 260
- سلة فارغة ← يُرفض الإنشاء
- قيمة سالبة أو غير صالحة ← يُرفض (Zod)

**Order Creation Tests**
- Single-store order ← يُنشأ Order واحد مع OrderStore واحد
- Two-store order ← يُنشأ Order مع OrderStoreين
- Three-store order ← يُنشأ Order مع 3 OrderStore و N OrderItem في Transaction واحدة
- Custom Item order ← OrderItem بـ isCustom=true و customDescription محفوظ
- Order يُنشأ في Transaction واحدة (all-or-nothing)

**Idempotency Tests**
- إرسال Create Order مرتين بنفس المفتاح ← يُنشأ طلب واحد فقط
- IdempotencyRecord يُحفظ مع المفتاح والرد
- Retry بعد timeout ← لا يزيد الطلبات

**State Machine Tests**
- DRAFT → PENDING ← يُسجل OrderEvent (CREATED + SUBMITTED)
- DRAFT → SETTLED ← ممنوع (rejected)
- DRAFT → DELIVERING ← ممنوع (rejected)
- Every transition يمر عبر State Machine

**Address Tests**
- إضافة عنوان جديد ← يُحفظ ومرتبط بـCustomerProfile
- تعيين عنوان افتراضي ← isDefault = true
- اختيار عنوان محفوظ ← يُستخدم في الطلب

**Security Tests**
- Customer يحاول الوصول لطلب آخر ← ممنوع (Authorization on Resource)
- غير مسجل ← إنشاء طلب مرفوض
- Input غير صالح ← Zod يرفض
- قيمة Decimal سالبة أو غير صالحة ← يُرفض

**UI Tests**
- السلة الفارغة ← Empty State واضح
- زر Create Order ← Anti-double-click يعمل
- Loading State ← يظهر أثناء الإنشعاب
- RTL يعمل بشكل صحيح
- الصفحات تعمل على موبايل

**Build Test**
```bash
npx tsc --noEmit
npm run build
```

---

## الأوامر التي يجب تشغيلها بعد التنفيذ

```bash
# تثبيت المكتبات
npm install

# تشغيل migration
npx prisma migrate dev --name add_orders

# التحقق من TypeScript
npx tsc --noEmit

# تشغيل build
npm run build

# تشغيل محلياً
npm run dev
```

---

## تعليمات لـClaude Code

قبل الكتابة:
- افحص الملفات الموجودة من Sprint 1 و Sprint 2
- افحص Prisma schema
- افحص lib/config.ts (مصدر الإعدادات)
- لا تعد إنشاء شيء موجود
- لا تكسر الوظائف الموجودة

بعد التنفيذ:
1. شغّل TypeScript checks
2. شغّل build
3. شغّل tests
4. أصلح الأخطاء
5. قدم قائمة بالملفات التي تغيرت
6. قدم قائمة Done Criteria مع ✅ أو ❌ لكل بند
7. لا تقل إن Sprint مكتمل إذا فشل أي بند

---

**Simple Now — Extensible Later — Data Driven**
