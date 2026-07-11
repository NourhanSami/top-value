# Requirements Document

## Introduction

نظام إدارة المخازن ونقاط البيع (Stock Manager POS System) هو نظام متكامل لإدارة عمليات البيع والمخزون والعملاء والموردين في بيئة تجارية. يعمل النظام كتطبيق Desktop (باستخدام Tauri) وWeb Application على الشبكة المحلية (LAN)، مع دعم واجهة موبايل منفصلة. النظام يستهدف الشركات التي تحتاج إدارة مخازن متعددة (رئيسية وفرعية) مع نظام صلاحيات متقدم لثلاثة أدوار: المدير، المحاسب، والمندوب.

يتكون النظام من:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Laravel 11 + MySQL + Sanctum للمصادقة
- **Desktop Wrapper**: Tauri
- **Mobile Interface**: واجهة React منفصلة للأجهزة المحمولة

النظام يدعم 20 صفحة رئيسية، 26 نافذة حوار للعمليات، 22 جدول قاعدة بيانات، ونظام طباعة متقدم للفواتير والباركود.

## Glossary

- **System**: النظام الكامل لإدارة المخازن ونقاط البيع
- **POS_Module**: وحدة نقطة البيع (Point of Sale)
- **Backend_API**: خادم Laravel الذي يوفر واجهات برمجية RESTful
- **Frontend_App**: تطبيق React الذي يعمل على المتصفح أو Desktop
- **Database**: قاعدة بيانات MySQL
- **Auth_System**: نظام المصادقة باستخدام Laravel Sanctum
- **User**: مستخدم النظام (مدير، محاسب، أو مندوب)
- **Warehouse**: مخزن (رئيسي أو فرعي)
- **Product**: منتج في المخزون
- **Customer**: عميل يقوم بعمليات شراء
- **Supplier**: مورّد يتم الشراء منه
- **Order**: طلب بيع (فاتورة بيع)
- **Purchase_Invoice**: فاتورة شراء من مورد
- **Sales_Return**: عملية إرجاع منتجات (منفردة أو فاتورة كاملة)
- **Damaged_Item**: منتج تالف يحتاج موافقة
- **Employee**: موظف في النظام (غير المستخدمين)
- **Expense**: مصروف من الصندوق
- **Custody_Transfer**: نقل عهدة مخزن من مندوب لآخر
- **Activity_Log**: سجل نشاط في النظام
- **Capital**: رأس المال الابتدائي
- **Settings**: إعدادات النظام والمتجر
- **Role**: دور المستخدم (مدير، محاسب، مندوب)
- **Tax**: ضريبة القيمة المضافة
- **Payment_Method**: طريقة الدفع (نقد، آجل، كارت)
- **Barcode**: الباركود الخاص بالمنتج
- **Invoice_Template**: قالب طباعة الفاتورة
- **Printer_Type**: نوع الطابعة (حرارية أو عادية)
- **Network_Mode**: وضع الشبكة (Master أو Employee)
- **Report**: تقرير (مبيعات، مخزون، عملاء، مالي)

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a system user, I want to securely log in to the system and have access restricted based on my role, so that sensitive operations are protected and users can only perform actions they are authorized for.

#### Acceptance Criteria

1. THE Auth_System SHALL support three roles: "مدير" (Manager), "محاسب" (Accountant), and "مندوب" (Sales Representative)
2. WHEN a User submits valid credentials, THE Auth_System SHALL authenticate the User using Laravel Sanctum token-based authentication
3. WHEN a User submits invalid credentials, THE Auth_System SHALL return an error message indicating authentication failure
4. THE Auth_System SHALL store the authentication token in browser localStorage
5. THE Auth_System SHALL include the authentication token in all subsequent API requests via Authorization header
6. WHEN a User logs out, THE Auth_System SHALL invalidate the token and clear it from localStorage
7. WHEN an API request returns HTTP 401 status, THE Frontend_App SHALL clear the token and redirect to login page
8. THE System SHALL restrict access to pages based on User role according to the permissions matrix defined in the documentation
9. THE Frontend_App SHALL display the User's name, role badge, and assigned warehouse (if applicable) in the header
10. WHERE a User has the "مدير" role, THE System SHALL grant access to all 16 pages including Users management
11. WHERE a User has the "محاسب" role, THE System SHALL grant access to 13 pages excluding POS, Users, and certain management functions
12. WHERE a User has the "مندوب" role, THE System SHALL grant access to 5 pages: POS, Customers, Returns, Damaged Items, and Wastage approval viewing

### Requirement 2: Network Configuration and Multi-Device Setup

**User Story:** As a system administrator, I want to configure the system to work in Master or Employee mode on a local network, so that multiple devices can connect to a central server and share data in real-time.

#### Acceptance Criteria

1. THE System SHALL support two network modes: "Master" (main server) and "Employee" (client device)
2. WHERE the System is in Master mode, THE System SHALL display the server IP address and port for other devices to connect
3. WHERE the System is in Master mode, THE System SHALL provide a "click to copy" function for the IP:Port string
4. WHERE the System is in Master mode AND running on Tauri, THE System SHALL provide an option to automatically start the server on application launch
5. WHERE the System is in Employee mode, THE System SHALL provide input fields for entering the Master server's IP and port
6. WHERE the System is in Employee mode, THE System SHALL provide a "Test Connection" button that verifies connectivity to the Master server
7. THE Frontend_App SHALL display connection status indicators for Database and API with colors: green (connected), red (disconnected), yellow (checking), orange (starting)
8. THE System SHALL store the network configuration (api_base_url and network_mode) in localStorage
9. THE System SHALL provide a Network Settings Dialog accessible from the login page via a settings icon
10. WHEN the User clicks "Test Connection" in Employee mode, THE System SHALL send a health check request to the configured API endpoint and display the result

### Requirement 3: Product Management

**User Story:** As a manager or accountant, I want to manage products including adding, editing, viewing, and tracking inventory levels, so that I can maintain accurate stock information across warehouses.

#### Acceptance Criteria

1. THE System SHALL store products with the following attributes: id, name, barcode, price, cost_price, stock, warehouse_id, supplier_id, category, description, image_path, reorder_level, production_date, expiry_date
2. WHEN a User creates a Product without providing a barcode, THE System SHALL automatically generate a unique barcode
3. THE Database SHALL enforce uniqueness on the barcode field
4. THE System SHALL categorize stock levels as: "منخفض" (low) when stock ≤ reorder_level, "متوسط" (medium) when stock is between reorder_level and reorder_level × 2, and "متوفر" (available) when stock > reorder_level × 2
5. THE System SHALL display expiry status badges: "منتهي الصلاحية" (expired) when current date > expiry_date, and "قرب انتهاء الصلاحية" (near expiry) when 75% of shelf life has elapsed
6. THE System SHALL support filtering products by: name, barcode, category, stock level status, and warehouse
7. THE System SHALL provide two view modes: table view and card view
8. THE System SHALL display statistics cards showing: total products count, available products count, medium stock count, and low stock count
9. WHEN a User with "مدير" or "محاسب" role accesses the Products page, THE System SHALL allow viewing and managing all products
10. WHEN a User with "مندوب" role attempts to access the Products page, THE System SHALL deny access
11. THE System SHALL support product operations: create, read, update, and soft delete
12. WHERE a Product is associated with orders, THE System SHALL prevent hard deletion and require soft delete instead

### Requirement 4: Barcode Generation and Printing

**User Story:** As a user managing products, I want to generate and print barcodes for products, so that I can use barcode scanners for quick product identification during sales and inventory operations.

#### Acceptance Criteria

1. THE System SHALL generate barcodes using the JsBarcode library
2. THE System SHALL support barcode format CODE128
3. WHEN a Product is created without a barcode, THE System SHALL automatically generate a unique numeric barcode
4. THE System SHALL display a small barcode image (width 80-64px) in the products table for each product
5. WHEN a User clicks "Print Barcode" for a Product, THE System SHALL open a Print Barcode Dialog
6. THE Print_Barcode_Dialog SHALL allow the User to select: paper size (A4, 58mm, 80mm, 110mm) and number of copies
7. WHEN the User confirms printing, THE System SHALL render the barcode with product name and price, then trigger window.print()
8. THE System SHALL use CSS @media print rules to show only the barcode print area and hide all other page elements during printing
9. THE System SHALL generate barcodes that are scannable by standard barcode readers

### Requirement 5: Point of Sale (POS) Operations

**User Story:** As a sales representative or manager, I want to process sales transactions quickly using a POS interface with barcode scanning support, so that I can serve customers efficiently and accurately.

#### Acceptance Criteria

1. THE POS_Module SHALL display products in a grid layout with responsive columns (2-4 columns based on screen size)
2. THE POS_Module SHALL provide a search field that filters products by name or barcode in real-time
3. THE POS_Module SHALL support barcode scanning input for quick product lookup
4. THE POS_Module SHALL display category filter buttons with horizontal scrolling
5. WHEN a User clicks on a Product card, THE POS_Module SHALL add the product to the shopping cart
6. THE POS_Module SHALL prevent adding products from different warehouses to the same cart
7. WHEN a User attempts to add a product from a different warehouse, THE System SHALL display a warning message and prevent the addition
8. THE POS_Module SHALL display a cart sidebar (width 384px) showing: selected customer, cart items, subtotal, tax amount, and total
9. THE POS_Module SHALL allow adjusting item quantities in the cart using increment/decrement buttons
10. THE POS_Module SHALL prevent setting quantities that exceed available stock
11. THE POS_Module SHALL provide a "Complete Sale" button that opens the payment dialog
12. THE Complete_Sale_Dialog SHALL display: total amount, payment method selection (نقد/cash, آجل/credit, كارت/card), amount paid input, remaining balance, and customer's new balance if applicable
13. WHEN the User completes payment, THE System SHALL create an Order record with status "completed"
14. WHEN the User completes payment, THE System SHALL reduce product stock quantities accordingly
15. WHEN the User completes payment AND a customer is selected, THE System SHALL update the customer's balance if payment method is credit
16. WHEN an Order is successfully created, THE System SHALL open an Invoice Preview Dialog with print controls
17. THE POS_Module SHALL clear the cart after successful order completion and invoice dialog closure
18. THE System SHALL assign a unique order_number to each Order automatically
19. WHEN a User with "مندوب" or "مدير" role accesses POS, THE System SHALL allow full access to POS operations
20. WHEN a User with "محاسب" role attempts to access POS, THE System SHALL deny access

### Requirement 6: Customer Management

**User Story:** As a system user, I want to manage customer information including contact details, VIP status, and purchase history, so that I can provide better service and track customer relationships.

#### Acceptance Criteria

1. THE System SHALL store customers with attributes: id, name, phone, status, added_by, is_vip, vip_color, created_at, updated_at, deleted_at
2. THE System SHALL support customer status values: "pending" (pending approval) and "approved" (approved)
3. THE System SHALL default new customer status to "approved"
4. THE System SHALL support marking customers as VIP with a customizable color badge
5. THE System SHALL display statistics cards showing: total customers, VIP customers count, active customers (recent purchases), and total purchase amount
6. WHERE there are customers with "pending" status AND the User has "مدير" role, THE System SHALL display a "Pending Approval" statistics card
7. THE System SHALL provide filtering options: pending approval, VIP customers only, and active customers
8. THE System SHALL display customers in card view by default, showing: avatar with first letter, VIP star badge if applicable, pending approval badge if applicable, phone, address, total purchases, and last purchase date
9. THE System SHALL highlight customers with purchases today in green
10. WHERE a Customer has "pending" status AND the User has "مدير" role, THE System SHALL provide an "Approve Customer" action that changes status to "approved"
11. THE System SHALL support soft delete for customers
12. THE System SHALL track which User added each Customer via the added_by field
13. THE System SHALL support assigning customers to specific sales representatives
14. THE System SHALL allow updating customer balance when processing credit sales or collecting payments

### Requirement 7: Invoice Generation and Printing

**User Story:** As a user processing sales, I want to generate and print professional invoices with company details and tax calculations, so that I can provide customers with proper sales documentation.

#### Acceptance Criteria

1. THE System SHALL generate invoices containing: company name, company description, phone numbers, address, commercial registration number, tax number, invoice number, date, customer name, itemized products list, subtotal, tax amount, and total
2. THE System SHALL support two printer types: "thermal" (حرارية) and "regular" (عادية)
3. WHERE printer type is "thermal", THE System SHALL support paper sizes: 58mm, 80mm, and 110mm
4. WHERE printer type is "regular", THE System SHALL support paper size: A4
5. THE System SHALL provide a Print Controls component that allows selecting printer type and paper size before printing
6. THE Invoice_Template SHALL display items in a table with columns: item name, quantity, unit price, and total price
7. THE Invoice_Template SHALL calculate and display: subtotal (sum of all items), tax amount (if tax is enabled in settings), and grand total
8. WHEN tax is enabled in Settings, THE Invoice_Template SHALL include the tax percentage and calculated tax amount
9. WHEN tax is not enabled in Settings, THE Invoice_Template SHALL not display tax-related information
10. THE Invoice_Template SHALL include a footer with: "شكراً لتعاملكم معنا" (Thank you message) and "نتمنى لكم يوماً سعيداً" (Well wishes)
11. WHEN the User clicks "Print", THE System SHALL use window.print() API to trigger the browser print dialog
12. THE System SHALL use CSS @media print rules to display only the invoice template and hide all other page elements during printing
13. THE System SHALL support printing from the invoice preview dialog after completing a sale
14. THE System SHALL support reprinting invoices from the invoices list page

### Requirement 8: Warehouse Management

**User Story:** As a manager or accountant, I want to manage multiple warehouses with different types (main/branch) and assign representatives to them, so that I can organize inventory across locations and track responsibility.

#### Acceptance Criteria

1. THE System SHALL support two warehouse types: "رئيسي" (main) and "فرعي" (branch)
2. THE System SHALL default new warehouses to type "فرعي"
3. THE System SHALL support assigning one or more representatives (Users with "مندوب" role) to each warehouse
4. THE System SHALL display warehouse statistics: total products count and total inventory value
5. THE System SHALL provide filtering by warehouse type: all, main, or branch
6. THE System SHALL display warehouse cards showing: name, type badge, custody status badge (if temporary custody), assigned representatives list, products count, and total value
7. THE System SHALL use different icons for warehouse types: Warehouse icon for main warehouses, Truck icon for branch warehouses
8. THE System SHALL allow creating, editing, and viewing warehouses
9. THE System SHALL allow deleting only branch warehouses (type "فرعي")
10. THE System SHALL prevent deleting main warehouses
11. THE System SHALL provide a "Transfer Stock" button that is disabled when there are fewer than 2 warehouses
12. THE System SHALL track temporary custody status when a warehouse is under temporary transfer
13. WHERE a Warehouse has products, THE System SHALL prevent deletion and require transferring products first

### Requirement 9: Custody Transfer Between Representatives

**User Story:** As a manager, I want to transfer warehouse custody from one representative to another either permanently or temporarily with a return date, so that I can manage staff changes and temporary assignments.

#### Acceptance Criteria

1. THE System SHALL support two custody transfer types: "permanent" (دائم) and "temporary" (مؤقت)
2. THE System SHALL support custody transfer statuses: "pending", "accepted", "rejected", and "completed"
3. WHEN creating a custody transfer, THE System SHALL require: warehouse selection, from_user (current representative), to_user (new representative), and transfer type
4. WHERE transfer type is "temporary", THE System SHALL require a return_date
5. THE System SHALL allow adding optional notes to custody transfers
6. WHEN a custody transfer is created, THE System SHALL set initial status to "pending"
7. THE System SHALL allow the receiving User to accept or reject the custody transfer
8. WHEN a custody transfer is accepted, THE System SHALL update the warehouse's assigned representative
9. WHERE custody transfer type is "temporary" AND status is "accepted", THE System SHALL mark the warehouse with a "temporary custody" badge
10. THE System SHALL provide a custody history log for each warehouse showing all past transfers
11. THE System SHALL track custody transfer records with timestamps for audit purposes

### Requirement 10: Supplier Management and Purchase Invoices

**User Story:** As a manager or accountant, I want to manage suppliers and record purchase invoices with payment tracking, so that I can maintain supplier relationships and track inventory purchases.

#### Acceptance Criteria

1. THE System SHALL store suppliers with attributes: id, name, phone, email, address, balance, created_at, updated_at
2. THE System SHALL track supplier balance where positive balance means "we owe the supplier" and negative balance means "supplier owes us"
3. THE System SHALL support creating, editing, viewing, and deleting suppliers
4. THE System SHALL display supplier statistics: total suppliers count, total products from suppliers, and total transactions
5. THE System SHALL display supplier balance with color coding: red for positive balance (we owe), green for negative balance (they owe us)
6. THE System SHALL store purchase invoices with attributes: id, invoice_number, supplier_id, invoice_date, total_amount, payment_status, remaining_amount
7. THE System SHALL support three payment statuses for purchase invoices: "paid" (مدفوع), "partial" (جزئي), and "unpaid" (آجل)
8. WHEN creating a purchase invoice, THE System SHALL auto-generate a unique invoice_number
9. THE System SHALL store purchase invoice line items with attributes: purchase_invoice_id, product_id, quantity, unit_price, total_price
10. WHEN a purchase invoice is saved, THE System SHALL automatically increase the stock quantity for each product in the invoice
11. WHEN a purchase invoice is deleted, THE System SHALL automatically decrease the stock quantity for each product in the invoice
12. THE System SHALL calculate remaining_amount as total_amount minus amount_paid
13. THE System SHALL display purchase invoice statistics: total invoices count, total purchase amount, and current month purchases
14. THE System SHALL display purchase invoices in a table showing: invoice number, supplier name, date, items count, total amount, payment status badge, and actions
15. THE System SHALL allow viewing invoice details including all line items

### Requirement 11: Sales Returns Management

**User Story:** As a user, I want to process product returns either for individual items or entire invoices with different refund methods, so that I can handle customer returns and maintain accurate inventory.

#### Acceptance Criteria

1. THE System SHALL support two return types: "single" (منتج منفرد) and "full_invoice" (فاتورة كاملة)
2. THE System SHALL support two refund methods: "cash" (نقدي) and "credit" (رصيد دائن)
3. WHERE return type is "single", THE System SHALL require: product selection, quantity, refund amount, and reason
4. WHERE return type is "full_invoice", THE System SHALL require: order selection, refund amount, and reason
5. WHEN a return is processed, THE System SHALL create a sales_return record with attributes: id, order_id, product_id, quantity, refund_amount, refund_method, reason, return_type
6. WHEN a return is processed, THE System SHALL increase the product stock by the returned quantity
7. WHERE refund method is "credit", THE System SHALL update the customer's balance to reflect the credit amount
8. THE System SHALL display return statistics: total returns count, single returns count, full invoice returns count, and total refund amount
9. THE System SHALL display returns in a table showing: type badge, product/invoice identifier, quantity, amount, refund method badge, reason, date, and actions
10. THE System SHALL color-code return type badges: blue for full invoice, cyan for single item
11. THE System SHALL color-code refund method badges: green for cash, orange for credit
12. THE System SHALL allow all roles (مدير, محاسب, مندوب) to access and process returns

### Requirement 12: Damaged Items and Approval Workflow

**User Story:** As a user, I want to report damaged items that require manager approval before affecting inventory, so that there is oversight on inventory write-offs and loss tracking.

#### Acceptance Criteria

1. THE System SHALL store damaged items with attributes: id, product_id, warehouse_id, quantity, loss_amount, reason, status, reported_by, created_at, updated_at
2. THE System SHALL support three damaged item statuses: "pending" (في انتظار الموافقة), "approved" (معتمد), and "rejected" (مرفوض)
3. WHEN a damaged item is reported, THE System SHALL set initial status to "pending"
4. THE System SHALL require: product selection, warehouse, quantity, loss amount, and reason when reporting damaged items
5. THE System SHALL display damaged item statistics: total cases count, total damaged quantity, pending approval count, and total approved losses
6. THE System SHALL allow filtering damaged items by warehouse
7. THE System SHALL display damaged items in a table showing: product name, warehouse, quantity, loss value, status badge with icon, reported by user, reason, date, and actions
8. THE System SHALL use color-coded status badges: orange with Clock icon for pending, green with CheckCircle icon for approved, red with XCircle icon for rejected
9. WHERE a damaged item status is "pending" AND the User has "مدير" role, THE System SHALL provide "Approve" and "Reject" actions
10. WHEN a damaged item is approved, THE System SHALL decrease the product stock by the damaged quantity
11. WHEN a damaged item is approved, THE System SHALL record the loss amount in financial records
12. WHEN a damaged item is rejected, THE System SHALL not affect product stock or financial records
13. THE System SHALL track who reported each damaged item via the reported_by field
14. THE System SHALL allow deleting damaged item records
15. THE System SHALL prevent Users without "مدير" role from approving or rejecting damaged items

### Requirement 13: Employee Management and Payroll

**User Story:** As a manager or accountant, I want to manage employees with their salary payments, bonuses, advances, and employment history, so that I can track HR information and payroll separately from system users.

#### Acceptance Criteria

1. THE System SHALL distinguish between Users (system access) and Employees (HR records)
2. THE System SHALL store employees with attributes: id, name, position, phone, base_salary, hire_date
3. THE System SHALL support two employee statuses: active and archived
4. THE System SHALL store employment records with attributes: id, employee_id, salary, start_date, end_date, termination_reason
5. THE System SHALL store salary payments with attributes: id, employee_id, amount, type (salary/bonus), date, notes
6. THE System SHALL store employee advances with attributes: id, employee_id, amount, date
7. THE System SHALL provide two tabs for employees: "Active Employees" and "Archive"
8. THE System SHALL display employee statistics: active count, archived count, and total count
9. THE System SHALL support filtering employees by position
10. THE System SHALL display employees in a table showing: name, position, phone, base salary, and actions
11. WHERE an Employee is active, THE System SHALL provide actions: edit details, view employment history, view financial ledger, record salary/bonus payment, record advance, and terminate employment
12. WHERE an Employee is archived, THE System SHALL provide actions: edit details, view employment history, view financial ledger, and rehire
13. WHEN recording a salary or bonus payment, THE System SHALL require: payment type, amount, date, and optional notes
14. WHEN recording an advance, THE System SHALL retrieve and display the employee's available advance limit from the API endpoint
15. WHEN terminating an employee, THE System SHALL require: termination reason and termination date
16. WHEN an employee is terminated, THE System SHALL move them to the archived tab and create an employment record with end_date
17. WHEN rehiring an employee, THE System SHALL require: new salary and rehire date
18. WHEN an employee is rehired, THE System SHALL move them back to active tab and create a new employment record
19. THE System SHALL provide a financial ledger for each employee showing: all salary payments, bonuses, advances, and running balance
20. THE System SHALL support exporting an employee's financial statement
21. THE System SHALL display employment history for each employee showing all employment periods with dates and termination reasons if applicable

### Requirement 14: Expense Tracking

**User Story:** As a manager or accountant, I want to record and categorize business expenses, so that I can track spending across different categories and generate financial reports.

#### Acceptance Criteria

1. THE System SHALL store expenses with attributes: id, title, amount, category, date, notes
2. THE System SHALL support six expense categories: "general" (عامة), "car" (سيارات), "rent" (إيجار), "services" (خدمات), "salary" (رواتب), and "other" (أخرى)
3. THE System SHALL display expense statistics: total expenses amount and total operations count
4. THE System SHALL provide filtering options: by category (multiple selection with checkboxes), high amounts (> 1000), and last 30 days
5. THE System SHALL display expenses in a table showing: title, amount with red styling, category badge, date, notes, and actions
6. THE System SHALL allow creating, viewing, editing, and deleting expenses
7. WHEN creating an expense, THE System SHALL require: title, amount, category, and date
8. THE System SHALL allow adding optional notes to expenses
9. THE System SHALL support multiple category selection in filters
10. THE System SHALL calculate total expenses dynamically based on applied filters

### Requirement 15: Capital Setup and Financial Overview

**User Story:** As a manager, I want to initialize the system with starting capital including cash and inventory value, so that I can track profitability and asset changes over time.

#### Acceptance Criteria

1. THE System SHALL support two states for capital: uninitialized and initialized
2. WHERE capital is uninitialized, THE System SHALL display an explanation banner and setup form
3. WHERE capital is uninitialized, THE System SHALL display: calculated inventory value and net debt (customer debts - supplier debts)
4. WHERE capital is uninitialized, THE System SHALL require the User to enter: actual cash in drawer
5. WHEN the User submits capital initialization, THE System SHALL calculate starting capital as: inventory value + actual cash + (customer debts - supplier debts)
6. WHEN capital is initialized, THE System SHALL store: starting_capital amount and initialization_date
7. WHERE capital is initialized, THE System SHALL display statistics cards: starting capital with date, current assets estimate, and profit/loss
8. WHERE capital is initialized, THE System SHALL calculate profit/loss as: current assets - starting capital
9. WHERE profit/loss is positive, THE System SHALL display it with green styling
10. WHERE profit/loss is negative, THE System SHALL display it with red styling
11. WHERE capital is initialized, THE System SHALL display asset breakdown: inventory value, cash balance, customer debts (green), and supplier debts (red)
12. THE System SHALL provide a capital summary API endpoint that returns all financial metrics

### Requirement 16: Reporting System

**User Story:** As a manager or accountant, I want to generate various reports filtered by time periods, so that I can analyze business performance and make informed decisions.

#### Acceptance Criteria

1. THE System SHALL support four report types: "sales" (مبيعات), "inventory" (مخزون), "customers" (عملاء), and "financial" (مالي)
2. THE System SHALL support five time periods: "daily" (يومي), "weekly" (أسبوعي), "monthly" (شهري), "quarterly" (ربعي), and "yearly" (سنوي)
3. THE System SHALL provide a period selector with options: today, this week, this month, and this year
4. THE System SHALL display report statistics cards: sales report, orders report, inventory report, and customers report
5. THE System SHALL display trend indicators (up/down arrows with percentage) on report cards
6. THE System SHALL allow creating custom reports by selecting: report type and time period
7. WHEN a custom report is created, THE System SHALL generate the report and save it to recent reports list
8. THE System SHALL display a list of recent reports with: report name, type badge, and download button
9. THE System SHALL support downloading reports in exportable format
10. THE System SHALL calculate trend percentages by comparing current period data with previous period

### Requirement 17: Activity Logging and Archiving

**User Story:** As a manager or accountant, I want to track all system activities with the ability to archive or delete old logs, so that I can audit operations and maintain system performance.

#### Acceptance Criteria

1. THE System SHALL log activities with attributes: id, user_id, activity_type, description, details (JSON), reference_type, reference_id, status, timestamp
2. THE System SHALL support eleven activity types: "sale", "purchase", "expense", "payment", "return", "damaged", "employee", "product", "warehouse", "customer", "supplier"
3. THE System SHALL support two activity statuses: "active" and "archived"
4. THE System SHALL provide two tabs: "Active Logs" and "Archive"
5. THE System SHALL display activity statistics: active logs count, archived logs count, and today's activities count
6. THE System SHALL provide search functionality for: description text and user name
7. THE System SHALL support bulk operations: archive selected logs and delete selected logs
8. THE System SHALL provide filtering by: activity type (multiple selection with checkboxes), user, and date range (from/to)
9. THE System SHALL display activity logs in a table with: selection checkbox, type badge, description, user name, date, and individual actions
10. THE System SHALL use color-coded activity type badges with specific colors for each type as defined in the documentation
11. THE System SHALL support "Select All" functionality with visual indicators: CheckSquare for all selected, Square for none selected, indeterminate state for partial selection
12. WHEN bulk archive is clicked, THE System SHALL archive all selected active logs
13. WHEN bulk delete is clicked, THE System SHALL permanently delete all selected logs
14. THE System SHALL allow individual archive and delete actions for each log
15. THE System SHALL provide a "Clear Filters" button to reset all applied filters
16. THE System SHALL automatically log significant operations including: sales, purchases, returns, damaged items, employee changes, product changes, warehouse changes, customer changes, and supplier changes

### Requirement 18: System Settings Management

**User Story:** As a manager, I want to configure system settings including store information, tax rates, and network configuration, so that the system operates according to my business requirements.

#### Acceptance Criteria

1. THE System SHALL provide three settings categories: "Store Information" (معلومات المتجر), "Finance and Taxes" (المالية والضرائب), and "Network Settings" (إعدادات الشبكة)
2. THE System SHALL store settings as key-value pairs in the database
3. WHERE settings category is "Store Information", THE System SHALL support: company name, company description, phone numbers (multiple with types: mobile/landline/fax), address, commercial registration number, and tax number
4. THE System SHALL allow adding multiple phone numbers with a "Add Phone" button
5. THE System SHALL allow deleting individual phone numbers
6. WHERE settings category is "Finance and Taxes", THE System SHALL provide a toggle to enable/disable VAT (Value Added Tax)
7. WHERE VAT is enabled, THE System SHALL provide a percentage input field with default value of 15%
8. WHERE VAT is disabled, THE System SHALL not apply tax to invoices
9. WHERE settings category is "Network Settings", THE System SHALL display two configuration modes: Master and Employee
10. WHERE network mode is "Master", THE System SHALL display: current server IP:Port with copy button, and option to auto-start server (Tauri only)
11. WHERE network mode is "Employee", THE System SHALL provide: IP input field, Port input field, "Test Connection" button, and "Save" button
12. WHEN "Test Connection" is clicked in Employee mode, THE System SHALL send a health check request and display connection status
13. THE System SHALL provide a "Save" button at the top-right of each settings section
14. WHEN settings are saved, THE System SHALL persist them to the database
15. THE System SHALL load settings from the database when the application starts
16. THE System SHALL use stored settings for: invoice templates, tax calculations, and API connections

### Requirement 19: User Management and Role Assignment

**User Story:** As a super admin, I want to manage system users including creating accounts, assigning roles, and changing permissions, so that I can control who has access to the system and what they can do.

#### Acceptance Criteria

1. THE System SHALL designate one User as "Super Admin" identified by email "admin@example.com"
2. THE System SHALL restrict user creation to Super Admin only
3. THE System SHALL display users in a table showing: user name with avatar, contact information (email and phone), role badge, status badge, last login date, and actions
4. THE System SHALL display a crown icon and "مدير عام" (Super Admin) text for the Super Admin user
5. THE System SHALL support user operations: create, view, edit, change role, and change status
6. WHEN creating or editing a User, THE System SHALL require: name, email, phone, role selection, and status selection
7. WHEN creating a new User, THE System SHALL require a password
8. WHEN editing an existing User, THE System SHALL allow password to be optional (only change if provided)
9. THE System SHALL provide a "Change Role" dialog available only to Super Admin
10. THE Change_Role_Dialog SHALL display a role selector with the three available roles
11. WHEN a role is changed, THE System SHALL update the User's permissions immediately
12. THE System SHALL prevent the Super Admin from changing their own role
13. THE System SHALL display user status with badges: active (green) or inactive (red)
14. THE System SHALL prevent inactive users from logging in
15. THE System SHALL track last login timestamp for each user

### Requirement 20: Dashboard and Quick Actions

**User Story:** As a manager or accountant, I want to see an overview dashboard with key metrics and quick action shortcuts, so that I can quickly assess business status and perform common tasks.

#### Acceptance Criteria

1. THE System SHALL display four statistics cards on the dashboard: total sales, orders count, products in stock, and active customers
2. THE Total_Sales_Card SHALL display: total sales amount in SAR, and percentage change from yesterday
3. THE Orders_Count_Card SHALL display: total orders count, and percentage change from yesterday
4. THE Products_In_Stock_Card SHALL display: total products count, and count of products needing reorder
5. THE Active_Customers_Card SHALL display: active customers count, and new customers this week count
6. THE System SHALL display a "Recent Sales" section showing the latest orders from the API dashboard endpoint
7. THE System SHALL display a "Quick Actions" grid with 6 action cards: assign representative to warehouse, add product, add customer, quick report, transfer stock, and add warehouse
8. WHEN a quick action card is clicked, THE System SHALL open the corresponding dialog or navigate to the relevant page
9. THE System SHALL display a "Top Products" section showing best-selling products
10. THE System SHALL auto-refresh dashboard data every 5 seconds
11. WHEN any dialog is open, THE System SHALL pause the auto-refresh
12. WHEN all dialogs are closed, THE System SHALL resume the auto-refresh
13. THE System SHALL fetch dashboard data from the `/api/dashboard` endpoint
14. THE System SHALL display trend indicators with up/down arrows and percentage changes where applicable

### Requirement 21: Mobile Interface

**User Story:** As a mobile user, I want to access key system functions through a mobile-optimized interface, so that I can perform sales and check information on mobile devices.

#### Acceptance Criteria

1. THE System SHALL provide a separate mobile interface accessible at the `/m` route prefix
2. THE Mobile_Interface SHALL include five main sections: Dashboard, Products, Customers, POS, and More
3. THE Mobile_Interface SHALL use a bottom navigation bar with 5 tabs
4. THE Mobile_Interface SHALL provide components optimized for mobile: MobileHeader, MobileCard, MobileButton, MobileInput
5. THE Mobile_POS SHALL integrate a barcode scanner that uses the device camera
6. WHEN a barcode is scanned in Mobile POS, THE System SHALL query the API endpoint `/api/mobile/scan/{barcode}` to retrieve product information
7. THE Mobile_Dashboard SHALL display simplified statistics from the `/api/mobile/dashboard` endpoint
8. THE Mobile_Products SHALL display products in a card-based layout optimized for mobile screens
9. THE Mobile_Customers SHALL display customer cards with touch-optimized actions
10. THE Mobile_Interface SHALL adapt to mobile screen sizes with responsive layouts
11. THE System SHALL use touch-friendly button sizes (minimum 44x44px) in mobile interface
12. THE Mobile_Interface SHALL support swipe gestures where appropriate

### Requirement 22: Data Validation and Integrity

**User Story:** As a system administrator, I want the system to enforce data validation rules and maintain referential integrity, so that data remains consistent and accurate.

#### Acceptance Criteria

1. THE Database SHALL enforce unique constraints on: user email, product barcode, order order_number, and purchase_invoice invoice_number
2. THE Database SHALL enforce foreign key constraints for all relationships
3. WHEN a referenced record is deleted, THE System SHALL handle the deletion according to the defined cascade rules
4. WHERE a Warehouse is deleted, THE System SHALL cascade delete all associated Products
5. WHERE a User is deleted, THE System SHALL set the warehouse representative_id to NULL instead of deleting the warehouse
6. WHERE an Order is deleted, THE System SHALL cascade delete all associated Order_Items
7. THE System SHALL use soft deletes for Customers to preserve historical data
8. THE System SHALL prevent deletion of records that are referenced by other active records unless cascade delete is defined
9. THE System SHALL validate required fields before submitting forms
10. THE System SHALL validate data types: emails must be valid email format, phone numbers must contain only digits and valid characters, numeric fields must contain only numbers
11. THE System SHALL validate business rules: quantities must not exceed available stock, payment amounts must not be negative, dates must be valid
12. WHEN validation fails, THE System SHALL display clear error messages indicating what needs to be corrected
13. THE System SHALL validate on both frontend and backend to ensure data integrity even if frontend validation is bypassed

### Requirement 23: Search and Filtering

**User Story:** As a system user, I want to search and filter data across different pages, so that I can quickly find specific records without scrolling through large lists.

#### Acceptance Criteria

1. THE System SHALL provide search functionality on pages: Products, Customers, Activity Logs, and POS
2. THE Products_Search SHALL filter by: product name, barcode, and category
3. THE Customers_Search SHALL filter by: customer name and phone number
4. THE Activity_Logs_Search SHALL filter by: description text and user name
5. THE POS_Search SHALL filter by: product name and barcode with real-time results
6. THE System SHALL perform search as-you-type with a debounce delay of 300 milliseconds
7. THE System SHALL highlight search matches in results where applicable
8. THE System SHALL provide advanced filtering options beyond text search
9. THE Products_Advanced_Filter SHALL include: stock level status (low/medium/available) with visual checkboxes
10. THE Customers_Advanced_Filter SHALL include: pending approval, VIP only, active only
11. THE Activity_Logs_Advanced_Filter SHALL include: activity type (multi-select), user selection, and date range (from/to dates)
12. THE Expenses_Advanced_Filter SHALL include: category (multi-select), high amounts (>1000), last 30 days
13. THE Damaged_Items_Advanced_Filter SHALL include: warehouse (multi-select)
14. THE System SHALL provide a "Clear Filters" button that resets all filters to default values
15. THE System SHALL persist filter selections during the user session
16. THE System SHALL display filter counts or indicators showing how many filters are active

### Requirement 24: Responsive Design and RTL Support

**User Story:** As a user accessing the system from different devices, I want the interface to adapt to my screen size and display properly in right-to-left layout, so that I have a good experience regardless of device or language direction.

#### Acceptance Criteria

1. THE System SHALL use right-to-left (RTL) direction for all Arabic text and layouts
2. THE System SHALL use the Cairo font from Google Fonts as the primary typeface
3. THE System SHALL support responsive breakpoints: mobile (<640px), tablet (640-1024px), and desktop (>1024px)
4. THE System SHALL adapt grid layouts based on screen size: 1 column on mobile, 2 columns on tablet, 3-4 columns on desktop
5. THE System SHALL make the sidebar collapsible on mobile devices
6. THE System SHALL display the sidebar at 80px width when collapsed and 264px width when expanded
7. THE System SHALL expand the sidebar on mouse hover and collapse on mouse leave with a 300ms transition
8. THE System SHALL adjust the main content area margin based on sidebar state
9. THE System SHALL stack form fields vertically on mobile and display them in rows on desktop
10. THE System SHALL make tables horizontally scrollable on mobile devices
11. THE System SHALL use touch-friendly button sizes (minimum 44x44px) on mobile
12. THE System SHALL use appropriate font sizes: 14px base, 12px for secondary text, 16-24px for headings
13. THE System SHALL maintain consistent spacing using Tailwind's spacing scale
14. THE System SHALL ensure all interactive elements are accessible via keyboard navigation
15. THE System SHALL test layouts at common screen resolutions: 320px, 768px, 1024px, 1440px, and 1920px

### Requirement 25: Performance and Optimization

**User Story:** As a system user, I want the application to load quickly and respond to my actions without delays, so that I can work efficiently without frustration.

#### Acceptance Criteria

1. THE System SHALL load the initial page within 3 seconds on a standard broadband connection
2. THE System SHALL use code splitting to load only necessary JavaScript for each page
3. THE System SHALL lazy load images and non-critical components
4. THE System SHALL implement pagination for large datasets with page sizes: 20 items for tables, 50 items for infinite scroll
5. THE System SHALL cache API responses using TanStack Query with appropriate stale times
6. THE System SHALL debounce search inputs by 300 milliseconds to reduce API calls
7. THE System SHALL use optimistic updates for immediate user feedback on mutations
8. THE System SHALL compress assets in production builds
9. THE System SHALL minimize bundle size by tree-shaking unused code
10. THE System SHALL use production mode builds for deployment with minification
11. THE System SHALL implement virtual scrolling for very large lists (>1000 items)
12. THE System SHALL show loading indicators during data fetching operations
13. THE System SHALL show skeleton loaders for improved perceived performance
14. THE System SHALL handle API errors gracefully with user-friendly error messages
15. THE System SHALL retry failed API requests up to 3 times with exponential backoff

### Requirement 26: Security and Data Protection

**User Story:** As a system administrator, I want the system to protect sensitive data and prevent unauthorized access, so that business information and customer data remain secure.

#### Acceptance Criteria

1. THE System SHALL hash all passwords using bcrypt with a cost factor of at least 10
2. THE System SHALL never store passwords in plain text
3. THE System SHALL transmit authentication tokens securely using HTTPS in production
4. THE System SHALL include authentication tokens in HTTP-only headers to prevent XSS attacks
5. THE System SHALL validate all user inputs on the backend to prevent SQL injection
6. THE System SHALL use parameterized queries or ORM methods for all database operations
7. THE System SHALL sanitize user inputs to prevent XSS attacks
8. THE System SHALL implement rate limiting on authentication endpoints: maximum 5 login attempts per minute per IP address
9. THE System SHALL expire authentication tokens after 24 hours of inactivity
10. THE System SHALL require re-authentication for sensitive operations after token expiration
11. THE System SHALL log all authentication attempts (successful and failed) with timestamps and IP addresses
12. THE System SHALL implement role-based access control (RBAC) on all API endpoints
13. WHEN an API endpoint is accessed, THE System SHALL verify the user's role has permission for that operation
14. THE System SHALL return HTTP 403 status for unauthorized access attempts
15. THE System SHALL not expose sensitive error details in production error messages
16. THE System SHALL validate file uploads to prevent malicious file execution
17. THE System SHALL implement CORS (Cross-Origin Resource Sharing) restrictions to allow only trusted origins
18. THE System SHALL regularly update dependencies to patch security vulnerabilities
19. THE System SHALL perform security audits using npm audit or equivalent tools
20. THE System SHALL backup the database daily and retain backups for at least 30 days

### Requirement 27: Error Handling and User Feedback

**User Story:** As a system user, I want to receive clear feedback when errors occur or operations succeed, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. THE System SHALL display toast notifications for: successful operations, errors, warnings, and informational messages
2. THE System SHALL use color-coded notifications: green for success, red for errors, orange for warnings, blue for information
3. THE System SHALL auto-dismiss success notifications after 3 seconds
4. THE System SHALL keep error notifications visible until manually dismissed
5. THE System SHALL display error messages in Arabic with clear descriptions of what went wrong
6. WHEN a form validation fails, THE System SHALL highlight the invalid fields with red borders and display error messages below each field
7. WHEN an API request fails, THE System SHALL display a user-friendly error message, not raw API error codes
8. THE System SHALL provide actionable error messages that tell users how to fix the problem
9. THE System SHALL handle network errors gracefully with messages like "تعذر الاتصال بالخادم" (Cannot connect to server)
10. THE System SHALL show loading spinners or progress indicators during long operations
11. THE System SHALL disable action buttons during submission to prevent double-submission
12. WHEN a dialog operation is in progress, THE System SHALL show a loading state on the submit button
13. THE System SHALL display confirmation dialogs for destructive operations (delete, terminate, etc.)
14. THE Confirmation_Dialog SHALL clearly state what will be deleted and require explicit confirmation
15. THE System SHALL provide undo functionality for reversible destructive operations where feasible
16. THE System SHALL log frontend errors to the console in development mode for debugging
17. THE System SHALL implement a global error boundary to catch React rendering errors

### Requirement 28: Accessibility

**User Story:** As a user with accessibility needs, I want the interface to be navigable with keyboard and compatible with screen readers, so that I can use the system effectively.

#### Acceptance Criteria

1. THE System SHALL support full keyboard navigation using Tab, Enter, Escape, and Arrow keys
2. THE System SHALL provide visible focus indicators on all interactive elements with a clear outline or background change
3. THE System SHALL use semantic HTML elements: header, nav, main, section, article, footer
4. THE System SHALL provide ARIA labels for icon-only buttons and actions
5. THE System SHALL use ARIA roles where semantic HTML is insufficient
6. THE System SHALL ensure color is not the only means of conveying information (use icons and text labels)
7. THE System SHALL maintain a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text
8. THE System SHALL support screen reader announcements for dynamic content changes
9. THE System SHALL provide skip navigation links for keyboard users
10. THE System SHALL make all form inputs accessible with proper labels associated using for/id attributes
11. THE System SHALL announce validation errors to screen readers
12. THE System SHALL ensure modals trap focus within the dialog when open
13. WHEN a modal is closed, THE System SHALL return focus to the element that opened it
14. THE System SHALL provide alternative text for all meaningful images
15. THE System SHALL ensure table headers are properly associated with data cells

### Requirement 29: Backup and Data Recovery

**User Story:** As a system administrator, I want to backup system data regularly and restore it when needed, so that I can protect against data loss from hardware failures or errors.

#### Acceptance Criteria

1. THE System SHALL support database backup functionality
2. THE System SHALL create daily automatic backups at a scheduled time (default: 2:00 AM)
3. THE System SHALL store backups in a secure location separate from the main database
4. THE System SHALL retain daily backups for at least 30 days
5. THE System SHALL provide a manual backup button accessible to users with "مدير" role
6. WHEN a manual backup is initiated, THE System SHALL create a timestamped backup file
7. THE System SHALL include all tables in backups: users, warehouses, products, customers, suppliers, orders, purchase_invoices, expenses, employees, activity_logs, settings, and all related tables
8. THE System SHALL provide a restore function that allows selecting a backup file to restore
9. WHEN restoring a backup, THE System SHALL display a confirmation dialog warning that current data will be overwritten
10. THE System SHALL verify backup file integrity before restoration
11. THE System SHALL log all backup and restore operations in activity logs
12. THE System SHALL export data in SQL dump format for compatibility
13. THE System SHALL support exporting specific data ranges or tables for partial backups
14. THE System SHALL compress backup files to reduce storage space
15. THE System SHALL provide backup status indicators showing last backup date and next scheduled backup

### Requirement 30: Notification System

**User Story:** As a system user, I want to receive notifications about important events like low stock, pending approvals, and system alerts, so that I can take timely action.

#### Acceptance Criteria

1. THE System SHALL provide a notification dropdown in the header with a bell icon
2. THE System SHALL display an unread count badge on the notification icon when there are unread notifications
3. THE System SHALL generate notifications for the following events: product stock falls below reorder level, damaged item pending approval, custody transfer pending acceptance, customer pending approval, product approaching expiry date (within 30 days)
4. THE System SHALL display notifications in reverse chronological order (newest first)
5. THE System SHALL show notification type icon, title, description, and time ago for each notification
6. WHEN a User clicks on a notification, THE System SHALL mark it as read and navigate to the relevant page
7. THE System SHALL provide a "Mark All as Read" action in the notification dropdown
8. THE System SHALL store notifications in the database for persistence across sessions
9. THE System SHALL allow users to dismiss individual notifications
10. THE System SHALL limit the notification dropdown display to the 10 most recent notifications
11. THE System SHALL provide a "View All Notifications" link that navigates to a full notifications page
12. THE System SHALL use color-coded notification types: info (blue), warning (orange), success (green), error (red)
13. WHERE a User has "مدير" role, THE System SHALL show approval-related notifications
14. WHERE a User has "مندوب" role, THE System SHALL show stock and customer-related notifications only
15. THE System SHALL check for new notifications every 30 seconds when the user is active

### Requirement 31: Multi-Language Support Foundation

**User Story:** As a system administrator, I want the system architecture to support multiple languages, so that we can expand to other markets in the future.

#### Acceptance Criteria

1. THE System SHALL separate all user-facing text from code using a translation system
2. THE System SHALL support Arabic as the primary language
3. THE System SHALL store all translatable strings in JSON files organized by page or feature
4. THE System SHALL provide a language selector component that can switch between available languages
5. THE System SHALL persist the user's language preference in localStorage
6. THE System SHALL apply the selected language to the entire interface including: labels, buttons, error messages, validation messages, and notifications
7. THE System SHALL support RTL layout for right-to-left languages and LTR for left-to-right languages
8. THE System SHALL format numbers, dates, and currencies according to the selected language locale
9. THE System SHALL provide translation files in a structure that supports adding new languages without code changes
10. THE System SHALL use a library like react-i18next or similar for translation management
11. THE System SHALL allow hot-reloading of translations in development mode

### Requirement 32: Audit Trail and Compliance

**User Story:** As a compliance officer, I want to track all data changes with who made them and when, so that we can meet regulatory requirements and investigate discrepancies.

#### Acceptance Criteria

1. THE System SHALL log all create, update, and delete operations on critical entities: Products, Customers, Suppliers, Orders, Purchase_Invoices, Employees, Users, Warehouses
2. THE System SHALL store audit records with attributes: entity_type, entity_id, action (create/update/delete), user_id, old_values (JSON), new_values (JSON), timestamp, ip_address
3. THE System SHALL capture the complete state before and after changes for update operations
4. THE System SHALL make audit records immutable (cannot be edited or deleted except by system administrator)
