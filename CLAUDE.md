# Yalla Market — يلا ماركت

## ملف السياق الدائم لـKilo Code

---

## ما هو هذا المشروع؟

Yalla Market منصة محلية في القنجرة وجناتا — ريف اللاذقية، سورية.
تمكّن العملاء من البحث عن المنتجات، مقارنة الأسعار، والطلب من عدة متاجر،
ثم يقوم مندوب مستقل بالشراء والتوصيل. الدفع نقداً عند الاستلام.

---

## المراجع الأساسية (اقرأها قبل أي شيء)

| الملف                                   | الغرض                                             |
| --------------------------------------- | ------------------------------------------------- |
| `Yalla Market Finder.docx`              | رؤية المشروع، القرارات التشغيلية، النموذج المالي  |
| `MVP Technical Specification V1.1.docx` | المرجع التقني الكامل، Architecture، Schema، Rules |
| `Sprint 1 Brief.md`                     | المهام المطلوبة الآن فقط                          |

---

## القواعد الصارمة (لا استثناء)

1. اقرأ `Sprint 5 Brief.md` أولاً قبل كتابة أي كود
2. اقرأ `MVP Technical Specification V1.1.docx` للمرجعية التقنية
3. لا تنفذ أي شيء خارج نطاق Sprint 5 Brief
4. لا تغير Schema بدون شرح السبب
5. لا تضف مكتبة جديدة بدون حاجة واضحة
6. TypeScript strict — لا `any` بلا سبب موثق
7. Zod لكل input خارجي
8. Role check على Server في كل API
9. كل multi-step DB في Transaction
10. لا secrets في source code
11. Server هو مصدر الحقيقة دائماً

---

## التقنية المعتمدة

Next.js 16.x — App Router
TypeScript strict
Tailwind CSS 4.x
Prisma + PostgreSQL
Auth.js
Zod
Vercel

---

## UI Rules

RTL كامل — dir="rtl" على كل الصفحات
اللغة العربية أولاً
Noto Sans Arabic
Primary:
#1F3864
Secondary:
#2E74B5
أزرار: حد أدنى 48px
Mobile-first

---

## بعد كل تنفيذ يجب أن تفعل

1. شغّل: `npx tsc --noEmit`
2. شغّل: `npm run build`
3. أصلح كل الأخطاء
4. قدم قائمة الملفات التي تغيرت
5. قدم Done Criteria مع ✅ أو ❌ لكل بند
6. لا تقل إن العمل مكتمل إذا فشل أي بند

---

## Sprint الحالي

**Sprint 5 — Alternatives & Weighted Items**
التفاصيل الكاملة في ملف: `Sprint 5 Brief.md`

---

## قاعدة CodeRabbit — إلزامية

كل كود جديد يجب أن يمر عبر CodeRabbit قبل اعتباره مكتملاً.

الطريقة:
- كل Sprint يُبنى على فرع منفصل
- عند اكتمال Sprint يُفتح PR إلى master
- CodeRabbit يراجع تلقائياً
- لا يتم دمج PR قبل قراءة تعليقات CodeRabbit
- إذا وجد CodeRabbit مشكلة أمنية أو مالية = يجب إصلاحها قبل الدمج
- إذا وجد ملاحظة عامة = يتم تقييمها مع المسؤول
