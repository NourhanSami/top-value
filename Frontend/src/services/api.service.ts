import api from '../lib/api';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication
export const authService = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<ApiResponse<{
      user: any;
      token: string;
      refreshToken: string;
    }>>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData) => {
    const response = await api.post<ApiResponse<{
      user: any;
      token: string;
    }>>('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get<ApiResponse<any>>('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post<ApiResponse<{
      token: string;
      refreshToken: string;
    }>>('/auth/refresh', { refreshToken });
    return response.data;
  }
};

// Products
export const productService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/products', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/products/${id}`);
    return response.data;
  },

  getByBarcode: async (barcode: string) => {
    const response = await api.get<ApiResponse<any>>(`/products/barcode/${barcode}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<ApiResponse<any>>('/products/statistics');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/products', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/products/${id}`);
    return response.data;
  }
};

// Categories
export const categoryService = {
  getAll: async () => {
    const response = await api.get<ApiResponse<any[]>>('/categories');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/categories/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/categories', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/categories/${id}`);
    return response.data;
  }
};

// Customers
export const customerService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/customers', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/customers/${id}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<ApiResponse<any>>('/customers/statistics');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/customers', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/customers/${id}`);
    return response.data;
  },

  updateBalance: async (id: number, data: { amount: number; operation: 'add' | 'subtract'; notes?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/customers/${id}/update-balance`, data);
    return response.data;
  }
};

// Sales
export const saleService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/sales', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/sales/${id}`);
    return response.data;
  },

  getByInvoiceNumber: async (invoiceNumber: string) => {
    const response = await api.get<ApiResponse<any>>(`/sales/invoice/${invoiceNumber}`);
    return response.data;
  },

  getStatistics: async (params?: any) => {
    const response = await api.get<ApiResponse<any>>('/sales/statistics', { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/sales', data);
    return response.data;
  }
};

// Suppliers
export const supplierService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/suppliers', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/suppliers/${id}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<ApiResponse<any>>('/suppliers/statistics');
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/suppliers', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/suppliers/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/suppliers/${id}`);
    return response.data;
  },

  pay: async (id: number, data: { amount: number; notes?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/suppliers/${id}/pay`, data);
    return response.data;
  }
};

// Purchase Orders
export const purchaseOrderService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/purchase-orders', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/purchase-orders/${id}`);
    return response.data;
  },

  getStatistics: async (params?: any) => {
    const response = await api.get<ApiResponse<any>>('/purchase-orders/statistics', { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/purchase-orders', data);
    return response.data;
  },

  receive: async (id: number, data: any) => {
    const response = await api.post<ApiResponse<any>>(`/purchase-orders/${id}/receive`, data);
    return response.data;
  },

  updateStatus: async (id: number, data: { status: string }) => {
    const response = await api.put<ApiResponse<any>>(`/purchase-orders/${id}/status`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/purchase-orders/${id}`);
    return response.data;
  }
};

// Expenses
export const expenseService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/expenses', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/expenses/${id}`);
    return response.data;
  },

  getStatistics: async (params?: any) => {
    const response = await api.get<ApiResponse<any>>('/expenses/statistics', { params });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get<ApiResponse<any[]>>('/expenses/categories');
    return response.data;
  },

  createCategory: async (data: { name: string; nameEn?: string; description?: string }) => {
    const response = await api.post<ApiResponse<any>>('/expenses/categories', data);
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/expenses', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/expenses/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/expenses/${id}`);
    return response.data;
  },

  approve: async (id: number) => {
    const response = await api.post<ApiResponse<any>>(`/expenses/${id}/approve`);
    return response.data;
  },

  reject: async (id: number, data: { notes?: string }) => {
    const response = await api.post<ApiResponse<any>>(`/expenses/${id}/reject`, data);
    return response.data;
  }
};

// Dashboard
export const dashboardService = {
  getStatistics: async (params?: any) => {
    const response = await api.get<ApiResponse<any>>('/dashboard', { params });
    return response.data;
  },

  getChartData: async (params?: any) => {
    const response = await api.get<ApiResponse<any>>('/dashboard/charts', { params });
    return response.data;
  }
};

// Branches
export const branchService = {
  getAll: async (params?: any) => {
    const response = await api.get<ApiResponse<any[]>>('/branches', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/branches/${id}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<ApiResponse<any>>('/branches/statistics');
    return response.data;
  },

  getPerformance: async (id: number, params?: any) => {
    const response = await api.get<ApiResponse<any>>(`/branches/${id}/performance`, { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/branches', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/branches/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/branches/${id}`);
    return response.data;
  }
};

// Users
export const userService = {
  getAll: async (params?: any) => {
    const response = await api.get<PaginatedResponse<any>>('/users', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<ApiResponse<any>>(`/users/${id}`);
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get<ApiResponse<any>>('/users/statistics');
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get<ApiResponse<any[]>>('/users/roles');
    return response.data;
  },

  getActivity: async (id: number, params?: any) => {
    const response = await api.get<PaginatedResponse<any>>(`/users/${id}/activity`, { params });
    return response.data;
  },

  create: async (data: any) => {
    const response = await api.post<ApiResponse<any>>('/users', data);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put<ApiResponse<any>>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete<ApiResponse<null>>(`/users/${id}`);
    return response.data;
  }
};
