import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler';
import { notFoundHandler } from './middlewares/notFoundHandler';

// Load environment variables
dotenv.config();

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 8000;

// Middlewares
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev')); // HTTP request logger
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Static files
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Stock Manager POS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Stock Manager POS API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      users: '/api/users',
      products: '/api/products',
      sales: '/api/sales',
      customers: '/api/customers',
      suppliers: '/api/suppliers',
      inventory: '/api/inventory',
      reports: '/api/reports'
    }
  });
});

// Import routes
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import customerRoutes from './routes/customerRoutes';
import saleRoutes from './routes/saleRoutes';
import supplierRoutes from './routes/supplierRoutes';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes';
import expenseRoutes from './routes/expenseRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import branchRoutes from './routes/branchRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import saleReturnRoutes from './routes/saleReturnRoutes';
import damagedItemRoutes from './routes/damagedItemRoutes';
import quotationRoutes from './routes/quotationRoutes';
import paymentVoucherRoutes from './routes/paymentVoucherRoutes';
import paymentScheduleRoutes from './routes/paymentScheduleRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import bankAccountRoutes from './routes/bankAccountRoutes';
import inventoryTransferRoutes from './routes/inventoryTransferRoutes';
import emailRoutes from './routes/emailRoutes';
import capitalRoutes from './routes/capitalRoutes';
import activityLogRoutes from './routes/activityLogRoutes';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/returns', saleReturnRoutes);
app.use('/api/damaged-items', damagedItemRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/vouchers', paymentVoucherRoutes);
app.use('/api/payment-schedules', paymentScheduleRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/inventory-transfers', inventoryTransferRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/capital', capitalRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
});

export default app;
