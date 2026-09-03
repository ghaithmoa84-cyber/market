# Sprint 2 Brief — Products & Search
## Yalla Market — يلا ماركت

**المرجع الأعلى:** MVP Technical Specification V1.1
**لا تنفذ أي شيء خارج هذا الملف**

---

## الهدف

العميل يجد المنتجات ويقارنها:
- استعراض المنتجات
- البحث عن المنتجات
- مقارنة الأسعار بين المتاجر
- تصفح الفئات
- عرض حالة المتجر (مفتوح/مغلق)

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
│   │   ├── page.tsx              (Home)
│   │   ├── search/
│   │   │   └── page.tsx          (Search Page)
│   │   ├── products/
│   │   │   └── [id]/
│   │   │       └── page.tsx      (Product Page)
│   │   ├── stores/
│   │   │   └── [id]/
│   │   │       └── page.tsx      (Store Page)
│   │   └── categories/
│   │       ├── page.tsx          (Categories List)
│   │       └── [id]/
│   │           └── page.tsx      (Category Browse)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   └── customer/
│       ├── ProductCard.tsx
│       ├── StoreCard.tsx
│       └── SearchBar.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── config.ts
│   ├── services/
│   │   ├── product-service.ts
│   │   └── search-service.ts
│   └── validations/
│       └── search.ts
└── prisma/
    └── schema.prisma               (SearchLog model already exists)
```

---

## Prisma Models المطلوبة في هذا Sprint

```prisma
model SearchLog {
  id           String   @id @default(cuid())
  query        String
  resultsCount Int
  foundMatch   Boolean
  userId       String?
  createdAt    DateTime @default(now())

  @@index([foundMatch, createdAt])
}
```

**قاعدة مهمة:** SearchLog Model موجود بالفعل في Prisma Schema من Sprint 1. لا داعي لإنشائه.

---

## الوظائف المطلوبة في هذا Sprint

**Customer UI**
- Home Page: عرض الفئات الرئيسية والمنتجات المميزة
- Categories Page: قائمة الفئات النشطة
- Category Browse: عرض المنتجات داخل فئة محددة
- Search Page: بحث عن منتجات مع تسجيل SearchLog
- Product Page: عرض تفاصيل المنتج مع:
  - السعر الحالي
  - اسم المتجر
  - تاريخ آخر تحديث للسعر (Price Freshness)
  - إمكانية ظهور المنتج في متاجر متعددة
- Store Page: عرض تفاصيل المتجر مع:
  - معلومات المتجر
  - ساعات العمل
  - المنتجات المتوفرة
  - منطق فتح/إغلاق المتجر (Open/Closed logic)

**Search**
- بحث عن المنتجات بالاسم
- عرض نتائج البحث مع:
  - اسم المنتج
  - السعر
  - المتجر
  - تاريخ آخر تحديث للسعر
- تسجيل SearchLog لكل عملية بحث:
  - query: نص البحث
  - resultsCount: عدد النتائج
  - foundMatch: هل وجدت نتائج مطابقة
  - userId: معرف المستخدم (إن وجد)

**Price Freshness**
- كل منتج يظهر للعميل يعرض:
  - السعر الحالي
  - المتجر
  - تاريخ آخر تحديث للسعر (StoreProduct.updatedAt)

**Open/Closed Logic**
- المتاجر المغلقة لا تظهر كخيار للطلب
- منطق فتح/إغلاق يعتمد على:
  - StoreHours
  - اليوم الحالي
  - الوقت الحالي

---

## ما هو ممنوع في هذا Sprint

```
❌ Cart
❌ Orders
❌ Order Creation
❌ Courier UI
❌ Courier Assignment
❌ Pricing Engine (Delivery Fee calculation)
❌ Financial Ledger
❌ Settlement
❌ Notifications
❌ Polling
❌ PWA
❌ Admin Panel (عدا ما تم في Sprint 1)
❌ أي Feature من Sprint 3 أو أبعد
```

---

## قواعد صارمة

```
✅ TypeScript strict — لا any بلا سبب موثق
✅ Zod لكل input خارجي
✅ Role check على Server في كل API
✅ Server هو مصدر الحقيقة للأسعار
✅ كل عملية بحث تسجل SearchLog
✅ كل منتج يعرض Price + Store + Price Freshness
✅ المتاجر المغلقة لا يمكن اختيارها للطلب
✅ لا تعرض Prisma errors للمستخدم
✅ RTL كامل
✅ Noto Sans Arabic
✅ أزرار بحد أدنى 48px
```

---

## Done Criteria

يجب أن تنجح جميع البنود التالية قبل اعتبار Sprint 2 مكتملاً:

```
☐ Home Page تعمل وتظهر الفئات والمنتجات
☐ Categories Page تعرض قائمة الفئات النشطة
☐ Category Browse تعرض منتجات الفئة المحددة
☐ Search Page تبحث عن المنتجات بالاسم
☐ SearchLog يُسجَّل في كل عملية بحث (query, resultsCount, foundMatch, userId)
☐ كل منتج يعرض: السعر، المتجر، تاريخ آخر تحديث للسعر
☐ Product Page تعرض تفاصيل المنتج من متاجر متعددة
☐ Store Page تعرض تفاصيل المتجر
☐ Open/Closed logic يعمل بشكل صحيح
☐ المتاجر المغلقة لا تظهر كخيار للطلب
☐ الأسعار تختلف بشكل صحيح حسب المتجر
☐ TypeScript build يمر بلا أخطاء
☐ الواجهة RTL كاملة
☐ الصفحات تعمل على موبايل
☐ Mobile UI works
```

---

## الاختبارات المطلوبة

**Functional Tests**
- البحث عن منتج موجود ← يظهر في النتائج مع السعر والمتجر وتاريخ التحديث
- البحث عن منتج غير موجود ← SearchLog يُسجَّل مع foundMatch = false
- البحث عن مستخدم مسجل ← SearchLog يُسجَّل مع userId
- منتج يظهر في متجرين بأسعار مختلفة ← يعرض السعر الصحيح لكل متجر
- متجر مغلق ← لا يمكن اختياره للطلب
- متجر مفتوح ← يمكن اختياره للطلب
- فئة تحتوي على منتجات ← تعرض المنتجات
- فئة فارغة ← تعرض Empty State

**SearchLog Tests**
- كل عملية بحث تنشئ سجل في SearchLog
- query يُحفظ بشكل صحيح
- resultsCount يُحفظ بشكل صحيح
- foundMatch يُحسب بشكل صحيح
- userId يُحفظ للمستخدمين المسجلين

**UI Tests**
- RTL يعمل بشكل صحيح
- الأزرار بحد أدنى 48px
- الصفحات تعمل على موبايل
- Empty States تعرض رسالة واضحة

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
- افحص الملفات الموجودة من Sprint 1
- افحص Prisma schema (SearchLog model موجود بالفعل)
- لا تعد إنشاء شيء موجود
- لا تكسر الوظائف الموجودة في Sprint 1

بعد التنفيذ:
1. شغّل TypeScript checks
2. شغّل build
3. أصلح الأخطاء
4. قدم قائمة بالملفات التي تغيرت
5. قدم قائمة Done Criteria مع ✅ أو ❌ لكل بند
6. لا تقل إن Sprint مكتمل إذا فشل أي بند

---

**Simple Now — Extensible Later — Data Driven**
