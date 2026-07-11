# 🚀 Quick Start Guide

## التثبيت السريع

### 1. تثبيت الحزم
```bash
cd Backend
npm install
```

### 2. إعداد قاعدة البيانات

#### إنشاء قاعدة البيانات
```sql
CREATE DATABASE stock_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### تكوين الاتصال
```bash
# انسخ ملف البيئة
cp .env.example .env

# عدل DATABASE_URL في .env
DATABASE_URL="mysql://root:your_password@localhost:3306/stock_manager_db"
```

### 3. تشغيل Migrations
```bash
# توليد Prisma Client
npm run prisma:generate

# تشغيل Migrations
npm run prisma:migrate
```

### 4. تشغيل السيرفر
```bash
npm run dev
```

✅ السيرفر يعمل الآن على: `http://localhost:8000`

## اختبار API

### Health Check
```bash
curl http://localhost:8000/health
```

### API Info
```bash
curl http://localhost:8000/api
```

## Prisma Studio (Database GUI)

لفتح واجهة إدارة قاعدة البيانات:
```bash
npm run prisma:studio
```

سيفتح على: `http://localhost:5555`

## الأوامر المهمة

| الأمر | الوصف |
|------|------|
| `npm run dev` | تشغيل السيرفر في وضع التطوير |
| `npm run build` | بناء المشروع للإنتاج |
| `npm start` | تشغيل النسخة الإنتاجية |
| `npm run prisma:studio` | فتح Prisma Studio |
| `npm run prisma:migrate` | تطبيق Migrations |
| `npm run prisma:generate` | توليد Prisma Client |

## البنية الأساسية

```
GET  /health              - حالة السيرفر
GET  /api                 - معلومات API
POST /api/auth/login     - تسجيل الدخول
GET  /api/products       - قائمة المنتجات
GET  /api/sales          - قائمة المبيعات
...
```

## المشاكل الشائعة

### مشكلة الاتصال بقاعدة البيانات
```bash
# تأكد من تشغيل MySQL
# تأكد من صحة بيانات الاتصال في .env
```

### مشكلة Prisma Client
```bash
npm run prisma:generate
```

### مشكلة Port مستخدم
```bash
# غير PORT في .env
PORT=8001
```
