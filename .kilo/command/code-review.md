---
description: "دورة مراجعة ثنائية مُنظمة: CodeRabbit في VS Code أولاً، ثم GitHub PR كمراجعة نهائية. يوجيه Kilo للإصلاح التلقائي."
agent: code
---
# دورة المراجعة الثنائية (VS Code + GitHub)

> استهدف هذا الأمر عندما يكون لديك تغييرات جديدة أو تريد فتح PR.

## المرحلة 1 — الشبكة الأمان في VS Code (قبل الرفع)

1. افتح الملف/الملفات التي غيّرتها في VS Code.
2. تأكد من تشغيل إضافة **CodeRabbit** (VS Code extension).
3. راقب التعليقات Inline — ركّز على:
   - 💥 `any` بدون سبب موثّق (CLAUDE.md §6).
   - 💥 عدم Zod validation (CLAUDE.md §7).
   - 💥 غياب Role check (CLAUDE.md §9 — فقط COURIER للـ `/api/courier/*`).
   - 💥 عدم استخدام Idempotency-Key في POST (Sprint 4 Brief §6.92).
4. إذا ظهرت أي ملاحظة:
   - استخدم `@coderabbitai fix` في VS Code، **أو**
   - قل: "أصلح ملاحظة CodeRabbit في `<الملف>`" — وسأصلحها بحسب CLAUDE.md + Sprint Brief.

🎯 الهدف: تصفير التعليقات في VS Code **قبل الرفع** — يقلل هذا ~80% من التعليقات على الـ PR.

## المرحلة 2 — البوابة الأمنة (Pre-flight)

قبل الرفع: استدعِ **`/pre-flight`** للتحقق من `tsc + build + lint + Done Criteria`.

## المرحلة 3 — الرفع والـ PR

1. `git add` + `commit` بـ Conventional Commits (انظر skill `github-push`).
2. `git pull --rebase origin <branch>`.
3. بعد إذن صريح من المستخدم: `git push origin <branch>`.
4. افتح Pull Request إلى `master` عبر GitHub.

## المرحلة 4 — المراجعة النهائية على GitHub

في تعليقات الـ PR، استخدم الأوامر:
| الأمر | الغرض |
|---|---|
| `@coderabbitai summary` | إعادة عرض الملخص عالي المستوى بالعربية. |
| `@coderabbitai review` | إعادة المراجعة بعد أي تعديل. |
| `@coderabbitai resolve` | إغلاق كل تعليقات CodeRabbit دفعة واحدة. |
| `@coderabbitai explain <معرف_التعليق>` | شرح سبب مشكلة بشكل مفصل. |

### تصنيف التعليقات على GitHub
- 💥 **Blocker** = انتظر Kilo يصلحها (مخالفة CLAUDE.md §11 أو Done Criteria).
  - قل: "أصلح جميع Blockers التالية من CodeRabbit: [القائمة]".
- 💡 **Suggestion / nitpick** = راقبها وقرر: تعديل أو إغلاق.

## المرحلة 5 — ما قبل الدمج

قبل الـ Merge تأكد من:
- ✅ لا توجد Blockers مفتوحة.
- ✅ `ym-post-task-review` gate مكتملة (tsc + build + lint + Done Criteria).
- ✅ @coderabbitai resolve تم استخدامه لإغلاق التعليقات.

🚫 **لا تدمج** إلا بعد اجتياز كل البوابات أعلاه وبعد إذنك الصريح.
