---
description: "قبل كل رفع/ـ PR — شغّل tsc + build + lint كحارس نهائي. لا ترفع إذا فشلت أي خطوة."
agent: code
---

# Pre-flight Gate (قبل الرفع)

> هذا الأمر يُنفّذ **قبل أي رفع أو فتح PR** كبوابة أولى للأخطاء. لا تتقدّم للخطوة التالية إذا فشلت.

## 1. فحص الأنواع
```bash
npx tsc --noEmit
```
متطلبات:
- الخروج بكود 0.
- لا أخطاء TypeScript.
- لا `@ts-ignore` غير موثّق.

🔴 إذا فشلت: أصلحها (لا `any`، لا `@ts-ignore` غير موثّق) ثم أعد.

## 2. البناء
```bash
npm run build
```
🔴 إذا فشل: لا تنفّذ دمج إذا فشل البناء.

## 3. الـ Lint
```bash
npm run lint
```
🔴 إذا وجدت مشاكل ESLint: أصلحها.

## 4. Done Criteria (اقرأ Sprint 4 Brief §7)
اقرأ `Sprint 4 Brief.md` وتأكد من:
- [ ] اختبار Atomic Accept: مندوبان يقبلان → واحد فقط يفوز، الآخر يتلقى 409.
- [ ] كل transition مسجّل كـ OrderEvent.
- [ ] Polling: المندوب Online يرى الطلبات خلال ≤ 11 ثانية.
- [ ] Assignment Timeout: رفض/تجاوز المدة → يُعاد الطلب للـ pool.
- [ ] CodeRabbit يعلّق على PR بدون parsing errors.

## 5. انتقل للخطوة التالية
بعد نجاح كل الخطوات أعلاه → استدعِ **`/code-review`** لتفعيل دورة المراجعة الثنائية.
