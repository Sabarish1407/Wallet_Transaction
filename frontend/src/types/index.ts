export type Role = 'ROLE_ADMIN' | 'ROLE_CUSTOMER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type WalletStatus = 'ACTIVE' | 'INACTIVE';
export type TransactionType = 'TOP_UP' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
export type LedgerEntryType = 'DEBIT' | 'CREDIT';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type ActivityType =
  | 'USER_CREATED'
  | 'USER_LOGIN'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET'
  | 'WALLET_CREATED'
  | 'WALLET_ACTIVATED'
  | 'WALLET_DEACTIVATED'
  | 'MONEY_ADDED'
  | 'TRANSFER_CREATED'
  | 'TRANSFER_SUCCESS'
  | 'TRANSFER_FAILED'
  | 'ISSUE_CREATED'
  | 'ISSUE_UPDATED'
  | 'ISSUE_RESOLVED'
  | 'ADMIN_ACTION';

export interface User {
  id: number;
  userNumber?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  passwordResetRequired: boolean;
  walletNumber?: string;
  walletBalance?: number;
  temporaryPassword?: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  walletNumber: string;
  userId: number;
  userNumber?: string;
  userEmail: string;
  userFullName: string;
  balance: number;
  currency: string;
  status: WalletStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface LedgerEntry {
  id: number;
  walletNumber: string;
  userEmail: string;
  userFullName: string;
  entryType: LedgerEntryType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  referenceNumber: string;
  senderEmail: string;
  senderName: string;
  senderUserNumber?: string;
  senderWalletNumber: string;
  receiverEmail: string;
  receiverName: string;
  receiverUserNumber?: string;
  receiverWalletNumber: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  note?: string;
  failureReason?: string;
  userRoleInTxn?: 'DEBIT' | 'CREDIT';
  createdAt: string;
  ledgerEntries?: LedgerEntry[];
}

export interface TransactionIssue {
  id: number;
  issueReference: string;
  transactionReference: string;
  transactionAmount: number;
  reportedByEmail: string;
  reportedByName: string;
  title: string;
  description: string;
  status: IssueStatus;
  resolutionNotes?: string;
  resolvedByEmail?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  userEmail: string;
  activityType: ActivityType;
  activityDescription: string;
  entityName: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  status: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalWallets: number;
  totalTransactions: number;
  totalVolume: number;
  totalCredit: number;
  totalDebit: number;
  openIssues: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
