# 🏪 نظام إدارة المخازن ونقاط البيع - Frontend

## 📋 نظرة عامة

نظام متكامل لإدارة المخازن ونقاط البيع مبني باستخدام React 18 + TypeScript مع Vite.

## 🚀 التقنيات المستخدمة

- **React 18** - مكتبة بناء واجهات المستخدم
- **TypeScript** - لغة البرمجة
- **Vite** - أداة البناء السريعة
- **Tailwind CSS** - إطار عمل التصميم
- **Radix UI** - مكونات UI قابلة للوصول
- **React Router DOM v6** - التوجيه
- **TanStack Query** - إدارة حالة البيانات
- **Axios** - HTTP Client
- **Lucide React** - الأيقونات

## 📦 التثبيت

```bash
# تثبيت المكتبات
npm install

# تشغيل المشروع في وضع التطوير
npm run dev

# بناء المشروع للإنتاج
npm run build

# معاينة البناء
npm run preview
```

## 🎨 نظام الألوان

### الألوان الأساسية

```css
--background: #F3F4F7     /* خلفية الصفحة */
--foreground: #283347     /* النصوص الرئيسية */
--primary: #203F66        /* اللون الرئيسي - أزرق داكن */
--card: #FFFFFF           /* خلفية البطاقات */
```

### ألوان الحالات

```css
--success: #1A9E5C        /* أخضر - نجاح */
--warning: #F59A0A        /* برتقالي - تحذير */
--info: #0AACDC           /* سماوي - معلومات */
--destructive: #E84040    /* أحمر - خطر */
```

## 📁 هيكل المشروع

```
src/
├── components/
│   ├── layout/           # MainLayout, Sidebar, Header
│   └── ui/               # مكونات UI قابلة لإعادة الاستخدام
├── pages/                # صفحات التطبيق
│   ├── Dashboard.tsx     # لوحة التحكم
│   ├── POS.tsx          # نقطة البيع
│   ├── Products.tsx     # إدارة المنتجات
│   └── Login.tsx        # تسجيل الدخول
├── lib/
│   ├── api.ts           # إعدادات Axios
│   └── utils.ts         # دوال مساعدة
├── types/               # TypeScript types
├── App.tsx              # المكون الرئيسي
└── main.tsx            # نقطة الدخول
```

## 🔐 المصادقة

يستخدم النظام Laravel Sanctum للمصادقة:

```typescript
// تخزين التوكن
localStorage.setItem('token', token)

// الخروج
localStorage.removeItem('token')
```

## 🎯 الصفحات الرئيسية

### 1. لوحة التحكم `/`
- بطاقات إحصائية (المبيعات، الطلبات، المنتجات، العملاء)
- آخر المبيعات
- إجراءات سريعة
- المنتجات الأكثر مبيعاً

### 2. نقطة البيع `/pos`
- بحث في المنتجات
- تصفية حسب الفئة
- إضافة للسلة
- إتمام عملية البيع

### 3. المنتجات `/products`
- عرض جدول/بطاقات
- تصفية حسب حالة المخزون
- شارات الصلاحية
- إدارة المنتجات

## 🎨 المكونات المخصصة

### StatCard
```tsx
<StatCard
  title="إجمالي المبيعات"
  value="125,450 ر.س"
  icon={Wallet}
  variant="primary"
  change={{ value: 15, label: "من الأمس" }}
/>
```

### IconBox
```tsx
<IconBox
  icon={Package}
  variant="success"
  size="md"
/>
```

## 🌐 اتصال الـ API

الـ Base URL الافتراضي: `http://localhost:8002/api`

يمكن تغييره من localStorage:
```typescript
localStorage.setItem('api_base_url', 'http://your-api-url/api')
```

## 📱 التصميم المتجاوب

- **موبايل:** `< 640px` - عمود واحد
- **تابلت:** `640px - 1024px` - عمودين
- **ديسكتوب:** `> 1024px` - التصميم الكامل

## 🎭 الحركات والتأثيرات

```css
/* تأثير ظهور */
.animate-fade-in

/* تأثير رفع عند Hover */
.hover-lift

/* بطاقة مسطحة */
.flat-card
```

## 🔧 إعدادات إضافية

### Tailwind Config
ملف `tailwind.config.js` يحتوي على:
- ألوان مخصصة
- ظلال مسطحة
- حركات مخصصة

### TypeScript Path Aliases
```json
"paths": {
  "@/*": ["./src/*"]
}
```

## 📝 ملاحظات مهمة

1. **الاتجاه:** النظام بالكامل RTL (من اليمين لليسار)
2. **الخط:** Cairo من Google Fonts
3. **التحديث التلقائي:** كل 5 ثواني في لوحة التحكم
4. **الصلاحيات:** يتم التحكم بها من خلال دور المستخدم

## 🛠️ التطوير

### إضافة صفحة جديدة

1. إنشاء الملف في `/src/pages/YourPage.tsx`
2. إضافة الـ Route في `App.tsx`
3. إضافة الرابط في `Sidebar.tsx`

### إضافة مكون UI

1. إنشاء الملف في `/src/components/ui/YourComponent.tsx`
2. استخدام `cn()` للـ className
3. استخدام Tailwind للتصميم

## 📞 الدعم

للمساعدة والدعم، يرجى الرجوع إلى ملف `PROJECT_DOCUMENTATION.md`

## 📄 الترخيص

© 2024 نظام إدارة المخازن ونقاط البيع
