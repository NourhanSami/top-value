# 🚀 البدء السريع - Quick Start

## 📋 المتطلبات

- Node.js 18+ 
- npm أو yarn أو pnpm

## ⚡ التشغيل السريع

### 1. تثبيت المكتبات

```bash
npm install
```

### 2. تشغيل المشروع

```bash
npm run dev
```

المشروع سيعمل على: `http://localhost:5173`

### 3. تسجيل الدخول

**بيانات الدخول الافتراضية:**
- البريد الإلكتروني: `admin@example.com`
- كلمة المرور: `password`

---

## 📁 هيكل المشروع المبسط

```
Frontend/
├── src/
│   ├── pages/              # الصفحات
│   │   ├── Dashboard.tsx   # لوحة التحكم ✅
│   │   ├── POS.tsx        # نقطة البيع ✅
│   │   ├── Products.tsx   # المنتجات ✅
│   │   └── Login.tsx      # تسجيل الدخول ✅
│   ├── components/
│   │   ├── layout/        # التخطيط (Sidebar, Header)
│   │   └── ui/            # مكونات UI
│   ├── lib/
│   │   ├── api.ts        # إعدادات API
│   │   └── utils.ts      # دوال مساعدة
│   └── types/            # أنواع TypeScript
├── tailwind.config.js    # إعدادات Tailwind
└── vite.config.ts       # إعدادات Vite
```

---

## 🎨 نظام الألوان السريع

```jsx
// في المكونات استخدم:
className="bg-primary text-primary-foreground"    // أزرق داكن
className="bg-success text-success-foreground"    // أخضر
className="bg-warning text-warning-foreground"    // برتقالي
className="bg-destructive text-destructive-foreground" // أحمر
className="bg-info text-info-foreground"          // سماوي
```

---

## 🔧 إعداد الـ API

### الطريقة الأولى: localStorage
```javascript
localStorage.setItem('api_base_url', 'http://localhost:8002/api')
```

### الطريقة الثانية: ملف .env
```bash
# انسخ .env.example إلى .env
cp .env.example .env

# ثم عدل:
VITE_API_BASE_URL=http://localhost:8002/api
```

---

## 📱 الصفحات المتاحة

| المسار | الصفحة | الحالة |
|--------|--------|--------|
| `/login` | تسجيل الدخول | ✅ كامل |
| `/` | لوحة التحكم | ✅ كامل |
| `/pos` | نقطة البيع | ✅ كامل |
| `/products` | المنتجات | ✅ كامل |
| `/customers` | العملاء | 🔄 قيد التطوير |
| `/warehouses` | المخازن | 🔄 قيد التطوير |

---

## 🎯 أمثلة سريعة

### إضافة صفحة جديدة

1. **إنشاء الصفحة:**
```tsx
// src/pages/MyPage.tsx
export default function MyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">صفحتي</h1>
    </div>
  )
}
```

2. **إضافة الـ Route:**
```tsx
// src/App.tsx
import MyPage from "./pages/MyPage"

// في Routes:
<Route path="/my-page" element={<MyPage />} />
```

3. **إضافة في Sidebar:**
```tsx
// src/components/layout/Sidebar.tsx
{
  label: "صفحتي",
  icon: YourIcon,
  path: "/my-page",
}
```

### استخدام API

```tsx
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ["myData"],
    queryFn: async () => {
      const response = await api.get("/endpoint")
      return response.data
    },
  })

  if (isLoading) return <div>جاري التحميل...</div>
  
  return <div>{JSON.stringify(data)}</div>
}
```

### إنشاء مكون UI

```tsx
import { cn } from "@/lib/utils"

interface MyComponentProps {
  title: string
  className?: string
}

export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("flat-card p-6", className)}>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )
}
```

---

## 🐛 حل المشاكل الشائعة

### المشروع لا يعمل

```bash
# احذف node_modules وأعد التثبيت
rm -rf node_modules
npm install
npm run dev
```

### خطأ في Path Aliases (@/...)

تأكد من:
1. `tsconfig.app.json` يحتوي على:
```json
"paths": {
  "@/*": ["./src/*"]
}
```

2. `vite.config.ts` يحتوي على:
```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### API لا يعمل

1. تأكد من تشغيل الباكند على `http://localhost:8002`
2. تأكد من وجود CORS في الباكند
3. افتح Console في المتصفح وتحقق من الأخطاء

---

## 📚 موارد إضافية

- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com)
- [TanStack Query](https://tanstack.com/query)

---

## 💡 نصائح مهمة

1. **RTL:** النظام بالكامل RTL، لا تنسى `direction: rtl`
2. **الخط:** استخدم `font-cairo` class
3. **الألوان:** استخدم المتغيرات المخصصة
4. **المكونات:** استخدم `cn()` لدمج الـ classes
5. **API:** استخدم TanStack Query للـ caching

---

## ✅ الخطوات التالية

بعد تشغيل المشروع:

1. ✅ استكشف لوحة التحكم `/`
2. ✅ جرب نقطة البيع `/pos`
3. ✅ تصفح المنتجات `/products`
4. 🔄 ابدأ في تطوير الصفحات الأخرى
5. 🔄 أضف المزيد من المكونات

---

**🎉 مبروك! المشروع جاهز للتطوير**
