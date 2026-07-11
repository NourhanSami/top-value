# Stock Manager POS - Backend API

Backend API built with Node.js, Express, TypeScript, and Prisma ORM.

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: MySQL
- **Authentication**: JWT
- **Validation**: Zod
- **Security**: Helmet, CORS

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MySQL >= 8.0

## 🛠️ Installation

1. **Install dependencies**
```bash
npm install
```

2. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. **Setup database**
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed database
npm run prisma:seed
```

4. **Start development server**
```bash
npm run dev
```

Server will run at: `http://localhost:8000`

## 📁 Project Structure

```
Backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeder
├── src/
│   ├── config/            # Configuration files
│   │   └── database.ts    # Prisma client
│   ├── controllers/       # Route controllers
│   ├── middlewares/       # Express middlewares
│   │   ├── errorHandler.ts
│   │   └── notFoundHandler.ts
│   ├── routes/            # API routes
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── index.ts           # App entry point
├── .env.example           # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (Database GUI)
- `npm run prisma:seed` - Seed database
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales
- `GET /api/sales` - List sales
- `GET /api/sales/:id` - Get sale
- `POST /api/sales` - Create sale
- `PUT /api/sales/:id` - Update sale

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer

### Suppliers
- `GET /api/suppliers` - List suppliers
- `GET /api/suppliers/:id` - Get supplier
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier

### Purchase Orders
- `GET /api/purchase-orders` - List purchase orders
- `GET /api/purchase-orders/:id` - Get purchase order
- `POST /api/purchase-orders` - Create purchase order
- `PUT /api/purchase-orders/:id` - Update purchase order

### Inventory
- `GET /api/inventory` - Get inventory status
- `GET /api/inventory/transactions` - List transactions
- `POST /api/inventory/adjust` - Adjust inventory

### Reports
- `GET /api/reports/sales` - Sales reports
- `GET /api/reports/inventory` - Inventory reports
- `GET /api/reports/financial` - Financial reports

## 🗄️ Database Schema

The system includes 22 tables:
- **Auth & Permissions**: roles, permissions, role_permission, user_role
- **Organization**: branches, users
- **Products**: categories, products, product_images
- **Suppliers**: suppliers
- **Purchases**: purchase_orders, purchase_order_items
- **Sales**: customers, customer_addresses, sales, sale_items
- **Inventory**: inventory_transactions
- **Expenses**: expense_categories, expenses
- **System**: notifications, activity_logs, system_settings

## 🔐 Environment Variables

```env
NODE_ENV=development
PORT=8000
DATABASE_URL="mysql://user:password@localhost:3306/stock_manager_db"
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:5173
```

## 🧪 Testing

```bash
npm test
```

## 📝 License

MIT
