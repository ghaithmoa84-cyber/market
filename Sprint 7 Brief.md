Sprint 7 Brief — Full Admin
الهدف

إكمان لوحة التحكم الإدارية مع ميزات المراقبة المباشرة والتدخل والتحليلات.

§1 — المهام المطلوبة

1.1 Dashboard — لوحة إحصائيات محسّنة
- Today's Orders: عدد الطلبات اليوم
- Active Orders: عدد الطلبات النشطة (ليس CONFIRMED/REJECTED)
- Revenue: إجمالي الإيرادات اليوم (Yalla Share)
- Pending Settlements: عدد التسويات المعلقة

1.2 Live Orders — مراقبة مباشرة
- صفحة app/(admin)/orders/page.tsx
- جدول بكل الطلبات مع:
  - رقم الطلب
  - العميل
  - المندوب
  - المتاجر
  - الحالة
  - المبلغ الإجمالي
  - الوقت
- فلتر حسب الحالة
- تفاصيل كاملة عند النقر على طلب

1.3 Admin Intervention — تدخل إداري
- PATCH /api/admin/orders/[id]/status
- Admin يمكنه تغيير حالة الطلب يدوياً (مع تسجيل Event)
- تأكيد يدوي قبل التغيير
- يُسجل OrderEvent: ADMIN_INTERVENTION

1.4 Search Miss Report
- صفحة app/(admin)/search-miss/page.tsx
- عرض عمليات البحث التي لم تعطي نتائج (من SearchLog)
- إحصائيات: كلمة البحث، عدد المرات، آخر بحث
- عرض المنتجات المفقودة المحتملة

1.5 Courier Management كامل
- صفحة app/(admin)/couriers/page.tsx
- قائمة المندوبين مع:
  - الاسم، الهاتف، الحالة
  - عدد الطلبات المكتملة
  - التقييم
- تفعيل/تعطيل مندوب (isActive)
- إضافة/تعديل/حذف مندوب

1.6 Store Management كامل
- صفحة app/(admin)/stores/page.tsx
- قائمة المتاجر مع:
  - الاسم، العنوان، الحالة
  - عدد المنتجات
  - ساعات العمل
- تفعيل/تعطيل متجر (isActive)
- إضافة/تعديل/حذف متجر
- إدارة ساعات العمل

1.7 Reports
- صفحة app/(admin)/reports/page.tsx
- تقرير المبيعات حسب الفترة
- تقرير المندوبين (أداء كل مندوب)
- تقرير المتاجر (أداء كل متجر)
- تصدير CSV

§2 — Schema المطلوب تعديله
- CourierProfile: إضافة rating, isActive
- Store: إضافة isActive
- SearchLog: إضافة hasResults (boolean)

§3 — API Routes المطلوبة
- GET /api/admin/dashboard — Dashboard stats
- GET /api/admin/orders — Live Orders list
- GET /api/admin/orders/[id] — Order details
- PATCH /api/admin/orders/[id]/status — Admin intervention
- GET /api/admin/search-miss — Search miss report
- GET /api/admin/couriers — Courier list
- POST /api/admin/couriers — Create courier
- PATCH /api/admin/couriers/[id] — Update courier
- DELETE /api/admin/couriers/[id] — Delete courier
- GET /api/admin/stores — Store list
- POST /api/admin/stores — Create store
- PATCH /api/admin/stores/[id] — Update store
- DELETE /api/admin/stores/[id] — Delete store
- GET /api/admin/reports/sales — Sales report
- GET /api/admin/reports/couriers — Couriers report
- GET /api/admin/reports/stores — Stores report

§4 — قواعد صارمة
- Admin Intervention يُسجل Event دائماً
- لا حذف منطقي لأي كيان — فقط isActive
- كل API route يتحقق من ADMIN role
- Polling كل 10 ثوانٍ للـ Live Orders
- RTL كامل في كل الصفحات

§5 — Done Criteria
#	المعيار	الاختبار
1	Dashboard يعرض 4 إحصائيات صحيحة	يدوي
2	Live Orders يعرض كل الطلبات مع فلتر	يدوي
3	Admin Intervention يغير الحالة مع Event	يدوي
4	Search Miss Report يعرض عمليات البحث الفاشلة	يدوي
5	Courier Management يعرض قائمة المندوبين	يدوي
6	Courier Management يمكن تفعيل/تعطيل مندوب	يدوي
7	Store Management يعرض قائمة المتاجر	يدوي
8	Store Management يمكن تفعيل/تعطيل متجر	يدوي
9	Reports يعرض تقارير المبيعات والمندوبين والمتاجر	يدوي
10	tsc --noEmit + build + lint نجاح	آلي
11	CodeRabbit review نظيف	آلي
