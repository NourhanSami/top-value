# 📐 هيكل المشروع الكامل

## 🗂️ البنية الشاملة

```
Frontend/
├── public/                          # الملفات الثابتة
├── src/
│   ├── components/                  # المكونات
│   │   ├── layout/                 # مكونات التخطيط
│   │   │   ├── MainLayout.tsx     # التخطيط الرئيسي ✅
│   │   │   ├── Sidebar.tsx        # القائمة الجانبية ✅
│   │   │   └── Header.tsx         # الرأس ✅
│   │   │
│   │   ├── ui/                     # مكونات UI قابلة لإعادة الاستخدام
│   │   │   ├── Button.tsx         # زر ✅
│   │   │   ├── IconBox.tsx        # صندوق أيقونة ✅
│   │   │   ├── StatCard.tsx       # بطاقة إحصائيات ✅
│   │   │   └── index.ts           # ملف تصدير ✅
│   │   │
│   │   ├── dashboard/              # مكونات لوحة التحكم
│   │   │   ├── QuickActions.tsx   # إجراءات سريعة 📝
│   │   │   ├── RecentSales.tsx    # آخر المبيعات 📝
│   │   │   └── TopProducts.tsx    # أكثر المنتجات مبيعاً 📝
│   │   │
│   │   ├── dialogs/                # نوافذ الحوار
│   │   │   ├── EditProductDialog.tsx        # تعديل منتج 📝
│   │   │   ├── EditCustomerDialog.tsx       # تعديل عميل 📝
│   │   │   ├── CompleteSaleDialog.tsx       # إتمام بيع 📝
│   │   │   ├── EditWarehouseDialog.tsx      # تعديل مخزن 📝
│   │   │   └── ...                          # 22 نافذة أخرى 📝
│   │   │
│   │   ├── print/                  # مكونات الطباعة
│   │   │   ├── InvoiceTemplate.tsx          # قالب فاتورة 📝
│   │   │   ├── BarcodeGenerator.tsx         # مولد باركود 📝
│   │   │   └── PrintControls.tsx            # عناصر تحكم الطباعة 📝
│   │   │
│   │   └── notifications/          # الإشعارات
│   │       └── NotificationDropdown.tsx     # قائمة الإشعارات 📝
│   │
│   ├── pages/                      # صفحات التطبيق
│   │   ├── Login.tsx              # تسجيل الدخول ✅
│   │   ├── Dashboard.tsx          # لوحة التحكم ✅
│   │   ├── POS.tsx                # نقطة البيع ✅
│   │   ├── Products.tsx           # المنتجات ✅
│   │   ├── Customers.tsx          # العملاء 📝
│   │   ├── Returns.tsx            # المرتجعات 📝
│   │   ├── Warehouses.tsx         # المخازن 📝
│   │   ├── DamagedItems.tsx       # الهوالك 📝
│   │   ├── PurchaseInvoices.tsx   # فواتير الشراء 📝
│   │   ├── Suppliers.tsx          # الموردين 📝
│   │   ├── Expenses.tsx           # المصروفات 📝
│   │   ├── CapitalSetup.tsx       # رأس المال 📝
│   │   ├── Reports.tsx            # التقارير 📝
│   │   ├── ActivityLogs.tsx       # سجل النشاط 📝
│   │   ├── Employees.tsx          # الموظفين 📝
│   │   ├── Users.tsx              # المستخدمين 📝
│   │   └── Settings.tsx           # الإعدادات 📝
│   │
│   ├── contexts/                   # السياقات (Contexts)
│   │   └── UserContext.tsx        # سياق المستخدم 📝
│   │
│   ├── hooks/                      # الخطافات المخصصة
│   │   ├── useAutoRefresh.ts      # تحديث تلقائي 📝
│   │   ├── use-mobile.ts          # كشف الموبايل 📝
│   │   └── use-toast.ts           # إشعارات Toast 📝
│   │
│   ├── lib/                        # المكتبات المساعدة
│   │   ├── api.ts                 # إعدادات Axios ✅
│   │   ├── utils.ts               # دوال مساعدة ✅
│   │   ├── pdfExport.ts           # تصدير PDF 📝
│   │   └── arabicUtils.ts         # أدوات عربية 📝
│   │
│   ├── types/                      # أنواع TypeScript
│   │   └── index.ts               # التعريفات الرئيسية ✅
│   │
│   ├── mobile/                     # واجهة الموبايل
│   │   ├── MobileDashboard.tsx    # لوحة تحكم الموبايل 📝
│   │   ├── MobileProducts.tsx     # منتجات الموبايل 📝
│   │   ├── MobilePOS.tsx          # نقطة بيع الموبايل 📝
│   │   └── ...                    # المزيد 📝
│   │
│   ├── App.tsx                     # المكون الرئيسي ✅
│   ├── main.tsx                    # نقطة الدخول ✅
│   └── index.css                   # الأنماط الرئيسية ✅
│
├── .env.example                    # مثال متغيرات البيئة ✅
├── .gitignore                      # ملفات Git المتجاهلة ✅
├── tailwind.config.js              # إعدادات Tailwind ✅
├── postcss.config.js               # إعدادات PostCSS ✅
├── vite.config.ts                  # إعدادات Vite ✅
├── tsconfig.json                   # إعدادات TypeScript ✅
├── tsconfig.app.json               # إعدادات TypeScript للتطبيق ✅
├── tsconfig.node.json              # إعدادات TypeScript لـ Node ✅
├── package.json                    # معلومات المشروع ✅
├── README.md                       # الوثائق الرئيسية ✅
├── QUICK_START.md                  # دليل البدء السريع ✅
└── PROJECT_STRUCTURE.md            # هذا الملف ✅
```

---

## 📊 الإحصائيات

### ✅ المكتمل (11 ملف)

1. **Layout Components (3)**
   - MainLayout.tsx
   - Sidebar.tsx
   - Header.tsx

2. **UI Components (3)**
   - Button.tsx
   - IconBox.tsx
   - StatCard.tsx

3. **Pages (4)**
   - Login.tsx
   - Dashboard.tsx
   - POS.tsx
   - Products.tsx

4. **Utilities (4)**
   - api.ts
   - utils.ts
   - types/index.ts
   - index.css

5. **Configuration (7)**
   - tailwind.config.js
   - postcss.config.js
   - vite.config.ts
   - tsconfig files (3)
   - .env.example

### 📝 قيد التطوير (33+ ملف)

- **Pages:** 12 صفحة متبقية
- **Dialogs:** 26 نافذة حوار
- **Components:** 10+ مكونات
- **Hooks:** 3 خطافات مخصصة
- **Mobile:** 5 صفحات موبايل

---

## 🎯 الأولويات

### المرحلة 1: الصفحات الرئيسية ⏳
- [x] Dashboard
- [x] POS
- [x] Products
- [ ] Customers
- [ ] Warehouses

### المرحلة 2: المكونات الأساسية
- [ ] EditProductDialog
- [ ] CompleteSaleDialog
- [ ] InvoiceTemplate
- [ ] BarcodeGenerator

### المرحلة 3: الصفحات الإضافية
- [ ] Returns
- [ ] PurchaseInvoices
- [ ] Suppliers
- [ ] Expenses

### المرحلة 4: الإدارة
- [ ] Employees
- [ ] Users
- [ ] Settings
- [ ] ActivityLogs

---

## 🔧 ملاحظات تقنية

### التقنيات المستخدمة
```json
{
  "framework": "React 18",
  "language": "TypeScript",
  "bundler": "Vite",
  "styling": "Tailwind CSS",
  "ui": "Radix UI",
  "routing": "React Router v6",
  "state": "TanStack Query",
  "http": "Axios",
  "icons": "Lucide React"
}
```

### الأنماط والاتفاقيات

1. **تسمية الملفات:**
   - Components: `PascalCase.tsx`
   - Utilities: `camelCase.ts`
   - Types: `index.ts` أو `types.ts`

2. **تنظيم الملفات:**
   - كل صفحة في ملف منفصل
   - المكونات المشتركة في `/components/ui`
   - المكونات الخاصة بصفحة في مجلدها

3. **الـ Imports:**
   - استخدام `@/` للمسارات المطلقة
   - ترتيب: React → Libraries → Local

---

## 📦 الحزم الرئيسية

### Production Dependencies
```
react, react-dom                 # الإطار الأساسي
react-router-dom                 # التوجيه
@tanstack/react-query            # إدارة الحالة
axios                            # HTTP Client
tailwindcss                      # التصميم
@radix-ui/*                      # مكونات UI
lucide-react                     # الأيقونات
jsbarcode                        # توليد الباركود
class-variance-authority         # إدارة الـ variants
clsx, tailwind-merge             # دمج classes
```

### Development Dependencies
```
typescript                       # اللغة
vite                            # أداة البناء
@vitejs/plugin-react            # React plugin
eslint                          # فحص الكود
@types/*                        # تعريفات TypeScript
```

---

## 🎨 نظام التصميم

### الألوان
```css
Primary: #203F66    /* أزرق داكن */
Success: #1A9E5C    /* أخضر */
Warning: #F59A0A    /* برتقالي */
Info: #0AACDC       /* سماوي */
Destructive: #E84040 /* أحمر */
```

### المسافات
```
sm: 12px
md: 16px
lg: 24px
xl: 32px
```

### الخطوط
```
Family: Cairo (Google Fonts)
Sizes: 12px, 14px, 16px, 18px, 24px, 32px
Weights: 400, 500, 600, 700
```

---

## 🚀 الأوامر المتاحة

```bash
# التطوير
npm run dev           # تشغيل بيئة التطوير

# البناء
npm run build         # بناء للإنتاج
npm run preview       # معاينة البناء

# الجودة
npm run lint          # فحص الكود
```

---

## 📝 TODO List

### عاجل 🔴
- [ ] إكمال صفحة العملاء
- [ ] إضافة نوافذ الحوار الرئيسية
- [ ] نظام الطباعة

### متوسط الأولوية 🟡
- [ ] صفحة المخازن
- [ ] صفحة المرتجعات
- [ ] Hooks مخصصة

### غير عاجل 🟢
- [ ] واجهة الموبايل
- [ ] التقارير المتقدمة
- [ ] الإعدادات الكاملة

---

**آخر تحديث:** 2024
**الإصدار:** 1.0.0
**الحالة:** قيد التطوير النشط 🚧
