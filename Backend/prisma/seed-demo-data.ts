import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting demo data seeding...');

  // Get main branch and admin user
  const mainBranch = await prisma.branch.findFirst({ where: { code: 'MAIN' } });
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@stockmanager.com' } });

  if (!mainBranch || !adminUser) {
    console.error('❌ Main branch or admin user not found! Run prisma:seed first.');
    process.exit(1);
  }

  // Create Categories
  console.log('Creating categories...');
  const categories = [];
  
  // Check if categories exist, create if not
  let electronicsCategory = await prisma.category.findFirst({ where: { name: 'إلكترونيات' } });
  if (!electronicsCategory) {
    electronicsCategory = await prisma.category.create({
      data: {
        name: 'إلكترونيات',
        nameEn: 'Electronics',
        description: 'الأجهزة الإلكترونية',
        isActive: true,
        sortOrder: 1
      }
    });
  }
  categories.push(electronicsCategory);

  let foodCategory = await prisma.category.findFirst({ where: { name: 'مواد غذائية' } });
  if (!foodCategory) {
    foodCategory = await prisma.category.create({
      data: {
        name: 'مواد غذائية',
        nameEn: 'Food',
        description: 'المواد الغذائية',
        isActive: true,
        sortOrder: 2
      }
    });
  }
  categories.push(foodCategory);

  let clothingCategory = await prisma.category.findFirst({ where: { name: 'ملابس' } });
  if (!clothingCategory) {
    clothingCategory = await prisma.category.create({
      data: {
        name: 'ملابس',
        nameEn: 'Clothing',
        description: 'الملابس والأزياء',
        isActive: true,
        sortOrder: 3
      }
    });
  }
  categories.push(clothingCategory);

  // Create Suppliers
  console.log('Creating suppliers...');
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'شركة التوريدات الحديثة',
        phone: '01012345678',
        email: 'modern@supplier.com',
        address: '123 شارع النهضة، القاهرة',
        currentBalance: 0
      }
    }),
    prisma.supplier.create({
      data: {
        name: 'مؤسسة الجودة للتجارة',
        phone: '01098765432',
        email: 'quality@supplier.com',
        address: '456 شارع التحرير، الجيزة',
        currentBalance: 0
      }
    })
  ]);

  // Create Products
  console.log('Creating products...');
  const products = await Promise.all([
    // Electronics
    prisma.product.create({
      data: {
        name: 'لابتوب HP 15',
        nameEn: 'HP 15 Laptop',
        sku: 'LAP-HP-001',
        barcode: '123456789001',
        categoryId: categories[0].id,
        supplierId: suppliers[0].id,
        costPrice: 8000,
        sellingPrice: 10000,
        stockQuantity: 15,
        minStockLevel: 5,
        maxStockLevel: 50,
        unit: 'قطعة',
        description: 'لابتوب HP 15 بمعالج Intel Core i5',
        isActive: true
      }
    }),
    prisma.product.create({
      data: {
        name: 'ماوس لاسلكي Logitech',
        nameEn: 'Logitech Wireless Mouse',
        sku: 'MOU-LOG-001',
        barcode: '123456789002',
        categoryId: categories[0].id,
        supplierId: suppliers[0].id,
        costPrice: 150,
        sellingPrice: 250,
        stockQuantity: 50,
        minStockLevel: 10,
        maxStockLevel: 100,
        unit: 'قطعة',
        description: 'ماوس لاسلكي من Logitech',
        isActive: true
      }
    }),
    prisma.product.create({
      data: {
        name: 'كيبورد ميكانيكي',
        nameEn: 'Mechanical Keyboard',
        sku: 'KEY-MEC-001',
        barcode: '123456789003',
        categoryId: categories[0].id,
        supplierId: suppliers[0].id,
        costPrice: 400,
        sellingPrice: 600,
        stockQuantity: 30,
        minStockLevel: 8,
        maxStockLevel: 60,
        unit: 'قطعة',
        description: 'كيبورد ميكانيكي RGB',
        isActive: true
      }
    }),
    // Food
    prisma.product.create({
      data: {
        name: 'أرز أبيض - 5 كجم',
        nameEn: 'White Rice 5kg',
        sku: 'FOOD-RICE-001',
        barcode: '123456789004',
        categoryId: categories[1].id,
        supplierId: suppliers[1].id,
        costPrice: 50,
        sellingPrice: 75,
        stockQuantity: 200,
        minStockLevel: 50,
        maxStockLevel: 500,
        unit: 'كيس',
        description: 'أرز أبيض فاخر 5 كجم',
        isActive: true
      }
    }),
    prisma.product.create({
      data: {
        name: 'زيت طهي - 1 لتر',
        nameEn: 'Cooking Oil 1L',
        sku: 'FOOD-OIL-001',
        barcode: '123456789005',
        categoryId: categories[1].id,
        supplierId: suppliers[1].id,
        costPrice: 30,
        sellingPrice: 45,
        stockQuantity: 150,
        minStockLevel: 40,
        maxStockLevel: 300,
        unit: 'زجاجة',
        description: 'زيت طهي نباتي 1 لتر',
        isActive: true
      }
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: 'قميص رجالي قطن',
        nameEn: 'Men Cotton Shirt',
        sku: 'CLO-SHI-001',
        barcode: '123456789006',
        categoryId: categories[2].id,
        supplierId: suppliers[1].id,
        costPrice: 100,
        sellingPrice: 180,
        stockQuantity: 60,
        minStockLevel: 15,
        maxStockLevel: 150,
        unit: 'قطعة',
        description: 'قميص رجالي قطن 100%',
        isActive: true
      }
    }),
    prisma.product.create({
      data: {
        name: 'بنطال جينز',
        nameEn: 'Jeans Pants',
        sku: 'CLO-PAN-001',
        barcode: '123456789007',
        categoryId: categories[2].id,
        supplierId: suppliers[1].id,
        costPrice: 150,
        sellingPrice: 280,
        stockQuantity: 40,
        minStockLevel: 10,
        maxStockLevel: 100,
        unit: 'قطعة',
        description: 'بنطال جينز أزرق',
        isActive: true
      }
    })
  ]);

  // Create Customers
  console.log('Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'أحمد محمد',
        phone: '01111111111',
        email: 'ahmed@example.com',
        currentBalance: 0,
        isActive: true,
        loyaltyPoints: 150
      }
    }),
    prisma.customer.create({
      data: {
        name: 'سارة علي',
        phone: '01222222222',
        email: 'sara@example.com',
        currentBalance: 0,
        isActive: true,
        loyaltyPoints: 220
      }
    }),
    prisma.customer.create({
      data: {
        name: 'محمود حسن',
        phone: '01333333333',
        email: 'mahmoud@example.com',
        currentBalance: 0,
        isActive: true,
        loyaltyPoints: 80
      }
    }),
    prisma.customer.create({
      data: {
        name: 'فاطمة خالد',
        phone: '01444444444',
        email: 'fatma@example.com',
        currentBalance: 0,
        isActive: true,
        loyaltyPoints: 320
      }
    }),
    prisma.customer.create({
      data: {
        name: 'عمر سعيد',
        phone: '01555555555',
        currentBalance: 0,
        isActive: true,
        loyaltyPoints: 50
      }
    })
  ]);

  // Create Sales Orders
  console.log('Creating sales orders...');
  
  // Generate invoice number
  const generateInvoiceNumber = (index: number) => {
    const date = new Date();
    return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(index).padStart(5, '0')}`;
  };

  // Sale 1: Laptop + Mouse
  const sale1 = await prisma.sale.create({
    data: {
      invoiceNumber: generateInvoiceNumber(1),
      branchId: mainBranch.id,
      userId: adminUser.id,
      customerId: customers[0].id,
      saleDate: new Date(),
      paymentMethod: 'cash',
      status: 'completed',
      subtotal: 10250,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 10250,
      paidAmount: 10250,
      changeAmount: 0,
      notes: 'عملية بيع ناجحة'
    }
  });

  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale1.id,
        productId: products[0].id,
        quantity: 1,
        unitPrice: 10000,
        costPrice: 8000,
        taxAmount: 0,
        totalAmount: 10000
      },
      {
        saleId: sale1.id,
        productId: products[1].id,
        quantity: 1,
        unitPrice: 250,
        costPrice: 150,
        taxAmount: 0,
        totalAmount: 250
      }
    ]
  });

  // Sale 2: Food items
  const sale2 = await prisma.sale.create({
    data: {
      invoiceNumber: generateInvoiceNumber(2),
      branchId: mainBranch.id,
      userId: adminUser.id,
      customerId: customers[1].id,
      saleDate: new Date(),
      paymentMethod: 'cash',
      status: 'completed',
      subtotal: 300,
      taxAmount: 0,
      discountAmount: 20,
      totalAmount: 280,
      paidAmount: 280,
      changeAmount: 0,
      notes: 'مواد غذائية'
    }
  });

  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale2.id,
        productId: products[3].id,
        quantity: 2,
        unitPrice: 75,
        costPrice: 50,
        taxAmount: 0,
        totalAmount: 150
      },
      {
        saleId: sale2.id,
        productId: products[4].id,
        quantity: 2,
        unitPrice: 45,
        costPrice: 30,
        taxAmount: 0,
        totalAmount: 90
      }
    ]
  });

  // Sale 3: Clothing
  const sale3 = await prisma.sale.create({
    data: {
      invoiceNumber: generateInvoiceNumber(3),
      branchId: mainBranch.id,
      userId: adminUser.id,
      customerId: customers[2].id,
      saleDate: new Date(),
      paymentMethod: 'card',
      status: 'completed',
      subtotal: 460,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 460,
      paidAmount: 460,
      changeAmount: 0,
      notes: 'دفع بالبطاقة'
    }
  });

  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale3.id,
        productId: products[5].id,
        quantity: 1,
        unitPrice: 180,
        costPrice: 100,
        taxAmount: 0,
        totalAmount: 180
      },
      {
        saleId: sale3.id,
        productId: products[6].id,
        quantity: 1,
        unitPrice: 280,
        costPrice: 150,
        taxAmount: 0,
        totalAmount: 280
      }
    ]
  });

  // Sale 4: Mixed products
  const sale4 = await prisma.sale.create({
    data: {
      invoiceNumber: generateInvoiceNumber(4),
      branchId: mainBranch.id,
      userId: adminUser.id,
      customerId: customers[3].id,
      saleDate: new Date(),
      paymentMethod: 'cash',
      status: 'completed',
      subtotal: 1150,
      taxAmount: 0,
      discountAmount: 50,
      totalAmount: 1100,
      paidAmount: 1100,
      changeAmount: 0,
      notes: 'عميل مميز'
    }
  });

  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale4.id,
        productId: products[1].id,
        quantity: 2,
        unitPrice: 250,
        costPrice: 150,
        taxAmount: 0,
        totalAmount: 500
      },
      {
        saleId: sale4.id,
        productId: products[2].id,
        quantity: 1,
        unitPrice: 600,
        costPrice: 400,
        taxAmount: 0,
        totalAmount: 600
      }
    ]
  });

  // Sale 5: Cash sale (no customer)
  const sale5 = await prisma.sale.create({
    data: {
      invoiceNumber: generateInvoiceNumber(5),
      branchId: mainBranch.id,
      userId: adminUser.id,
      saleDate: new Date(),
      paymentMethod: 'cash',
      status: 'completed',
      subtotal: 225,
      taxAmount: 0,
      discountAmount: 0,
      totalAmount: 225,
      paidAmount: 300,
      changeAmount: 75,
      notes: 'عميل نقدي'
    }
  });

  await prisma.saleItem.createMany({
    data: [
      {
        saleId: sale5.id,
        productId: products[3].id,
        quantity: 3,
        unitPrice: 75,
        costPrice: 50,
        taxAmount: 0,
        totalAmount: 225
      }
    ]
  });

  // Create Expenses
  console.log('Creating expenses...');
  
  // First create expense categories
  const rentCategory = await prisma.expenseCategory.create({
    data: {
      name: 'إيجارات',
      nameEn: 'Rent',
      description: 'إيجار المحلات والمخازن',
      isActive: true
    }
  });

  const utilitiesCategory = await prisma.expenseCategory.create({
    data: {
      name: 'مرافق',
      nameEn: 'Utilities',
      description: 'كهرباء ومياه وغاز',
      isActive: true
    }
  });

  const transportCategory = await prisma.expenseCategory.create({
    data: {
      name: 'نقل ومواصلات',
      nameEn: 'Transportation',
      description: 'مصاريف النقل والتوصيل',
      isActive: true
    }
  });

  await prisma.expense.createMany({
    data: [
      {
        title: 'إيجار المحل - يوليو',
        amount: 5000,
        expenseCategoryId: rentCategory.id,
        expenseDate: new Date('2026-07-01'),
        paymentMethod: 'bank_transfer',
        branchId: mainBranch.id,
        userId: adminUser.id,
        status: 'approved',
        notes: 'إيجار شهر يوليو'
      },
      {
        title: 'فاتورة كهرباء',
        amount: 800,
        expenseCategoryId: utilitiesCategory.id,
        expenseDate: new Date('2026-07-05'),
        paymentMethod: 'cash',
        branchId: mainBranch.id,
        userId: adminUser.id,
        status: 'approved',
        notes: 'فاتورة الكهرباء'
      },
      {
        title: 'مصاريف نقل',
        amount: 300,
        expenseCategoryId: transportCategory.id,
        expenseDate: new Date('2026-07-08'),
        paymentMethod: 'cash',
        branchId: mainBranch.id,
        userId: adminUser.id,
        status: 'approved',
        notes: 'نقل بضائع'
      }
    ]
  });

  console.log('✅ Demo data seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`   Products: ${products.length}`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Sales: 5`);
  console.log(`   Suppliers: ${suppliers.length}`);
  console.log(`   Expenses: 3`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
