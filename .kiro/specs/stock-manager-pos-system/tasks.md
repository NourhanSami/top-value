# Implementation Plan: Stock Manager POS System

## Overview

This implementation plan covers the complete development of the Stock Manager POS System, a full-stack application for managing inventory, sales, and point-of-sale operations. The system consists of:

- **Backend**: Laravel 11 + MySQL (22 tables, 20 controllers, 22 models, Sanctum authentication)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (20 pages, 26 dialogs)
- **Desktop**: Tauri wrapper
- **Mobile**: React-based mobile interface

The implementation follows a structured approach: Backend setup → Authentication → API development → Frontend foundation → UI components → Pages → Dialogs → Testing → Deployment.

## Tasks

- [ ] 1. Backend Setup and Database Foundation
  - [-] 1.1 Initialize Laravel 11 project with MySQL database
    - Install Laravel 11 using Composer
    - Configure `.env` file with MySQL 9.4 connection (database name: `stock_manager_db`)
    - Set application key, timezone, and locale to Arabic
    - Test database connection with `php artisan migrate:status`
    - _Requirements: 1.1, 2.1_

  - [-] 1.2 Create all 22 database migration files
    - Create migrations in order: users → warehouses → warehouse_representatives → categories → suppliers → products → customers → orders → order_items → purchase_invoices → purchase_invoice_details → sales_returns → damaged_items → custody_transfers → employees → employment_records → salary_payments → employee_advances → expenses → capital → activity_logs → settings
    - Include all foreign keys, indexes, and constraints as specified in design.md
    - Use proper column types: ENUM for status fields, DECIMAL(12,2) for money, timestamps with defaults
    - Add soft deletes to customers table only
    - _Requirements: All data requirements from sections 3-17_

  - [~] 1.3 Run migrations and verify database structure
    - Execute `php artisan migrate`
    - Verify all 22 tables created successfully
    - Check foreign key constraints are properly set
    - Verify indexes are created on frequently queried columns
    - _Requirements: Database integrity requirements_

  - [~] 1.4 Create all 22 Eloquent models with relationships
    - Create models: User, Warehouse, Category, Supplier, Product, Customer, Order, OrderItem, PurchaseInvoice, PurchaseInvoiceDetail, SalesReturn, DamagedItem, CustodyTransfer, Employee, EmploymentRecord, SalaryPayment, EmployeeAdvance, Expense, Capital, ActivityLog, Settings
    - Define fillable fields, casts, and hidden attributes
    - Implement all relationships: hasMany, belongsTo, belongsToMany (warehouse_representatives)
    - Add accessors for computed fields (stock_status, expiry_status)
    - _Requirements: All model relationships from design.md_

  - [~] 1.5 Create database seeders for initial data
    - Create seeder for default admin user (email: admin@example.com, role: مدير)
    - Create seeder for 2 warehouses (1 رئيسي, 1 فرعي)
    - Create seeder for expense categories (عامة, سيارات, إيجار, خدمات, رواتب, أخرى)
    - Create seeder for sample products (10 products with barcodes)
    - Create seeder for default settings (company info, tax disabled)
    - Run seeders with `php artisan db:seed`
    - _Requirements: 1.1, 3.1, 15.1_

- [ ] 2. Authentication and Authorization System
  - [~] 2.1 Install and configure Laravel Sanctum
    - Install Sanctum package via Composer
    - Publish Sanctum configuration and migrations
    - Add Sanctum middleware to api routes
    - Configure token abilities and expiration
    - _Requirements: 1.2, 1.4, 1.5_

  - [~] 2.2 Create authentication controller and routes
    - Create `AuthController` with login, logout, and user methods
    - Implement login validation (email, password required)
    - Generate Sanctum token on successful authentication
    - Return user object with warehouse relationship
    - Create logout method to revoke current token
    - Add routes: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/user
    - _Requirements: 1.2, 1.3_

  - [~] 2.3 Implement role-based middleware
    - Create `CheckRole` middleware for role verification
    - Support multiple roles: مدير, محاسب, مندوب
    - Return 403 Forbidden for unauthorized role access
    - Apply middleware to protected routes based on permissions matrix
    - _Requirements: 1.8, 1.9, 1.10, 1.11, 1.12_

  - [~] 2.4 Create route groups with Sanctum protection
    - Group all API routes under `auth:sanctum` middleware
    - Separate public routes (login, health check) from protected routes
    - Apply role middleware to admin-only routes (Users, Capital, etc.)
    - Document route protection in comments
    - _Requirements: 1.5, 1.7_

- [ ] 3. Core API Development - Products and Categories
  - [~] 3.1 Create ProductController with CRUD operations
    - Implement index method with filters (search, warehouse_id, stock_status, category)
    - Implement pagination (20 items per page)
    - Implement store method with validation (name, price, warehouse_id required)
    - Auto-generate unique barcode if not provided
    - Implement update and destroy methods with soft delete support
    - Add stock_status and expiry_status computed attributes
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.11_

  - [~] 3.2 Create ProductRequest validation classes
    - Create StoreProductRequest with rules: name (min:3, max:255), barcode (unique), price (numeric, min:0), stock (integer, min:0), warehouse_id (exists), reorder_level (integer, min:1)
    - Create UpdateProductRequest with same rules
    - Add custom validation for expiry_date (must be after production_date)
    - _Requirements: 3.1, 3.2_

  - [~] 3.3 Create CategoryController for product categories
    - Implement index method (list all categories)
    - Implement store method (create new category with unique name)
    - Implement update and destroy methods
    - Add validation: name (required, unique, min:2)
    - _Requirements: 3.6_

  - [~] 3.4 Add product statistics endpoint
    - Create method in ProductController for statistics
    - Calculate: total products, available (stock > reorder_level × 2), medium (stock > reorder_level), low (stock ≤ reorder_level)
    - Return counts with labels
    - Add route: GET /api/products/statistics
    - _Requirements: 3.8_

- [ ] 4. Barcode Generation System
  - [~] 4.1 Implement barcode auto-generation logic in Product model
    - Create static method `generateUniqueBarcode()` in Product model
    - Generate 13-digit numeric barcode (EAN-13 format)
    - Check uniqueness against existing barcodes
    - Retry up to 10 times if collision occurs
    - Call this method in ProductController store when barcode is null
    - _Requirements: 4.1, 4.3, 4.9_

  - [~] 4.2 Create barcode image generation endpoint
    - Create `BarcodeController` with `generate` method
    - Accept product_id parameter
    - Return barcode as SVG or PNG image
    - Use intervention/image library for image generation
    - Add route: GET /api/barcodes/{product_id}
    - _Requirements: 4.4, 4.5_

- [ ] 5. Customer Management API
  - [~] 5.1 Create CustomerController with CRUD operations
    - Implement index with filters (status: pending/approved, is_vip, search by name/phone)
    - Add pagination and eager load relationships (added_by_user, representative)
    - Implement store method with validation (name, phone required, status defaults to 'approved')
    - Implement update method allowing balance updates
    - Implement soft delete with deleted_at timestamp
    - _Requirements: 6.1, 6.2, 6.3, 6.7, 6.8, 6.11_

  - [~] 5.2 Add customer statistics endpoint
    - Calculate: total customers, VIP count, active customers (recent purchases), total purchases
    - Add pending approval count (status='pending')
    - Return statistics object
    - Add route: GET /api/customers/statistics
    - _Requirements: 6.5, 6.6_

  - [~] 5.3 Create customer approval endpoint
    - Create method to change customer status from 'pending' to 'approved'
    - Restrict to مدير role only
    - Add validation to prevent approving already approved customers
    - Add route: PATCH /api/customers/{id}/approve
    - _Requirements: 6.10_

  - [~] 5.4 Create customer balance update endpoint
    - Create method to update customer balance (for credit payments)
    - Accept amount and operation type (add/subtract)
    - Add validation: amount must be positive
    - Update last_purchase_date and total_purchases when relevant
    - Add route: POST /api/customers/{id}/update-balance
    - _Requirements: 6.14_

- [~] 6. Checkpoint - Backend Core Completed
  - Verify all migrations run successfully
  - Test authentication endpoints (login, logout, user)
  - Test product CRUD with barcode generation
  - Test customer CRUD with filters
  - Verify role-based access control works
  - Check database relationships are properly loaded
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Orders and POS API Development
  - [~] 7.1 Create OrderController with order creation logic
    - Implement store method accepting: customer_id, warehouse_id, items array, payment_method, amount_paid
    - Auto-generate unique order_number (format: ORD-YYYYMMDD-XXX)
    - Calculate subtotal (sum of items), tax_amount (if enabled), total_amount
    - Validate all products belong to same warehouse
    - Create order with status 'completed'
    - _Requirements: 5.13, 5.18_

  - [~] 7.2 Implement stock reduction and customer balance update in order creation
    - Use database transaction for atomicity
    - Reduce product stock for each order item
    - Validate stock availability before reduction (prevent negative stock)
    - Update customer balance if payment_method is 'credit'
    - Update customer last_purchase_date and total_purchases
    - Rollback transaction on any error
    - _Requirements: 5.14, 5.15_

  - [~] 7.3 Create order listing and details endpoints
    - Implement index with filters (warehouse_id, customer_id, date range, payment_method)
    - Eager load relationships: user, customer, warehouse, items.product
    - Add pagination (20 per page)
    - Implement show method returning order with all relationships
    - Add routes: GET /api/orders, GET /api/orders/{id}
    - _Requirements: 5.17_

  - [~] 7.4 Create POS-specific endpoints
    - Create endpoint to get products by warehouse for POS: GET /api/pos/products?warehouse_id={id}
    - Filter out zero-stock products
    - Return with barcode for scanning support
    - Group by category for UI filtering
    - Add route: GET /api/pos/categories (list of categories with product counts)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 8. Warehouse Management API
  - [~] 8.1 Create WarehouseController with CRUD operations
    - Implement index listing warehouses with statistics (products count, total value)
    - Add filter by type (رئيسي, فرعي)
    - Implement store method with validation (name required, type defaults to 'فرعي')
    - Implement update method
    - Implement destroy with validation (prevent deleting رئيسي or warehouses with products)
    - _Requirements: 8.1, 8.2, 8.8, 8.9, 8.10, 8.13_

  - [~] 8.2 Implement warehouse-representatives relationship management
    - Create endpoint to assign representatives to warehouse: POST /api/warehouses/{id}/assign-representative
    - Create endpoint to remove representative: DELETE /api/warehouses/{id}/representatives/{user_id}
    - Validate user has role 'مندوب'
    - Update warehouse_representatives pivot table
    - Return updated warehouse with representatives
    - _Requirements: 8.3_

  - [~] 8.3 Create warehouse statistics endpoint
    - Calculate products count and total inventory value per warehouse
    - Support filtering by warehouse type
    - Add route: GET /api/warehouses/statistics
    - _Requirements: 8.4_

- [ ] 9. Custody Transfer System API
  - [~] 9.1 Create CustodyTransferController with transfer creation
    - Implement store method accepting: warehouse_id, from_user_id, to_user_id, type (permanent/temporary), return_date (if temporary), notes
    - Validate users have role 'مندوب'
    - Validate return_date required when type is 'temporary'
    - Create transfer with status 'pending'
    - Add route: POST /api/custody-transfers
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [~] 9.2 Implement custody transfer acceptance/rejection
    - Create endpoint to accept transfer: PATCH /api/custody-transfers/{id}/accept
    - Create endpoint to reject transfer: PATCH /api/custody-transfers/{id}/reject
    - On accept: update warehouse representatives, set status to 'accepted'
    - On accept with temporary type: update warehouse custody_status to 'temporary'
    - On reject: set status to 'rejected', no changes to warehouse
    - Validate only to_user can accept/reject
    - _Requirements: 9.7, 9.8, 9.9_

  - [~] 9.3 Create custody history endpoint
    - Implement endpoint to get custody history for warehouse: GET /api/warehouses/{id}/custody-history
    - Return all custody transfers for the warehouse
    - Include from_user, to_user, and status information
    - Order by created_at descending
    - _Requirements: 9.10, 9.11_

- [ ] 10. Supplier and Purchase Invoice API
  - [~] 10.1 Create SupplierController with CRUD operations
    - Implement index with pagination and search (name, phone)
    - Implement store with validation (name, phone required)
    - Implement update and destroy
    - Track supplier balance (positive = we owe, negative = they owe)
    - Add route to update supplier balance: POST /api/suppliers/{id}/pay
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [~] 10.2 Create PurchaseInvoiceController with invoice creation
    - Implement store accepting: supplier_id, invoice_date, items array, amount_paid, notes
    - Auto-generate unique invoice_number (format: PI-YYYYMMDD-XXX)
    - Calculate total_amount from items, remaining_amount = total - paid
    - Determine payment_status: 'paid' (remaining=0), 'partial' (0<remaining<total), 'unpaid' (remaining=total)
    - Create purchase_invoice_details records for each item
    - _Requirements: 10.6, 10.7, 10.8, 10.9_

  - [~] 10.3 Implement stock increase on purchase invoice creation
    - Use database transaction
    - For each invoice item, increase product stock by quantity
    - Update supplier balance (increase by remaining_amount)
    - On invoice deletion, decrease product stock and adjust supplier balance
    - _Requirements: 10.10, 10.11_

  - [~] 10.4 Create purchase invoice listing and statistics
    - Implement index with filters (supplier_id, payment_status, date range)
    - Eager load supplier and details relationships
    - Create statistics endpoint: total invoices, total amount, current month purchases
    - Add routes: GET /api/purchase-invoices, GET /api/purchase-invoices/statistics
    - _Requirements: 10.13, 10.14, 10.15_

- [ ] 11. Sales Returns API
  - [~] 11.1 Create SalesReturnController with return processing
    - Implement store accepting: return_type (single/full_invoice), product_id (if single), order_id (if full), quantity, refund_amount, refund_method, reason
    - Validate: single requires product_id+quantity, full_invoice requires order_id
    - Create sales_return record with processed_by = current user
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [~] 11.2 Implement stock increase and balance update on return
    - Use database transaction
    - Increase product stock by returned quantity
    - If refund_method is 'credit', update customer balance (add refund_amount)
    - If full_invoice return, increase stock for all order items
    - _Requirements: 11.6, 11.7_

  - [~] 11.3 Create returns listing and statistics
    - Implement index with filters (return_type, refund_method, date range)
    - Eager load product, order, customer relationships
    - Create statistics: total returns, single count, full invoice count, total refund amount
    - Add routes: GET /api/sales-returns, GET /api/sales-returns/statistics
    - _Requirements: 11.8, 11.9, 11.10, 11.11, 11.12_

- [ ] 12. Damaged Items and Approval Workflow API
  - [~] 12.1 Create DamagedItemController with report creation
    - Implement store accepting: product_id, warehouse_id, quantity, loss_amount, reason
    - Create damaged_item with status 'pending' and reported_by = current user
    - Validate product exists and belongs to warehouse
    - Add route: POST /api/damaged-items
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [~] 12.2 Implement damaged item approval/rejection endpoints
    - Create approve endpoint: PATCH /api/damaged-items/{id}/approve (مدير only)
    - On approve: set status to 'approved', approved_by = current user, approved_at = now
    - On approve: decrease product stock by damaged quantity
    - On approve: record loss_amount in financial records
    - Create reject endpoint: PATCH /api/damaged-items/{id}/reject (مدير only)
    - On reject: set status to 'rejected', no stock or financial changes
    - _Requirements: 12.9, 12.10, 12.11, 12.12, 12.15_

  - [~] 12.3 Create damaged items listing and statistics
    - Implement index with filters (warehouse_id, status)
    - Eager load product, warehouse, reported_by_user relationships
    - Create statistics: total cases, total damaged quantity, pending count, total approved losses
    - Add routes: GET /api/damaged-items, GET /api/damaged-items/statistics
    - _Requirements: 12.5, 12.6, 12.7, 12.8, 12.14_

- [ ] 13. Employee Management API
  - [~] 13.1 Create EmployeeController with CRUD operations
    - Implement index with filters (status: active/archived, position)
    - Implement store with validation (name, position, phone, base_salary, hire_date required)
    - Implement update allowing status change
    - Prevent hard delete (archive instead)
    - _Requirements: 13.1, 13.2, 13.7, 13.8, 13.9, 13.10_

  - [~] 13.2 Create employee financial operations endpoints
    - Create salary/bonus payment endpoint: POST /api/employees/{id}/payments
    - Accept: amount, type (salary/bonus), date, notes
    - Create salary_payment record
    - Create advance endpoint: POST /api/employees/{id}/advances
    - Validate advance amount against available limit
    - Create employee_advance record
    - _Requirements: 13.13, 13.14, 13.19_

  - [~] 13.3 Implement employee termination and rehiring
    - Create terminate endpoint: POST /api/employees/{id}/terminate
    - Accept: termination_reason, termination_date
    - Create employment_record with end_date
    - Change status to 'archived'
    - Create rehire endpoint: POST /api/employees/{id}/rehire
    - Accept: new_salary, rehire_date
    - Create new employment_record
    - Change status to 'active'
    - _Requirements: 13.15, 13.16, 13.17, 13.18_

  - [~] 13.4 Create employee financial ledger endpoint
    - Implement endpoint: GET /api/employees/{id}/financial-ledger
    - Return all salary payments, bonuses, advances chronologically
    - Calculate running balance
    - Support export to PDF/Excel
    - _Requirements: 13.19, 13.20_

  - [~] 13.5 Create employment history endpoint
    - Implement endpoint: GET /api/employees/{id}/employment-records
    - Return all employment periods with dates and termination reasons
    - Order by start_date descending
    - _Requirements: 13.21_

- [ ] 14. Expenses and Capital API
  - [~] 14.1 Create ExpenseController with CRUD operations
    - Implement index with filters (category, high amounts >1000, last 30 days)
    - Support multiple category selection
    - Implement store with validation (title, amount, category, date required)
    - Implement update and destroy
    - _Requirements: 14.1, 14.2, 14.4, 14.5, 14.6, 14.9_

  - [~] 14.2 Create expense statistics endpoint
    - Calculate: total expenses amount, total operations count
    - Support filtering by date range and categories
    - Add route: GET /api/expenses/statistics
    - _Requirements: 14.3, 14.10_

  - [~] 14.3 Create CapitalController with initialization and summary
    - Create initialize endpoint: POST /api/capital/initialize (مدير only)
    - Accept: actual_cash amount
    - Calculate inventory value from products
    - Calculate net debt (customer debts - supplier debts)
    - Calculate starting_capital = inventory + cash + net_debt
    - Store in capital table with initialization_date
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [~] 14.4 Create capital summary endpoint
    - Implement endpoint: GET /api/capital/summary
    - If uninitialized: return calculated values (inventory, net debt)
    - If initialized: return starting capital, current assets estimate, profit/loss
    - Calculate profit/loss = current assets - starting capital
    - Return asset breakdown (inventory, cash, customer debts, supplier debts)
    - _Requirements: 15.7, 15.8, 15.9, 15.10, 15.11, 15.12_

- [~] 15. Checkpoint - Backend API Complete
  - Test all CRUD endpoints with Postman/Insomnia
  - Verify role-based access restrictions work correctly
  - Test transactional operations (orders, returns, purchases)
  - Verify stock updates and balance calculations are accurate
  - Check all relationships are properly eager-loaded
  - Ensure validation rules catch invalid data
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Additional Backend APIs - Reports, Logs, Settings, Users
  - [~] 16.1 Create ReportController with report generation
    - Create endpoint: GET /api/reports/sales?period=daily|weekly|monthly|quarterly|yearly&date_from=&date_to=
    - Calculate total sales, orders count, top products, sales by category
    - Create endpoint: GET /api/reports/inventory
    - Return products by stock status, low stock alerts, expiring products
    - Create endpoint: GET /api/reports/customers
    - Return customer purchase statistics, VIP customers, debt overview
    - Create endpoint: GET /api/reports/financial
    - Calculate revenue, expenses, profit, cash flow
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [~] 16.2 Create ActivityLogController with logging and archiving
    - Implement index with filters (activity_type, user_id, status, date range)
    - Implement auto-logging on important operations (create ActivityLog observer)
    - Create archive endpoint: PATCH /api/activity-logs/{id}/archive
    - Create bulk archive: POST /api/activity-logs/bulk-archive
    - Create bulk delete: POST /api/activity-logs/bulk-delete
    - _Requirements: 17.1, 17.2, 17.7, 17.8_

  - [~] 16.3 Create SettingsController for system settings
    - Create GET /api/settings endpoint returning all settings
    - Create POST /api/settings endpoint for updating (مدير only)
    - Validate: company_name, tax_percentage (0-100), printer_type (thermal/regular)
    - Store settings in database or config file
    - Return network_mode and api_base_url for frontend configuration
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [~] 16.4 Create UserController for user management (مدير only)
    - Implement index listing all users with warehouse relationship
    - Implement store with validation (name, email unique, password min:8, role)
    - Implement update (password optional on update)
    - Hash passwords before saving
    - Prevent deleting currently logged-in user
    - Update last_login_at on successful login
    - _Requirements: 1.1, 1.9_

  - [~] 16.5 Create health check and server info endpoints
    - Create GET /api/health endpoint (no auth) returning {"status": "ok"}
    - Create GET /api/db-check testing database connectivity
    - Create GET /api/server-info returning IP address, port, Laravel version
    - These endpoints help with network configuration (Employee mode)
    - _Requirements: 2.2, 2.6, 2.9_

- [ ] 17. Dashboard API and Mobile Endpoints
  - [~] 17.1 Create DashboardController with comprehensive statistics
    - Create GET /api/dashboard endpoint
    - Calculate: total_sales (sum of completed orders), sales_change (% vs previous period)
    - Calculate: total_orders count, orders_change (% vs previous period)
    - Calculate: products_count, products_needing_reorder (stock <= reorder_level)
    - Calculate: active_customers (purchased in last 30 days), new_customers_this_week
    - Get recent_sales (last 10 orders with customer info)
    - Get top_products (most sold products this month)
    - _Requirements: Dashboard display requirements_

  - [~] 17.2 Create mobile-specific endpoints
    - Create GET /api/mobile/dashboard with simplified statistics for mobile
    - Create GET /api/mobile/scan/{barcode} for quick product lookup by barcode
    - Return product with stock, price, and warehouse info
    - Optimize response size for mobile networks
    - _Requirements: Mobile interface requirements_

- [ ] 18. Frontend Foundation and Routing Setup
  - [x] 18.1 Verify existing React + TypeScript + Vite setup
    - Check package.json has: react@18, typescript@5, vite@5, react-router-dom@6
    - Check Tailwind CSS is configured properly
    - Verify @tanstack/react-query, axios, lucide-react are installed
    - Check path aliases (@/*) work correctly
    - Test dev server starts: npm run dev
    - _Requirements: Technology stack requirements_

  - [-] 18.2 Configure Axios client with interceptors
    - Update src/lib/api.ts with base URL from localStorage
    - Add request interceptor to attach Authorization Bearer token
    - Add response interceptor for 401 (redirect to login) and 403 (show error toast)
    - Add request timeout configuration (30 seconds)
    - Handle network errors gracefully
    - _Requirements: 1.4, 1.5, 1.7, 2.7_

  - [ ] 18.3 Create authentication context and hooks
    - Create src/contexts/AuthContext.tsx with UserContext
    - Provide: user, login, logout, isAuthenticated, isLoading
    - Store token in localStorage on login
    - Clear token on logout and redirect to /login
    - Create useAuth() hook for easy access
    - _Requirements: 1.4, 1.6_

  - [~] 18.4 Set up React Router with role-based route protection
    - Create src/components/ProtectedRoute.tsx component
    - Check user authentication and role permissions
    - Redirect to /login if not authenticated
    - Show 403 page if role doesn't have access
    - Create routes for all 20 pages according to permissions matrix
    - Use lazy loading for code splitting: React.lazy() and Suspense
    - _Requirements: 1.8, 1.10, 1.11, 1.12_

  - [~] 18.5 Create TanStack Query configuration
    - Set up QueryClient in src/main.tsx
    - Configure default options: staleTime (5 minutes), cacheTime (10 minutes)
    - Add QueryClientProvider wrapping the app
    - Create query keys factory in src/lib/queryKeys.ts
    - _Requirements: Performance and caching requirements_

- [ ] 19. UI Component Library - shadcn/ui Integration
  - [~] 19.1 Verify or install core shadcn/ui components
    - Check existing components in src/components/ui/
    - Install missing components: Dialog, Card, Input, Select, Textarea, Badge, Alert, Tabs, Separator, ScrollArea
    - Verify Button component with variants (primary, secondary, danger, ghost)
    - All components should use Tailwind CSS classes
    - _Requirements: UI design system requirements_

  - [~] 19.2 Create custom IconBox component
    - Create src/components/ui/IconBox.tsx
    - Accept: icon (Lucide icon), variant (primary/secondary/success/warning/danger)
    - Apply gradient backgrounds based on variant
    - Support size prop (sm, md, lg)
    - _Requirements: UI component requirements_

  - [~] 19.3 Create custom StatCard component
    - Create src/components/ui/StatCard.tsx
    - Accept: title, value, icon, change (percentage), trend (up/down)
    - Display icon in colored box
    - Show trend indicator with arrow and color (green for up, red for down)
    - Support loading skeleton state
    - _Requirements: Dashboard display requirements_

  - [~] 19.4 Create ViewToggle component for table/card view switching
    - Create src/components/ui/ViewToggle.tsx
    - Toggle between 'table' and 'card' view modes
    - Use LayoutGrid and List icons from lucide-react
    - Highlight active view
    - _Requirements: 3.7_

  - [~] 19.5 Create PrintControls component for invoice printing
    - Create src/components/PrintControls.tsx
    - Accept: onPrint callback, printer settings
    - Provide printer type selection (thermal/regular)
    - Provide paper size selection based on printer type
    - Show preview button
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 20. Layout Components Development
  - [~] 20.1 Verify or enhance MainLayout component
    - Check src/components/layout/MainLayout.tsx exists
    - Layout should include: Sidebar (right-side for RTL), Header, main content area
    - Support collapsible sidebar for mobile
    - Use proper RTL direction for Arabic
    - _Requirements: UI layout requirements_

  - [~] 20.2 Verify or enhance Sidebar component
    - Check src/components/layout/Sidebar.tsx
    - Display navigation menu with icons for all pages
    - Filter menu items based on user role
    - Highlight active route
    - Support collapsing on mobile
    - Include user info at bottom (name, role badge)
    - _Requirements: 1.9, navigation requirements_

  - [~] 20.3 Verify or enhance Header component
    - Check src/components/layout/Header.tsx
    - Display: app title, user name, role badge, warehouse (if assigned)
    - Include logout button
    - Show connection status indicators (green/red/yellow/orange)
    - Include settings icon for network configuration
    - _Requirements: 1.9, 2.7_

- [~] 21. Checkpoint - Frontend Foundation Complete
  - Test login flow with token storage
  - Verify protected routes redirect properly
  - Test role-based route access (مدير vs محاسب vs مندوب)
  - Verify layout renders correctly with sidebar and header
  - Check UI components render with correct styling
  - Test responsive design on mobile breakpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Page Development - Authentication and Dashboard
  - [~] 22.1 Create or enhance Login page
    - Create src/pages/Login.tsx if not exists
    - Form fields: email, password
    - Validate inputs before submission
    - Show loading state during authentication
    - Display error messages from API
    - Redirect to dashboard on success
    - Include network settings icon to open NetworkSettingsDialog
    - _Requirements: 1.2, 1.3, 2.9_

  - [~] 22.2 Create Dashboard page
    - Create src/pages/Dashboard.tsx
    - Display 4 StatCards: total sales, total orders, products count, active customers
    - Show percentage changes with trend indicators
    - Display recent sales table (last 10 orders)
    - Display top products chart or list
    - Use TanStack Query to fetch dashboard data
    - Auto-refresh every 5 minutes
    - _Requirements: Dashboard statistics requirements_

- [ ] 23. Page Development - Products Management
  - [~] 23.1 Create Products page with table and card views
    - Create src/pages/Products.tsx
    - Display 4 statistics cards: total, available, medium stock, low stock
    - Implement search by name, barcode, category
    - Implement filters: warehouse, stock level, category
    - Implement ViewToggle for table/card view
    - Table view: columns for image, name, barcode, price, stock, warehouse, actions
    - Card view: responsive grid with product cards
    - Include pagination (20 per page)
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

  - [~] 23.2 Add stock status badges and expiry indicators
    - Display stock status badge: منخفض (red), متوسط (yellow), متوفر (green)
    - Display expiry status badge: منتهي (red), قرب انتهاء (orange), صالح (green)
    - Show small barcode image in table (80px width)
    - Calculate status based on reorder_level and expiry_date
    - _Requirements: 3.4, 3.5_

  - [~] 23.3 Add product actions buttons
    - Edit button opens EditProductDialog
    - Delete button shows confirmation then soft deletes
    - Print Barcode button opens PrintBarcodeDialog
    - View details button shows full product information
    - Restrict actions based on user role
    - _Requirements: 3.11, 3.12, 4.5_

- [ ] 24. Page Development - Point of Sale (POS)
  - [~] 24.1 Create POS page with product grid
    - Create src/pages/POS.tsx
    - Display products in responsive grid (2-4 columns)
    - Show product cards with: image, name, price, stock
    - Implement real-time search filtering by name/barcode
    - Support barcode scanner input
    - Display category filter buttons with horizontal scroll
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [~] 24.2 Implement shopping cart sidebar
    - Display cart sidebar (384px width) on right side
    - Show selected customer at top with "Select Customer" button
    - List cart items with: product name, quantity controls, unit price, total
    - Prevent quantity exceeding available stock
    - Show warning if trying to add product from different warehouse
    - Display: subtotal, tax amount (if enabled), total
    - Include "Complete Sale" button at bottom
    - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [~] 24.3 Implement cart interactions and validation
    - On product card click: add to cart or increase quantity
    - Validate all products in cart from same warehouse
    - Show toast error if warehouse mismatch
    - Increment/decrement quantity with +/- buttons
    - Remove item button with confirmation
    - Clear cart after successful sale
    - _Requirements: 5.5, 5.6, 5.7, 5.10, 5.17_

- [ ] 25. Page Development - Customers Management
  - [~] 25.1 Create Customers page with card view
    - Create src/pages/Customers.tsx
    - Display 4 statistics cards: total customers, VIP count, active customers, total purchases
    - Add 5th card for pending approval (مدير only)
    - Implement filters: pending approval, VIP only, active customers
    - Display customers in card view by default
    - Card shows: avatar (first letter), name, VIP star, pending badge, phone, total purchases, last purchase date
    - Highlight customers with today's purchases in green
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9_

  - [~] 25.2 Add customer actions
    - View details button shows full customer info
    - Edit button opens EditCustomerDialog
    - Delete button (soft delete) with confirmation
    - Approve button for pending customers (مدير only)
    - Update balance button opens BalanceDialog
    - _Requirements: 6.10, 6.11, 6.14_

- [ ] 26. Page Development - Remaining Core Pages
  - [~] 26.1 Create Warehouses page
    - Create src/pages/Warehouses.tsx
    - Display warehouse cards with: name, type badge, custody status, representatives, products count, total value
    - Different icons for رئيسي (Warehouse) and فرعي (Truck)
    - Filter by type: all, main, branch
    - Add, edit, view, delete actions
    - Transfer Stock button (disabled if < 2 warehouses)
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 8.11_

  - [~] 26.2 Create Suppliers page
    - Create src/pages/Suppliers.tsx
    - Display statistics: total suppliers, total products, total transactions
    - List suppliers with: name, phone, email, balance (colored: red if we owe, green if they owe)
    - Search by name/phone
    - Add, edit, view, delete actions
    - Pay supplier button opens PaymentDialog
    - _Requirements: 10.3, 10.4, 10.5_

  - [~] 26.3 Create Purchase Invoices page
    - Create src/pages/PurchaseInvoices.tsx
    - Display statistics: total invoices, total amount, current month purchases
    - Table with: invoice number, supplier, date, items count, total, payment status badge, actions
    - Filter by: supplier, payment status (paid/partial/unpaid), date range
    - Add invoice button opens CreatePurchaseInvoiceDialog
    - View details shows all line items
    - _Requirements: 10.13, 10.14, 10.15_

  - [~] 26.4 Create Sales Returns page
    - Create src/pages/Returns.tsx
    - Display statistics: total returns, single count, full invoice count, total refund
    - Table with: type badge, product/invoice, quantity, amount, refund method badge, reason, date
    - Color-code type badges: blue (full), cyan (single)
    - Color-code refund badges: green (cash), orange (credit)
    - Filter by: return type, refund method, date range
    - Add return button opens ReturnDialog
    - _Requirements: 11.8, 11.9, 11.10, 11.11_

  - [~] 26.5 Create Damaged Items page
    - Create src/pages/DamagedItems.tsx
    - Display statistics: total cases, damaged quantity, pending count, total losses
    - Table with: product, warehouse, quantity, loss value, status badge with icon, reported by, reason, date
    - Status badges: orange+Clock (pending), green+CheckCircle (approved), red+XCircle (rejected)
    - Filter by warehouse
    - Report damaged button opens ReportDamagedDialog
    - Approve/reject buttons for pending items (مدير only)
    - _Requirements: 12.5, 12.6, 12.7, 12.8, 12.9_

  - [~] 26.6 Create Employees page
    - Create src/pages/Employees.tsx
    - Two tabs: Active Employees, Archive
    - Display statistics: active count, archived count, total
    - Table with: name, position, phone, base salary, actions
    - Filter by position
    - Active employee actions: edit, view history, view ledger, record payment, record advance, terminate
    - Archived employee actions: edit, view history, view ledger, rehire
    - _Requirements: 13.7, 13.8, 13.9, 13.10, 13.11, 13.12_

  - [~] 26.7 Create Expenses page
    - Create src/pages/Expenses.tsx
    - Display statistics: total expenses, operations count
    - Table with: title, amount (red), category badge, date, notes, actions
    - Filters: categories (multiple checkboxes), high amounts (>1000), last 30 days
    - Add expense button opens ExpenseDialog
    - _Requirements: 14.3, 14.4, 14.5, 14.6_

  - [~] 26.8 Create Capital page
    - Create src/pages/Capital.tsx
    - If uninitialized: show explanation banner and setup form
    - Display calculated: inventory value, net debt
    - Setup form: actual cash input field, initialize button
    - If initialized: show statistics cards: starting capital (with date), current assets, profit/loss
    - Profit/loss colored: green (positive), red (negative)
    - Asset breakdown: inventory, cash, customer debts (green), supplier debts (red)
    - _Requirements: 15.2, 15.3, 15.4, 15.5, 15.7, 15.8, 15.9, 15.10, 15.11_

  - [~] 26.9 Create Reports page
    - Create src/pages/Reports.tsx
    - Four report type cards: sales, inventory, customers, financial
    - Period selector: today, this week, this month, this year
    - Time period filter: daily, weekly, monthly, quarterly, yearly
    - Each report card shows key metrics
    - Export buttons for PDF/Excel
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [~] 26.10 Create Activity Logs page
    - Create src/pages/ActivityLogs.tsx
    - Table with: activity type icon, description, user, timestamp, status, reference, actions
    - Filters: activity type, user, status (active/archived), date range
    - Actions: view details, archive, delete
    - Bulk operations: select multiple, archive all, delete all
    - _Requirements: 17.1, 17.2, 17.7, 17.8_

  - [~] 26.11 Create Users page (مدير only)
    - Create src/pages/Users.tsx
    - Table with: name, email, role, warehouse, status (active/inactive), last login, actions
    - Add user button opens CreateUserDialog
    - Edit button opens EditUserDialog
    - Delete button with confirmation (prevent self-deletion)
    - Toggle active status button
    - _Requirements: User management requirements_

  - [~] 26.12 Create Settings page
    - Create src/pages/Settings.tsx
    - Company information section: name, description, address, phones, registration, tax number
    - Tax configuration: enable tax toggle, tax percentage input
    - Printer settings: printer type (thermal/regular), default paper size
    - Network settings: network mode (master/employee), API base URL
    - Save button to update all settings
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [~] 26.13 Create Invoices page
    - Create src/pages/Invoices.tsx
    - Table listing all orders with invoice details
    - Columns: order number, customer, date, items count, total, payment method, actions
    - Filter by: date range, customer, payment method
    - View invoice button opens InvoicePreviewDialog with print option
    - Reprint invoice button
    - _Requirements: 7.14_

- [~] 27. Checkpoint - Core Pages Complete
  - Test all pages load correctly
  - Verify data fetching with TanStack Query works
  - Test filters and search functionality
  - Verify role-based page access restrictions
  - Check responsive design on mobile
  - Test pagination on list pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 28. Dialog Components Development - CRUD Dialogs (Part 1)
  - [~] 28.1 Create ProductDialog (Add/Edit Product)
    - Create src/components/dialogs/ProductDialog.tsx
    - Form fields: name, barcode (optional), price, cost_price, stock, warehouse_id, supplier_id, category, description, reorder_level, production_date, expiry_date
    - Validate: name required (min 3), price positive, stock non-negative
    - Support image upload for product image
    - Auto-generate barcode if empty
    - Show loading state during submission
    - Close dialog and refresh data on success
    - _Requirements: 3.11_

  - [~] 28.2 Create PrintBarcodeDialog
    - Create src/components/dialogs/PrintBarcodeDialog.tsx
    - Select paper size: A4, 58mm, 80mm, 110mm
    - Input number of copies
    - Preview barcode with product name and price
    - Print button triggers window.print() with @media print CSS
    - Use JsBarcode library to generate CODE128 barcode
    - _Requirements: 4.5, 4.6, 4.7, 4.8_

  - [~] 28.3 Create CustomerDialog (Add/Edit Customer)
    - Create src/components/dialogs/CustomerDialog.tsx
    - Form fields: name, phone, address, is_vip (checkbox), vip_color (color picker if VIP), representative_id
    - Validate: name required, phone required
    - Show status field (pending/approved) on edit only
    - _Requirements: 6.7, 6.11_

  - [~] 28.4 Create SelectCustomerDialog (for POS)
    - Create src/components/dialogs/SelectCustomerDialog.tsx
    - List all customers with search
    - Show customer cards with: name, phone, balance
    - Highlight selected customer
    - Add new customer button opens CustomerDialog
    - Confirm selection button
    - _Requirements: 5.8_

  - [~] 28.5 Create CompleteSaleDialog
    - Create src/components/dialogs/CompleteSaleDialog.tsx
    - Display total amount prominently
    - Payment method selection: cash, credit, card (radio buttons)
    - Amount paid input field
    - Calculate and display remaining balance
    - Show customer's new balance if credit method
    - Confirm button to complete sale
    - On success: create order, open InvoicePreviewDialog, clear cart
    - _Requirements: 5.12, 5.13, 5.14, 5.15, 5.16_

- [ ] 29. Dialog Components Development - CRUD Dialogs (Part 2)
  - [~] 29.1 Create InvoicePreviewDialog with printing
    - Create src/components/dialogs/InvoicePreviewDialog.tsx
    - Display: company info, invoice number, date, customer name
    - Itemized products table: name, quantity, unit price, total
    - Calculate and show: subtotal, tax (if enabled), grand total
    - Include PrintControls component (printer type, paper size)
    - Print button triggers window.print()
    - Use @media print CSS to show only invoice template
    - Close button
    - _Requirements: 7.1, 7.2, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_

  - [~] 29.2 Create WarehouseDialog (Add/Edit Warehouse)
    - Create src/components/dialogs/WarehouseDialog.tsx
    - Form fields: name, type (رئيسي/فرعي radio), address
    - Multi-select for representatives (users with مندوب role)
    - Validate: name required
    - _Requirements: 8.8_

  - [~] 29.3 Create TransferStockDialog
    - Create src/components/dialogs/TransferStockDialog.tsx
    - Select product to transfer
    - Select from warehouse and to warehouse
    - Input quantity to transfer
    - Validate quantity doesn't exceed available stock
    - Confirm button executes transfer
    - _Requirements: 8.11_

  - [~] 29.4 Create CustodyTransferDialog
    - Create src/components/dialogs/CustodyTransferDialog.tsx
    - Select warehouse, from_user, to_user
    - Transfer type radio: permanent, temporary
    - If temporary: show return_date date picker
    - Notes textarea (optional)
    - Submit creates custody transfer with status 'pending'
    - _Requirements: 9.3, 9.4, 9.5_

  - [~] 29.5 Create SupplierDialog (Add/Edit Supplier)
    - Create src/components/dialogs/SupplierDialog.tsx
    - Form fields: name, phone, email, address
    - Validate: name required, phone required, email format
    - _Requirements: 10.3_

  - [~] 29.6 Create PurchaseInvoiceDialog
    - Create src/components/dialogs/PurchaseInvoiceDialog.tsx
    - Select supplier
    - Invoice date picker
    - Items table: add product, quantity, unit price (auto-calculate total)
    - Add item button, remove item button
    - Display calculated total amount
    - Amount paid input
    - Calculate and display remaining amount and payment status
    - Notes textarea
    - Submit creates invoice and increases stock
    - _Requirements: 10.8, 10.9, 10.10_

- [ ] 30. Dialog Components Development - CRUD Dialogs (Part 3)
  - [~] 30.1 Create ReturnDialog
    - Create src/components/dialogs/ReturnDialog.tsx
    - Return type radio: single product, full invoice
    - If single: select product, input quantity
    - If full invoice: select order (shows all items)
    - Refund amount input
    - Refund method radio: cash, credit
    - Reason textarea (required)
    - Submit creates return, increases stock, updates balance if credit
    - _Requirements: 11.3, 11.4, 11.5, 11.6, 11.7_

  - [~] 30.2 Create ReportDamagedDialog
    - Create src/components/dialogs/ReportDamagedDialog.tsx
    - Select product and warehouse
    - Input quantity damaged
    - Input loss amount (monetary value)
    - Reason textarea (required)
    - Submit creates damaged item record with status 'pending'
    - _Requirements: 12.3, 12.4_

  - [~] 30.3 Create EmployeeDialog (Add/Edit Employee)
    - Create src/components/dialogs/EmployeeDialog.tsx
    - Form fields: name, position, phone, base_salary, hire_date
    - Validate: all fields required, base_salary positive
    - _Requirements: 13.9, 13.10_

  - [~] 30.4 Create RecordPaymentDialog (Salary/Bonus)
    - Create src/components/dialogs/RecordPaymentDialog.tsx
    - Payment type radio: salary, bonus
    - Amount input
    - Date picker
    - Notes textarea (optional)
    - Submit creates salary_payment record
    - _Requirements: 13.13_

  - [~] 30.5 Create RecordAdvanceDialog
    - Create src/components/dialogs/RecordAdvanceDialog.tsx
    - Fetch and display employee's available advance limit from API
    - Amount input with validation against limit
    - Date picker
    - Submit creates employee_advance record
    - _Requirements: 13.14_

  - [~] 30.6 Create TerminateEmployeeDialog
    - Create src/components/dialogs/TerminateEmployeeDialog.tsx
    - Termination reason textarea (required)
    - Termination date picker
    - Confirm button executes termination (creates employment record with end_date, sets status to archived)
    - _Requirements: 13.15, 13.16_

  - [~] 30.7 Create RehireEmployeeDialog
    - Create src/components/dialogs/RehireEmployeeDialog.tsx
    - New salary input (required)
    - Rehire date picker
    - Confirm button executes rehire (creates new employment record, sets status to active)
    - _Requirements: 13.17, 13.18_

- [ ] 31. Dialog Components Development - CRUD Dialogs (Part 4)
  - [~] 31.1 Create ExpenseDialog (Add/Edit Expense)
    - Create src/components/dialogs/ExpenseDialog.tsx
    - Form fields: title, amount, category (select), date, notes
    - Category options: عامة, سيارات, إيجار, خدمات, رواتب, أخرى
    - Validate: title required, amount positive, category required
    - _Requirements: 14.6, 14.7_

  - [~] 31.2 Create UserDialog (Add/Edit User)
    - Create src/components/dialogs/UserDialog.tsx
    - Form fields: name, email, password (required on create, optional on edit), role (مدير/محاسب/مندوب), warehouse_id (if مندوب), is_active (checkbox)
    - Validate: email unique, password min 8 chars, role required
    - _Requirements: User management requirements_

  - [~] 31.3 Create NetworkSettingsDialog
    - Create src/components/dialogs/NetworkSettingsDialog.tsx
    - Network mode selection: Master, Employee
    - If Master: display server IP and port with "Click to Copy" button
    - If Employee: input fields for API IP and port, Test Connection button
    - Display connection status indicators (Database, API)
    - Save button stores settings in localStorage
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_

  - [~] 31.4 Create BalanceDialog (Update Customer Balance)
    - Create src/components/dialogs/BalanceDialog.tsx
    - Display current customer balance
    - Operation type radio: add credit, deduct payment
    - Amount input
    - Notes textarea (optional)
    - Confirm button updates customer balance
    - _Requirements: 6.14_

  - [~] 31.5 Create ViewDetailsDialog (Generic)
    - Create src/components/dialogs/ViewDetailsDialog.tsx
    - Reusable dialog for displaying full details of any entity
    - Accept entity data and field configuration as props
    - Display fields in organized sections
    - Close button only (read-only view)
    - _Requirements: Various view detail requirements_

  - [~] 31.6 Create FinancialLedgerDialog (Employee)
    - Create src/components/dialogs/FinancialLedgerDialog.tsx
    - Display employee info at top
    - Table with all transactions: date, type, amount, notes, running balance
    - Export to PDF button
    - Export to Excel button
    - _Requirements: 13.19, 13.20_

  - [~] 31.7 Create EmploymentHistoryDialog
    - Create src/components/dialogs/EmploymentHistoryDialog.tsx
    - Display employee name at top
    - Table with all employment periods: start date, end date, salary, termination reason
    - Order by start_date descending
    - Close button
    - _Requirements: 13.21_

- [ ] 32. Mobile Interface Development
  - [~] 32.1 Create mobile routing structure
    - Create mobile routes under /m/* path
    - Mobile-specific pages: MobileDashboard, MobilePOS, MobileProducts
    - Use mobile breakpoint detection: useIsMobile() hook
    - Redirect desktop users from mobile routes
    - _Requirements: Mobile interface requirements_

  - [~] 32.2 Create MobileDashboard page
    - Create src/pages/mobile/MobileDashboard.tsx
    - Simplified statistics cards optimized for small screens
    - Stack cards vertically
    - Large touch-friendly buttons
    - Quick access to POS and Products
    - _Requirements: Mobile dashboard requirements_

  - [~] 32.3 Create MobilePOS page
    - Create src/pages/mobile/MobilePOS.tsx
    - Full-screen product grid
    - Prominent search and barcode scanner button
    - Bottom sheet for cart (slide up to view)
    - Large, touch-friendly product cards
    - Support native camera for barcode scanning
    - _Requirements: Mobile POS requirements_

  - [~] 32.4 Create MobileProducts page
    - Create src/pages/mobile/MobileProducts.tsx
    - Simple product list optimized for mobile
    - Search at top
    - Product cards show essential info only
    - Swipe gestures for actions
    - _Requirements: Mobile products requirements_

- [~] 33. Checkpoint - All UI Components Complete
  - Test all dialogs open and close correctly
  - Verify form validation works in all dialogs
  - Test CRUD operations through dialogs
  - Verify print functionality for invoices and barcodes
  - Test mobile pages on small screens
  - Check dialog responsiveness on mobile
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 34. Printing System Implementation
  - [~] 34.1 Create invoice template component
    - Create src/components/InvoiceTemplate.tsx
    - Use React Portal to render into body for printing
    - Include: company header, invoice number, date, customer info
    - Items table with columns: item, quantity, price, total
    - Footer with: subtotal, tax, grand total, thank you message
    - Support both A4 and thermal paper layouts
    - _Requirements: 7.1, 7.2, 7.6_

  - [~] 34.2 Create print-specific CSS styles
    - Add @media print rules in CSS
    - Hide all page elements except print area
    - Set proper page size and margins for A4
    - Set width for thermal papers (58mm, 80mm, 110mm)
    - Ensure proper font sizes for readability
    - Remove backgrounds and shadows for better printing
    - _Requirements: 7.12_

  - [~] 34.3 Create barcode template for printing
    - Create src/components/BarcodeTemplate.tsx
    - Use JsBarcode library to render barcode
    - Include product name and price below barcode
    - Support multiple copies on same page
    - Use @media print CSS to control layout
    - _Requirements: 4.6, 4.7, 4.8_

  - [~] 34.4 Implement window.print() integration
    - Create utility function: triggerPrint(element)
    - Wait for images and barcodes to load before printing
    - Handle print dialog cancellation gracefully
    - Reset page state after print completion
    - _Requirements: 7.11_

- [ ] 35. Performance Optimization
  - [~] 35.1 Implement code splitting with React.lazy()
    - Lazy load all page components
    - Use Suspense with loading fallback
    - Split large dialogs into separate chunks
    - Verify chunk sizes with build analysis
    - _Requirements: Performance requirement 1.2_

  - [~] 35.2 Optimize images and assets
    - Compress product images automatically on upload
    - Use WebP format for better compression
    - Implement lazy loading for images in lists
    - Add loading placeholders
    - _Requirements: Performance requirement 1.3_

  - [~] 35.3 Configure TanStack Query caching strategy
    - Set appropriate staleTime for different data types
    - Products: 5 minutes (changes frequently)
    - Settings: 30 minutes (rarely changes)
    - Dashboard stats: 1 minute (real-time)
    - Implement optimistic updates for mutations
    - Add background refetching for active queries
    - _Requirements: Performance requirement 1.4_

  - [~] 35.4 Implement pagination and infinite scroll
    - Use pagination for tables (20 items per page)
    - Implement infinite scroll for mobile lists (50 items per batch)
    - Add loading indicators for pagination
    - Prefetch next page for better UX
    - _Requirements: Performance requirement 1.4_

  - [~] 35.5 Optimize API responses
    - Backend: Use Laravel API Resources for consistent response format
    - Backend: Implement pagination on all list endpoints
    - Backend: Add select() to queries to fetch only needed columns
    - Backend: Use eager loading to prevent N+1 queries
    - Frontend: Implement request debouncing for search inputs (300ms)
    - _Requirements: Performance requirement 1.5_

- [ ] 36. Testing Implementation
  - [ ]* 36.1 Write unit tests for utility functions
    - Test barcode generation logic
    - Test calculation functions (tax, totals, balances)
    - Test date formatting and Arabic number conversion
    - Test validation helpers
    - Use Vitest as test runner
    - _Requirements: Testing strategy requirements_

  - [ ]* 36.2 Write component tests for UI components
    - Test StatCard renders correctly with different variants
    - Test Button component with different variants
    - Test IconBox component with different icons
    - Test form validation in dialogs
    - Use React Testing Library
    - _Requirements: Testing strategy requirements_

  - [ ]* 36.3 Write integration tests for critical flows
    - Test complete POS checkout flow
    - Test product creation with barcode generation
    - Test order creation with stock reduction
    - Test customer balance updates
    - Test damaged item approval workflow
    - Use Vitest + React Testing Library
    - _Requirements: Testing strategy requirements_

  - [ ]* 36.4 Write E2E tests for main user journeys
    - Test login and authentication flow
    - Test creating a sale from POS
    - Test managing products (create, edit, delete)
    - Test managing customers
    - Test generating reports
    - Use Playwright for E2E testing
    - _Requirements: Testing strategy requirements_

  - [ ]* 36.5 Write backend API tests
    - Test authentication endpoints
    - Test CRUD operations for all models
    - Test role-based access control
    - Test transaction rollback on errors
    - Test validation rules
    - Use PHPUnit with Laravel testing helpers
    - _Requirements: Testing strategy requirements_

- [ ] 37. Tauri Desktop Integration
  - [~] 37.1 Initialize Tauri project
    - Install Tauri CLI: `npm install -D @tauri-apps/cli`
    - Initialize Tauri: `npm run tauri init`
    - Configure tauri.conf.json with app name, identifier, icon
    - Set window size and title
    - Enable dev tools for development
    - _Requirements: Desktop wrapper requirements_

  - [~] 37.2 Create Tauri commands for backend control
    - Create Rust command: start_backend(backend_path)
    - Create Rust command: stop_backend()
    - Create Rust command: check_backend_status()
    - Expose commands to JavaScript via Tauri API
    - _Requirements: Master mode auto-start requirement_

  - [~] 37.3 Implement auto-start backend option
    - Add checkbox in settings: "Auto-start server on launch"
    - Store preference in Tauri store
    - On app launch: if enabled, start Laravel backend automatically
    - Show server status in system tray
    - _Requirements: 2.4_

  - [~] 37.4 Configure Tauri build settings
    - Set bundle identifier for app store
    - Configure updater for automatic updates
    - Set app icon for Windows, macOS, Linux
    - Configure app permissions (file system, network)
    - Test build: `npm run tauri build`
    - _Requirements: Desktop deployment requirements_

- [ ] 38. Deployment Preparation
  - [~] 38.1 Configure environment variables
    - Create .env.example files for both frontend and backend
    - Document all required environment variables
    - Set production API URLs
    - Configure database credentials
    - Set secure APP_KEY for Laravel
    - _Requirements: Deployment requirements_

  - [~] 38.2 Optimize frontend production build
    - Run production build: `npm run build`
    - Analyze bundle size: `npm run build -- --analyze`
    - Ensure code splitting reduces initial load
    - Verify assets are properly hashed for cache busting
    - Test production build locally
    - _Requirements: Performance requirement 1.1_

  - [~] 38.3 Configure Laravel for production
    - Set APP_ENV=production
    - Set APP_DEBUG=false
    - Configure database connection pooling
    - Enable query caching
    - Set up API rate limiting
    - Configure CORS for production domains
    - _Requirements: Production security requirements_

  - [~] 38.4 Set up database backup strategy
    - Create automated backup script (daily backups)
    - Store backups in secure location
    - Test backup restoration procedure
    - Document backup and restore process
    - _Requirements: Data integrity requirements_

  - [~] 38.5 Create deployment documentation
    - Write deployment guide for backend (Laravel)
    - Write deployment guide for frontend (React)
    - Document Tauri desktop app installation
    - Create user manual in Arabic
    - Document network setup for Master/Employee mode
    - _Requirements: Documentation requirements_

- [ ] 39. Final Testing and Quality Assurance
  - [~] 39.1 Perform full system integration testing
    - Test all 20 pages with real data
    - Test all 26 dialogs functionality
    - Verify all API endpoints work correctly
    - Test role-based access for all 3 roles
    - Test network modes (Master and Employee)
    - _Requirements: All functional requirements_

  - [~] 39.2 Perform security testing
    - Test authentication and token expiration
    - Verify role-based access cannot be bypassed
    - Test SQL injection prevention
    - Test XSS prevention
    - Verify sensitive data is not exposed in logs
    - _Requirements: Security requirements_

  - [~] 39.3 Perform performance testing
    - Test page load times (< 3 seconds target)
    - Test with large datasets (10,000+ products)
    - Test concurrent users (10+ simultaneous)
    - Test mobile performance on low-end devices
    - Identify and fix performance bottlenecks
    - _Requirements: Performance requirements_

  - [~] 39.4 Perform usability testing
    - Test with actual users (managers, accountants, sales reps)
    - Gather feedback on UI/UX
    - Test Arabic RTL layout correctness
    - Test printing on actual thermal and regular printers
    - Test barcode scanning with actual scanners
    - _Requirements: Usability requirements_

  - [~] 39.5 Bug fixes and refinements
    - Fix all critical and high-priority bugs
    - Address usability issues from testing
    - Refine UI based on user feedback
    - Optimize slow operations
    - Update documentation with changes
    - _Requirements: Quality requirements_

- [~] 40. Final Checkpoint and Delivery
  - Verify all 22 database tables are properly populated with test data
  - Verify all 20 API controllers are functioning correctly
  - Verify all 22 Laravel models with relationships work
  - Verify all 20 pages render correctly with data
  - Verify all 26 dialogs open and perform CRUD operations
  - Test complete user journeys from login to report generation
  - Verify Tauri desktop build works on Windows
  - Verify mobile interface works on iOS and Android
  - Verify printing works for both invoice types and barcodes
  - Verify network Master/Employee mode configuration works
  - Ensure all documentation is complete and accurate
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each major phase ends with a checkpoint to ensure quality before proceeding
- All code should follow TypeScript strict mode and Laravel best practices
- Arabic RTL layout must be properly implemented throughout
- Security is paramount: never expose sensitive data, always validate inputs
- Performance should be monitored: aim for <3s page loads
- All financial calculations must be accurate to 2 decimal places
- Stock management must prevent negative inventory
- Transactional operations must use database transactions for atomicity


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "18.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "18.2", "18.3"]
    },
    {
      "id": 2,
      "tasks": ["1.3", "1.4", "18.4", "18.5"]
    },
    {
      "id": 3,
      "tasks": ["1.5", "2.1", "19.1", "19.2", "19.3", "19.4", "19.5"]
    },
    {
      "id": 4,
      "tasks": ["2.2", "2.3", "2.4", "20.1", "20.2", "20.3"]
    },
    {
      "id": 5,
      "tasks": ["3.1", "3.2", "3.3", "4.1", "22.1"]
    },
    {
      "id": 6,
      "tasks": ["3.4", "4.2", "5.1", "22.2"]
    },
    {
      "id": 7,
      "tasks": ["5.2", "5.3", "5.4", "23.1", "23.2"]
    },
    {
      "id": 8,
      "tasks": ["7.1", "7.2", "23.3", "24.1"]
    },
    {
      "id": 9,
      "tasks": ["7.3", "7.4", "24.2", "24.3"]
    },
    {
      "id": 10,
      "tasks": ["8.1", "8.2", "8.3", "25.1", "25.2"]
    },
    {
      "id": 11,
      "tasks": ["9.1", "9.2", "9.3", "10.1", "26.1", "26.2"]
    },
    {
      "id": 12,
      "tasks": ["10.2", "10.3", "10.4", "11.1", "26.3", "26.4"]
    },
    {
      "id": 13,
      "tasks": ["11.2", "11.3", "12.1", "26.5", "26.6"]
    },
    {
      "id": 14,
      "tasks": ["12.2", "12.3", "13.1", "26.7", "26.8"]
    },
    {
      "id": 15,
      "tasks": ["13.2", "13.3", "13.4", "13.5", "14.1", "26.9", "26.10"]
    },
    {
      "id": 16,
      "tasks": ["14.2", "14.3", "14.4", "16.1", "26.11", "26.12", "26.13"]
    },
    {
      "id": 17,
      "tasks": ["16.2", "16.3", "16.4", "16.5", "17.1", "17.2"]
    },
    {
      "id": 18,
      "tasks": ["28.1", "28.2", "28.3", "28.4", "28.5"]
    },
    {
      "id": 19,
      "tasks": ["29.1", "29.2", "29.3", "29.4", "29.5", "29.6"]
    },
    {
      "id": 20,
      "tasks": ["30.1", "30.2", "30.3", "30.4", "30.5", "30.6", "30.7"]
    },
    {
      "id": 21,
      "tasks": ["31.1", "31.2", "31.3", "31.4", "31.5", "31.6", "31.7"]
    },
    {
      "id": 22,
      "tasks": ["32.1", "32.2", "32.3", "32.4"]
    },
    {
      "id": 23,
      "tasks": ["34.1", "34.2", "34.3", "34.4"]
    },
    {
      "id": 24,
      "tasks": ["35.1", "35.2", "35.3", "35.4", "35.5"]
    },
    {
      "id": 25,
      "tasks": ["36.1", "36.2", "36.3", "36.4", "36.5"]
    },
    {
      "id": 26,
      "tasks": ["37.1", "37.2", "37.3", "37.4"]
    },
    {
      "id": 27,
      "tasks": ["38.1", "38.2", "38.3", "38.4", "38.5"]
    },
    {
      "id": 28,
      "tasks": ["39.1", "39.2", "39.3", "39.4", "39.5"]
    }
  ]
}
```
