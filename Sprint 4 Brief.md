# Sprint 4 Brief — Courier

> **المرجع الرسمي:** `MVP Technical Specification V1.1.docx` (قسم 47 — Sprint 4).
> **نطاق:** MVP فقط. لا ميزات خارج هذا الـ Sprint.

---

## 1. الهدف

**المندوب ينفذ الطلب.**

تفعيل دورة حياة الطلب من لحظة قبول المندوب حتى تجهيز الطلب للتوصيل (Sprint 4 يغطي ما قبل `SHOPPING` فقط — التوصيل المالي في Sprint 6).

---

## 2. المخرجات المطلوبة

### 2.1 واجهة المندوب (Courier UI)
- شاشة حالة المندوب: **Online / Offline**.
- شاشة حالة النشاط: **Available / Busy**.
- قائمة الطلبات المتاحة (Polling).
- شاشة تفاصيل الطلب (Order details).
- أزرار التحديث الانتقالي (Transitions).

### 2.2 الخادم (Server)
- **Polling** endpoint: `/api/courier/available-orders` كل 10 ثوانٍ.
- **Assignment Timeout:** إذا لم يقبل المندوب خلال مدة محددة → يُعاد الطلب للمسبح.
- **Atomic Accept:** نقطة نهاية واحدة ذرّية (`/api/courier/orders/[id]/accept`) — باستخدام SQL Transaction + Row Lock.
- **State Machine** للطلبات: من `PENDING` إلى `SHOPPING`.
- **OrderEvents:** كل انتقال يُسجَّل في جدول `OrderEvent`.
- **Retry safety + Idempotency:** كل نقطة نهاية `POST` تقبل `Idempotency-Key`.

---

## 3. مسار الحالات (State Machine)

```
PENDING
   ↓ (system: يبدأ البحث عن مندوب)
SEARCHING_COURIER
   ↓ (courier accepts — atomic)
COURIER_ASSIGNED  (نفس اللحظة — تم القبول)
   ↓ (courier starts moving)
GOING_TO_STORE
   ↓ (courier arrived at store)
SHOPPING  ← نهاية Sprint 4
```

**اختبار التزامن (Atomic Concurrency):**
- Two couriers accept simultaneously.
- النتيجة المتوقعة: **Only one wins** — الآخر يتلقى 409 Conflict.

---

## 4. الملفات التي سننشئها / نعدّلها

### جديد
- `app/(courier)/page.tsx` — لوحة تحكم المندوب (Online/Offline, Available/Busy).
- `app/(courier)/orders/page.tsx` — قائمة الطلبات المتاحة (Polling).
- `app/(courier)/orders/[id]/page.tsx` — تفاصيل الطلب + أزرار Transitions.
- `app/api/courier/status/route.ts` — تحديث حالة المندوب (Online/Offline, Available/Busy).
- `app/api/courier/available-orders/route.ts` — Polling: قائمة الطلبات المتاحة.
- `app/api/courier/orders/[id]/accept/route.ts` — **Atomic Accept** (نقطة نهاية حاسمة).
- `app/api/courier/orders/[id]/transition/route.ts` — انتقال حالة (مع Idempotency).
- `lib/services/courier-service.ts` — منطق اختيار/تعيين/قبول المندوب.
- `lib/state-machine.ts` (توسعة) — إضافة حالات Sprint 4 إذا لم تكن موجودة.
- `prisma/schema.prisma` (تعديل) — إضافة `OrderEvent` إن لم يكن موجوداً.

### معدّل
- `lib/idempotency.ts` — تطبيق على نقاط نهاية Sprint 4.

---

## 5. ما **لن** نفعله في هذا Sprint

- ❌ Alternatives / Weighted Items (Sprint 5).
- ❌ Price-change approval (Sprint 5).
- ❌ Delivery, Settlement, Ledger entries (Sprint 6).
- ❌ Live Courier Map / GPS (خارج MVP).
- ❌ Pusher / WebSockets — **Polling فقط** (10 ثوانٍ).
- ❌ Real-time Inventory (خارج MVP).
- ❌ تعديلات على Admin UI (Sprint 7).

---

## 6. قواعد صارمة (من CLAUDE.md + الوثيقة)

1. **TypeScript strict** — لا `any` بلا سبب موثق.
2. **Zod** لكل input خارجي.
3. **Role check** على Server: فقط `COURIER` يمكنه استدعاء `/api/courier/*`.
4. **Transaction** في Atomic Accept (Prisma `$transaction` + row lock).
5. **Idempotency-Key** مطلوب في كل POST حساس.
6. **لا secrets في الكود**.
7. **State Machine** وحده يقرر الانتقالات — لا تحديث مباشر في الـ DB.
8. **OrderEvent** يُسجَّل في كل انتقال.
9. **لا `couriers.accept()` متعدد** بدون حماية ذرّية.
10. **موبايل أولاً** — أزرار بحد أدنى 48px (من UI Rules).

---

## 7. معايير "Sprint Done"

قبل اعتبار Sprint 4 مكتمل، يجب:

- [ ] اختبار وحدوي للـ Atomic Accept: مندوبان يقبلان → واحد فقط يفوز.
- [ ] اختبار State Machine: كل transition مُسجَّل كـ OrderEvent.
- [ ] اختبار Polling: المندوب Online يرى الطلبات خلال ≤ 11 ثانية.
- [ ] اختبار Assignment Timeout: رفض/تجاوز مدة → يُعاد الطلب.
- [ ] `npx tsc --noEmit` ينجح بدون أخطاء.
- [ ] `npm run build` ينجح بدون أخطاء.
- [ ] CodeRabbit يعلّق على PR بدون "parsing errors".

---

## 8. الترتيب المقترح للتنفيذ

1. إضافة `OrderEvent` للـ Prisma schema + migration.
2. إنشاء `lib/services/courier-service.ts` (assignment + accept logic).
3. API: `available-orders` (Polling) + `accept` (Atomic).
4. API: `transition` (مع Idempotency).
5. واجهة Courier: الحالة + قائمة + تفاصيل.
6. اختبارات التزامن (Atomic Accept).
7. PR + مراجعة CodeRabbit.

---

**تاريخ البدء:** Sprint 4 (الحالي)
**المالك:** ghaithmoa84-cyber
**الفرع:** `feature/sprint-4-courier`
