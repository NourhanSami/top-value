import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create Roles
  console.log('Creating roles...');
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'مدير النظام',
      description: 'مدير النظام - صلاحيات كاملة',
      isSystem: true
    }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      displayName: 'مدير',
      description: 'مدير الفرع',
      isSystem: true
    }
  });

  const cashierRole = await prisma.role.upsert({
    where: { name: 'cashier' },
    update: {},
    create: {
      name: 'cashier',
      displayName: 'كاشير',
      description: 'موظف مبيعات',
      isSystem: true
    }
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: {
      name: 'employee',
      displayName: 'موظف',
      description: 'موظف عادي',
      isSystem: true
    }
  });

  // Create Permissions
  console.log('Creating permissions...');
  const permissions = [
    // Users
    { name: 'users.view', displayName: 'عرض المستخدمين', module: 'users' },
    { name: 'users.create', displayName: 'إضافة مستخدمين', module: 'users' },
    { name: 'users.edit', displayName: 'تعديل المستخدمين', module: 'users' },
    { name: 'users.delete', displayName: 'حذف المستخدمين', module: 'users' },
    
    // Products
    { name: 'products.view', displayName: 'عرض المنتجات', module: 'products' },
    { name: 'products.create', displayName: 'إضافة منتجات', module: 'products' },
    { name: 'products.edit', displayName: 'تعديل المنتجات', module: 'products' },
    { name: 'products.delete', displayName: 'حذف المنتجات', module: 'products' },
    
    // Sales
    { name: 'sales.view', displayName: 'عرض المبيعات', module: 'sales' },
    { name: 'sales.create', displayName: 'إنشاء فاتورة', module: 'sales' },
    { name: 'sales.edit', displayName: 'تعديل فاتورة', module: 'sales' },
    { name: 'sales.delete', displayName: 'حذف فاتورة', module: 'sales' },
    
    // Customers
    { name: 'customers.view', displayName: 'عرض العملاء', module: 'customers' },
    { name: 'customers.create', displayName: 'إضافة عميل', module: 'customers' },
    { name: 'customers.edit', displayName: 'تعديل عميل', module: 'customers' },
    { name: 'customers.delete', displayName: 'حذف عميل', module: 'customers' },
    
    // Suppliers
    { name: 'suppliers.view', displayName: 'عرض الموردين', module: 'suppliers' },
    { name: 'suppliers.create', displayName: 'إضافة مورد', module: 'suppliers' },
    { name: 'suppliers.edit', displayName: 'تعديل مورد', module: 'suppliers' },
    { name: 'suppliers.delete', displayName: 'حذف مورد', module: 'suppliers' },
    
    // Inventory
    { name: 'inventory.view', displayName: 'عرض المخزون', module: 'inventory' },
    { name: 'inventory.adjust', displayName: 'تعديل المخزون', module: 'inventory' },
    
    // Reports
    { name: 'reports.view', displayName: 'عرض التقارير', module: 'reports' },
    { name: 'reports.export', displayName: 'تصدير التقارير', module: 'reports' },
    
    // Settings
    { name: 'settings.view', displayName: 'عرض الإعدادات', module: 'settings' },
    { name: 'settings.edit', displayName: 'تعديل الإعدادات', module: 'settings' },
    
    // All permissions (super admin)
    { name: '*', displayName: 'جميع الصلاحيات', module: 'system' }
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    });
  }

  // Assign permissions to admin role (all permissions)
  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    });
  }

  // Assign permissions to manager role
  const managerPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { module: 'products' },
        { module: 'sales' },
        { module: 'customers' },
        { module: 'suppliers' },
        { module: 'inventory' },
        { module: 'reports' }
      ]
    }
  });

  for (const permission of managerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: managerRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: managerRole.id,
        permissionId: permission.id
      }
    });
  }

  // Assign permissions to cashier role
  const cashierPermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { name: 'products.view' },
        { name: 'sales.view' },
        { name: 'sales.create' },
        { name: 'customers.view' },
        { name: 'customers.create' }
      ]
    }
  });

  for (const permission of cashierPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: cashierRole.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: cashierRole.id,
        permissionId: permission.id
      }
    });
  }

  // Create Main Branch
  console.log('Creating main branch...');
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      name: 'الفرع الرئيسي',
      code: 'MAIN',
      phone: '01000000000',
      email: 'main@stockmanager.com',
      address: 'العنوان الرئيسي',
      city: 'القاهرة',
      region: 'القاهرة',
      isActive: true,
      isMain: true
    }
  });

  // Create Admin User
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@stockmanager.com' },
    update: {},
    create: {
      name: 'مدير النظام',
      email: 'admin@stockmanager.com',
      password: hashedPassword,
      phone: '01000000000',
      branchId: mainBranch.id,
      isActive: true
    }
  });

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id
    }
  });

  // Create some categories
  console.log('Creating categories...');
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'إلكترونيات',
      nameEn: 'Electronics',
      description: 'الأجهزة الإلكترونية',
      isActive: true,
      sortOrder: 1
    }
  });

  const foodCategory = await prisma.category.create({
    data: {
      name: 'مواد غذائية',
      nameEn: 'Food',
      description: 'المواد الغذائية',
      isActive: true,
      sortOrder: 2
    }
  });

  // Create system settings
  console.log('Creating system settings...');
  const settings = [
    { key: 'app_name', value: 'Stock Manager POS', type: 'string', group: 'general', isPublic: true },
    { key: 'currency', value: 'EGP', type: 'string', group: 'general', isPublic: true },
    { key: 'tax_rate', value: '14', type: 'number', group: 'general', isPublic: true },
    { key: 'low_stock_threshold', value: '10', type: 'number', group: 'inventory', isPublic: false },
    { key: 'loyalty_points_rate', value: '1', type: 'number', group: 'sales', isPublic: false }
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }

  console.log('✅ Database seeding completed!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: admin@stockmanager.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
