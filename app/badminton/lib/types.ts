export interface Member {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  createdDate: string;
}

export interface MemberSummary {
  attendanceCount: number;
  totalBills: number;
  totalPayments: number;
  outstandingAmount: number;
}

export interface MemberWithSummary extends Member {
  summary: MemberSummary;
}

export interface AttendanceRecord {
  gameId: string;
  gameDate: string;
  location?: string;
}

export interface BillRecord {
  id: string;
  gameId: string;
  memberId: string;
  billAmount: number;
  attendanceFeeAmount: number;
  shuttlecockFeeAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  createdDate: string;
}

export interface MemberBillWithDetails extends BillRecord {
  memberName: string;
  gameDate: string;
  gameLocation?: string;
}

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS';

export interface PaymentRecord {
  id: string;
  memberBillId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  note?: string;
  createdDate: string;
}

export interface PaymentWithDetails extends PaymentRecord {
  memberId: string;
  memberName: string;
  gameId: string;
  gameDate: string;
  billAmount: number;
}

export interface CreatePaymentRequest {
  memberBillId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  note?: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  totalPayments: number;
  revenueThisMonth: number;
  paymentsThisMonth: number;
  byMethod: { method: string; total: number; count: number }[];
  byMember: { memberId: string; memberName: string; total: number; count: number }[];
}

export interface GetPaymentsResponse {
  success: boolean;
  payments: PaymentWithDetails[];
  summary?: RevenueSummary;
  error?: string;
}

export type ExpenseCategory =
  | 'SHUTTLECOCK'
  | 'COURT_RENT'
  | 'TOURNAMENT'
  | 'CONSUMPTION'
  | 'EQUIPMENT'
  | 'OTHER';

export interface ExpenseRecord {
  id: string;
  transactionDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  createdDate: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalTransactions: number;
  expensesThisMonth: number;
  transactionsThisMonth: number;
  byCategory: { category: ExpenseCategory; total: number; count: number }[];
}

export interface CreateExpenseRequest {
  transactionDate?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
}

export interface GetExpensesResponse {
  success: boolean;
  expenses: ExpenseRecord[];
  summary?: ExpenseSummary;
  error?: string;
}

export type IncomeCategory =
  | 'DONATION'
  | 'SPONSOR'
  | 'TOURNAMENT'
  | 'MEMBERSHIP'
  | 'OTHER';

export interface IncomeRecord {
  id: string;
  transactionDate: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  createdDate: string;
}

export interface IncomeSummary {
  totalIncome: number;
  totalTransactions: number;
  incomeThisMonth: number;
  transactionsThisMonth: number;
  byCategory: { category: IncomeCategory; total: number; count: number }[];
  byMethod: { method: string; total: number; count: number }[];
}

export interface CreateIncomeRequest {
  transactionDate?: string;
  category: IncomeCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface GetIncomeResponse {
  success: boolean;
  income: IncomeRecord[];
  summary?: IncomeSummary;
  error?: string;
}

export interface IncomeLineItem {
  id: string;
  date: string;
  source: 'MEMBER' | 'MANUAL';
  label: string;
  category?: IncomeCategory;
  amount: number;
  paymentMethod?: string;
}

export interface FinanceKpis {
  cashBalance: number;
  totalOutstanding: number;
  revenueThisMonth: number;
  expensesThisMonth: number;
  totalGames: number;
  activeMembers: number;
}

export interface CashReport {
  openingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  closingBalance: number;
}

export interface FinanceReport {
  kpis: FinanceKpis;
  cashReport: CashReport;
  revenueSummary: RevenueSummary;
  incomeSummary: IncomeSummary;
  expenseSummary: ExpenseSummary;
  payments: PaymentWithDetails[];
  manualIncome: IncomeRecord[];
  incomeLines: IncomeLineItem[];
  expenses: ExpenseRecord[];
}

export interface GetFinanceReportResponse {
  success: boolean;
  report?: FinanceReport;
  error?: string;
}

export interface BillWithPayments extends MemberBillWithDetails {
  payments: PaymentRecord[];
}

export interface MemberPaymentSummary {
  memberId: string;
  memberName: string;
  bills: BillWithPayments[];
  totalOutstanding: number;
  totalPaid: number;
  totalBilled: number;
  payments: PaymentWithDetails[];
}

export interface PaymentAllocation {
  billId: string;
  gameDate: string;
  outstandingAmount: number;
  allocatedAmount: number;
}

export interface MemberPaymentResult {
  payments: PaymentRecord[];
  billsUpdated: BillRecord[];
  totalAllocated: number;
  allocations: PaymentAllocation[];
}

export interface CreateMemberRequest {
  name: string;
  phoneNumber: string;
  isActive?: boolean;
  createdDate?: string;
}

export interface UpdateMemberRequest {
  name?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface GetMembersResponse {
  success: boolean;
  members: MemberWithSummary[];
  error?: string;
}

export interface GetMemberResponse {
  success: boolean;
  member?: MemberWithSummary;
  attendance?: AttendanceRecord[];
  bills?: BillRecord[];
  payments?: PaymentRecord[];
  error?: string;
}

export interface SystemConfiguration {
  attendanceFee: number;
  defaultShuttlecockPrice: number;
  updatedAt: string;
}

export interface UpdateConfigurationRequest {
  attendanceFee?: number;
  defaultShuttlecockPrice?: number;
}

export interface GetConfigurationResponse {
  success: boolean;
  config?: SystemConfiguration;
  error?: string;
}

export type GameStatus = 'ACTIVE' | 'FINISHED';

export interface Game {
  id: string;
  gameDate: string;
  location?: string;
  status: GameStatus;
  createdDate: string;
}

export interface GamePlayerInfo {
  id: string;
  gameId: string;
  memberId: string;
  memberName: string;
}

export interface GameSettlement {
  id: string;
  gameId: string;
  shuttlecockUsed: number;
  shuttlecockPrice: number;
  attendanceFee: number;
  totalBillAmount: number;
  shuttlecockPerPerson: number;
  createdDate: string;
}

export interface GameBillPreview {
  shuttlecockUsed: number;
  shuttlecockPrice: number;
  totalShuttlecockCost: number;
  shuttlecockPerPerson: number;
  attendanceFee: number;
  billAmountPerMember: number;
  players: {
    memberId: string;
    memberName: string;
    attendanceFeeAmount: number;
    shuttlecockFeeAmount: number;
    billAmount: number;
  }[];
}

export interface BatchGenerateBillsResult {
  gamesProcessed: number;
  billsCreated: number;
  bills: MemberBillWithDetails[];
}

export interface GetBillsResponse {
  success: boolean;
  bills: MemberBillWithDetails[];
  error?: string;
}

export interface GameWithDetails extends Game {
  players: GamePlayerInfo[];
  settlement?: GameSettlement;
  billsGenerated: boolean;
}

export interface CreateGameRequest {
  gameDate: string;
  location?: string;
  playerIds: string[];
}

export interface SettleGameRequest {
  shuttlecockUsed: number;
}

export interface GetGamesResponse {
  success: boolean;
  games: GameWithDetails[];
  error?: string;
}

export interface GetGameResponse {
  success: boolean;
  game?: GameWithDetails;
  preview?: GameBillPreview;
  error?: string;
}
