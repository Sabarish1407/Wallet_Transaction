import axios from 'axios';
import {
  AdminDashboardMetrics,
  ApiResponse,
  AuditLog,
  PageResponse,
  Transaction,
  TransactionIssue,
  User,
  Wallet
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('wallet_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error === 'PASSWORD_RESET_REQUIRED') {
      window.dispatchEvent(new CustomEvent('password_reset_required'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<{
      token: string;
      userId: number;
      email: string;
      fullName: string;
      role: 'ROLE_ADMIN' | 'ROLE_CUSTOMER';
      passwordResetRequired: boolean;
    }>>('/auth/login', data),

  resetPassword: (data: { temporaryPassword: string; newPassword: string }) =>
    api.post<ApiResponse<{ token: string; passwordResetRequired: boolean }>>('/auth/reset-password', data),

  getProfile: () => api.get<ApiResponse<User>>('/auth/me'),
};

export const walletApi = {
  getMyWallet: () => api.get<ApiResponse<Wallet>>('/wallet'),

  topUp: (data: { amount: number; note?: string }, idempotencyKey?: string) =>
    api.post<ApiResponse<Wallet>>('/wallet/top-up', data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
};

export const transferApi = {
  transfer: (data: { receiverEmail: string; amount: number; note?: string }, idempotencyKey?: string) =>
    api.post<ApiResponse<any>>('/transfers', data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
};

export const transactionApi = {
  getMyTransactions: (page = 0, size = 10) =>
    api.get<ApiResponse<PageResponse<Transaction>>>(`/transactions?page=${page}&size=${size}`),

  getByReference: (reference: string) =>
    api.get<ApiResponse<Transaction>>(`/transactions/${reference}`),
};

export const issueApi = {
  createIssue: (data: { transactionReference: string; title: string; description: string }) =>
    api.post<ApiResponse<TransactionIssue>>('/issues', data),

  getMyIssues: () => api.get<ApiResponse<TransactionIssue[]>>('/issues'),

  getByReference: (reference: string) =>
    api.get<ApiResponse<TransactionIssue>>(`/issues/${reference}`),
};

export const adminApi = {
  getDashboardMetrics: () => api.get<ApiResponse<AdminDashboardMetrics>>('/admin/dashboard'),

  getUsers: (query = '', page = 0, size = 10) =>
    api.get<ApiResponse<PageResponse<User>>>(`/admin/users?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),

  createUser: (data: { email: string; fullName: string; phone?: string; role?: string; initialPassword?: string }) =>
    api.post<ApiResponse<User>>('/admin/users', data),

  updateUserStatus: (userId: number, status: 'ACTIVE' | 'INACTIVE') =>
    api.patch<ApiResponse<User>>(`/admin/users/${userId}/status`, { status }),

  resetUserCredentials: (userId: number) =>
    api.post<ApiResponse<User>>(`/admin/users/${userId}/reset-password`),

  getTransactions: (query = '', page = 0, size = 10) =>
    api.get<ApiResponse<PageResponse<Transaction>>>(`/admin/transactions?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),

  getTransactionDetails: (reference: string) =>
    api.get<ApiResponse<Transaction>>(`/admin/transactions/${reference}`),

  getIssues: (status?: string, query = '', page = 0, size = 10) =>
    api.get<ApiResponse<PageResponse<TransactionIssue>>>(
      `/admin/issues?${status ? `status=${status}&` : ''}query=${encodeURIComponent(query)}&page=${page}&size=${size}`
    ),

  updateIssueStatus: (issueId: number, data: { status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'; resolutionNotes?: string }) =>
    api.patch<ApiResponse<TransactionIssue>>(`/admin/issues/${issueId}`, data),

  getAuditLogs: (activityType = '', query = '', page = 0, size = 20) =>
    api.get<ApiResponse<PageResponse<AuditLog>>>(
      `/admin/audit-logs?${activityType ? `activityType=${activityType}&` : ''}query=${encodeURIComponent(query)}&page=${page}&size=${size}`
    ),
};

export default api;
