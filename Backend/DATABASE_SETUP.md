# 🗄️ Database Setup Guide

## Prerequisites

- MySQL 8.0 or higher installed
- Node.js 18+ installed
- npm or yarn installed

## Step 1: Create MySQL Database

### Option A: Using MySQL Command Line

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE stock_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verify database created
SHOW DATABASES;

# Exit MySQL
EXIT;
```

### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your local MySQL server
3. Click on "Create New Schema" icon
4. Name: `stock_manager_db`
5. Charset: `utf8mb4`
6. Collation: `utf8mb4_unicode_ci`
7. Click "Apply"

### Option C: Using phpMyAdmin

1. Open phpMyAdmin in browser
2. Click "New" in left sidebar
3. Database name: `stock_manager_db`
4. Collation: `utf8mb4_unicode_ci`
5. Click "Create"

## Step 2: Configure Database Connection

Update the `.env` file with your MySQL credentials:

```env
DATABASE_URL="mysql://USERNAME:PASSWORD@localhost:3306/stock_manager_db"
```

**Examples:**

```env
# If no password set (default XAMPP)
DATABASE_URL="mysql://root:@localhost:3306/stock_manager_db"

# With password
DATABASE_URL="mysql://root:mypassword@localhost:3306/stock_manager_db"

# Different port (e.g., 3307)
DATABASE_URL="mysql://root:password@localhost:3307/stock_manager_db"

# Remote server
DATABASE_URL="mysql://user:pass@192.168.1.100:3306/stock_manager_db"
```

## Step 3: Generate Prisma Client

```bash
cd Backend
npm run prisma:generate
```

**Expected Output:**
```
✔ Generated Prisma Client (v6.5.0) to ./node_modules/@prisma/client
```

## Step 4: Run Database Migrations

```bash
npm run prisma:migrate
```

**What This Does:**
- Creates all 22 tables in the database
- Sets up foreign keys and indexes
- Creates default constraints

**Expected Output:**
```
Applying migration `20240101000000_init`
The following migration(s) have been applied:
migrations/
  └─ 20240101000000_init/
      └─ migration.sql
✔ Your database is now in sync with your schema.
```

## Step 5: Seed Initial Data

```bash
npm run prisma:seed
```

**What Gets Seeded:**

### Roles (4)
- مدير (Admin)
- محاسب (Accountant)
- كاشير (Cashier)
- موظف (Employee)

### Permissions (27)
- users:* (view, create, edit, delete)
- products:* (view, create, edit, delete)
- sales:* (view, create, edit, delete, refund)
- customers:* (view, create, edit, delete, approve)
- suppliers:* (view, create, edit, delete)
- inventory:* (view, create, edit, delete)
- reports:* (view)
- settings:* (view, edit)
- *:* (super admin)

### Branches (1)
- الفرع الرئيسي (Main Branch)

### Users (1)
- **Email**: admin@stockmanager.com
- **Password**: admin123
- **Role**: مدير (Admin)
- **Name**: مدير النظام

### Categories (2)
- إلكترونيات (Electronics)
- أغذية (Food)

### Expense Categories (6)
- عامة (General)
- سيارات (Vehicles)
- إيجار (Rent)
- خدمات (Services)
- رواتب (Salaries)
- أخرى (Other)

### System Settings
- company_name: Stock Manager POS
- tax_enabled: false
- tax_percentage: 0
- currency: EGP
- low_stock_threshold: 10
- loyalty_enabled: true
- loyalty_rate: 1

**Expected Output:**
```
🌱 Database seeding started...
✅ Created 4 roles
✅ Created 27 permissions
✅ Assigned permissions to roles
✅ Created main branch
✅ Created admin user
✅ Created sample categories
✅ Created expense categories
✅ Created system settings
🎉 Database seeding completed successfully!
```

## Step 6: Verify Database

### Using Prisma Studio (Recommended)

```bash
npm run prisma:studio
```

This opens a visual database browser at `http://localhost:5555`

You should see:
- ✅ 22 tables created
- ✅ 4 roles
- ✅ 27 permissions
- ✅ 1 admin user
- ✅ System settings

### Using MySQL Command Line

```bash
mysql -u root -p stock_manager_db

# Show all tables
SHOW TABLES;

# Check roles
SELECT * FROM roles;

# Check admin user
SELECT id, name, email, is_active FROM users;

# Exit
EXIT;
```

## Step 7: Test the API

Start the development server:

```bash
npm run dev
```

**Expected Output:**
```
🚀 Server running on http://localhost:8000
📝 Environment: development
🗄️  Database: Connected
```

### Test Health Endpoint

```bash
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "message": "Stock Manager POS API is running",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "environment": "development"
}
```

### Test Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@stockmanager.com",
    "password": "admin123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": {
      "id": 1,
      "name": "مدير النظام",
      "email": "admin@stockmanager.com",
      "roles": ["مدير"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Common Issues & Solutions

### Issue 1: "Access denied for user 'root'@'localhost'"

**Solution:**
```bash
# Reset MySQL root password
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'newpassword';
FLUSH PRIVILEGES;
EXIT;

# Update .env file
DATABASE_URL="mysql://root:newpassword@localhost:3306/stock_manager_db"
```

### Issue 2: "Can't connect to MySQL server"

**Solutions:**
- Check MySQL service is running
- Windows: `net start MySQL80`
- Linux: `sudo systemctl start mysql`
- macOS: `brew services start mysql`

### Issue 3: "Database does not exist"

**Solution:**
```bash
# Create database first
mysql -u root -p
CREATE DATABASE stock_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Issue 4: Port 3306 already in use

**Solution:**
```bash
# Find process using port 3306
netstat -ano | findstr :3306

# Change MySQL port in my.ini or use different port in .env
DATABASE_URL="mysql://root:password@localhost:3307/stock_manager_db"
```

### Issue 5: "Prisma Client not generated"

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
npm run prisma:generate
```

### Issue 6: Migration failed

**Solution:**
```bash
# Reset database (WARNING: Deletes all data)
npm run prisma:migrate reset

# Or manually drop and recreate
mysql -u root -p
DROP DATABASE stock_manager_db;
CREATE DATABASE stock_manager_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Run migrations again
npm run prisma:migrate
```

## Database Backup & Restore

### Backup

```bash
# Backup entire database
mysqldump -u root -p stock_manager_db > backup_$(date +%Y%m%d).sql

# Backup specific tables
mysqldump -u root -p stock_manager_db products customers sales > backup_core_$(date +%Y%m%d).sql
```

### Restore

```bash
# Restore from backup
mysql -u root -p stock_manager_db < backup_20240101.sql
```

## Database Maintenance

### Reset Database (Keep Structure)

```bash
# Delete all data but keep tables
npm run prisma:migrate reset

# Seed fresh data
npm run prisma:seed
```

### Update Schema

After modifying `prisma/schema.prisma`:

```bash
# Create migration
npm run prisma:migrate

# Apply to database
npm run prisma:generate
```

### View Database Info

```bash
# Show database size
mysql -u root -p -e "
SELECT 
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'stock_manager_db'
GROUP BY table_schema;"

# Show table sizes
mysql -u root -p -e "
SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'stock_manager_db'
ORDER BY (data_length + index_length) DESC;"
```

## Next Steps

After successful database setup:

1. ✅ Test all API endpoints
2. ✅ Create more sample data if needed
3. ✅ Configure Frontend to connect to Backend
4. ✅ Start developing remaining features

## Support

If you encounter issues not covered here:

1. Check Prisma documentation: https://www.prisma.io/docs
2. Check MySQL documentation: https://dev.mysql.com/doc
3. Review error logs in terminal
4. Check MySQL error log file

---

**Database Ready!** 🎉

You can now start the development server and begin testing the API endpoints.
