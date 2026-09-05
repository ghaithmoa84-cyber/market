# مهارة CodeRabbit Review — المراجعة الثنائية لمشروع Yalla Market

هذه المهارة تُنظّم دورة مراجعة CodeRabbit المزدوجة (VS Code Extension + GitHub PR) بالتكامل التام مع Kilo Code، CLAUDE.md، و Sprint Brief.

## متى تُستخدم؟

تُستثار تلقائياً بعد كل مهمة تنفّذها Kilo — أو عندما تطلب `/code-review`.

## الخطة المتكاملة للتنفيذ

### الخطوة 1 — CodeRabbit كـ "شبكة أمان أولية" في VS Code

**الإعداد المطلوب:**
- ثبّت إضافة **CodeRabbit** في VS Code.
- اربطها بحساب GitHub الخاص بمستودع `ghaithmoa84-cyber/market`.

**كيف تتعامل معها؟**
- راقب التعليقات Inline **أثناء الكتابة**.
- ركّز على: `any` غير المصرّح به، غياب Zod validation، غياب Role check.
- استخدم `@coderabbitai fix` أو قل لي "أصلح ملاحظة CodeRabbit".

**الفائدة:** تقليل التعليقات على الـ PR بنسبة تصل إلى 80%.

### الخطوة 2 — CodeRabbit كـ "مراجعة نهائية" على GitHub

**الإعداد في `.coderabbit.yaml`:**
- `request_changes_workflow: true` ← يطلب تغييرات على الـ Blockers.
- `language: ar` ← الملخص والتعليقات بالعربية.
- `tone_instructions` ← صرامة على القضايا الأمنية/المالية.

**كيف تتعامل معها؟**
- بعد فتح الـ PR، استخدم الأوامر في التعليقات:
  - `@coderabbitai summary`
  - `@coderabbitai review`
  - `@coderabbitai resolve`
  - `@coderabbitai explain <id>`
- اقرأ الملخص عالي المستوى.
- راجع التعليقات على مستوى السطر — التركيز على 💥 Blockers.

### الخطوة 3 — إصلاح Kilo بناءً على الملاحظات

**السير العملي:**
1. Kilo يكتب الكود في VS Code.
2. إضافة CodeRabbit تعلم تعليقات → Kilo يصلحها فوراً.
3. تشغيل `/pre-flight` (tsc + build + lint + Done Criteria).
4. إذن صريح من المستخدم → `git push` + فتح PR.
5. CodeRabbit على GitHub يراجع السياق الكامل.
6. Kilo يقرأ الملاحظات ويصلح أي Blockers.
7. كرر `@coderabbitai review` حتى تنقضي الـ Blockers.
8. `@coderabbitai resolve` لإغلاق كل التعليقات.
9. `ym-post-task-review` كبوابة أخيرة قبل الـ Merge.

### الخطوة 4 — الأوامر السريعة

| الأمر (VS Code) | الأمر (GitHub PR) | الغرض |
|---|---|---|
| `@coderabbitai review` | `@coderabbitai review` | طلب مراجعة الكود الحالي |
| `@coderabbitai fix` | — | إصلاح تلقائي للمشاكل |
| `@coderabbitai explain` | `@coderabbitai explain <id>` | شرح سبب مشكلة |
| — | `@coderabbitai summary` | إعادة عرض الملخص |
| — | `@coderabbitai resolve` | إغلاق كل التعليقات |

### الخطوة 5 — التحسين المستمر للإعدادات

بعد كل Sprint:
1. راقب أداء CodeRabbit — يلتقط الأخطاء المهمة؟ هناك ضوضاء؟
2. عدّل `.coderabbit.yaml`:
   - أضف `path_instructions` لأجزاء جديدة حساسة.
   - غيّر `tone_instructions` حسب الحاجة.
3. حدّث `CLAUDE.md` مع اكتشاف قواعد جديدة.

## معايير النجاح

| المؤشر | الهدف |
|---|---|
| اكتشاف الأخطاء المبكرة | 9/10 |
| جودة الكود في PR | 9/10 |
| عدد التعليقات غير المفيدة | منخفض |
| سرعة دمج التغييرات | سريع |
| الثقة في الكود | عالية |

## قواعد ذهبية

1. **لا تنتظر مراجعة GitHub** لتكتشف الأخطاء — استخدم إضافة VS Code كمرحلة أولى.
2. **لا تدمج** إلا بعد `@coderabbitai resolve` + اجتياز `ym-post-task-review`.
3. **استخدم `request_changes_workflow: true`** لضمان أن CodeRabbit يطلب تغييرات على الـ Blockers.
