export type Role = "seller" | "buyer" | "lp" | "admin";

export type ComplianceStatus =
  | "approved"
  | "pending_review"
  | "restricted"
  | "expired";

export type ComplianceLevel =
  | "standard"
  | "enhanced"
  | "institutional";

export type ReceivableStatus =
  | "Draft"
  | "Issued"
  | "BuyerAcknowledged"
  | "FinanceEligible"
  | "Funded"
  | "Paid"
  | "Cleared"
  | "Overdue"
  | "Disputed"
  | "Rejected";

export type SettlementStatus =
  | "scheduled"
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "held";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved"
  | "rejected";

export type RiskBand = "Low" | "Moderate" | "Elevated" | "Watchlist";

export type FundingStatus = "open" | "committed" | "fully_funded";

export type ComplianceBadgeTone = "positive" | "warning" | "negative" | "neutral";

export type TxState = "idle" | "pending" | "success" | "failed";

export interface User {
  id: string;
  entityName: string;
  wallet: `0x${string}`;
  role: Role;
  jurisdiction: string;
  sector: string;
  complianceStatus: ComplianceStatus;
  complianceLevel: ComplianceLevel;
  badges: string[];
  recommendedTerms: string;
  reliabilityScore: number;
}

export interface CounterpartyProfile {
  id: string;
  entityName: string;
  jurisdiction: string;
  sector: string;
  reliabilityLabel: string;
  settlementSuccessRate: number;
  onTimeRate: number;
  disputeRate: number;
  clearedReceivables: number;
  averageDaysToSettle: number;
}

export interface RiskFactor {
  label: string;
  impact: "positive" | "neutral" | "negative";
  detail: string;
}

export interface RiskScore {
  receivableId: string;
  score: number;
  band: RiskBand;
  advanceRateRecommendation: number;
  expectedSettlementConfidence: number;
  confidenceLabel: string;
  payerConcentration: number;
  anomalyFlags: string[];
  agingBucket: string;
  memo: string;
  factors: RiskFactor[];
}

export interface Settlement {
  id: string;
  receivableId: string;
  amount: number;
  dueDate: string;
  initiatedAt: string;
  completedAt?: string;
  status: SettlementStatus;
  rail: "HSP_MOCK" | "HSP_LIVE";
  reference: string;
  explorerPath: string;
  feeAmount: number;
  holdbackAmount: number;
  waterfall: Array<{ label: string; amount: number }>;
}

export interface Dispute {
  id: string;
  receivableId: string;
  openedBy: Role;
  status: DisputeStatus;
  reason: string;
  openedAt: string;
  updatedAt: string;
  resolutionSummary?: string;
}

export interface FundingOffer {
  id: string;
  receivableId: string;
  providerId: string;
  advanceRate: number;
  discountRateBps: number;
  holdbackPercent: number;
  status: FundingStatus;
}

export interface FundingPosition {
  id: string;
  receivableId: string;
  providerId: string;
  amount: number;
  fundedAt: string;
  expectedYieldBps: number;
  status: "active" | "repaid" | "delayed";
}

export interface ActivityEvent {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  tone: "positive" | "warning" | "negative" | "neutral";
  actor: string;
  receivableId?: string;
}

export interface DashboardMetrics {
  totalReceivables: number;
  financedVolume: number;
  outstandingExposure: number;
  settlementSuccessRate: number;
  averageDaysToFund: number;
  overdueExposure: number;
  totalSettledVolume: number;
}

export interface PortfolioMetrics {
  deployedCapital: number;
  availableCapital: number;
  utilizationRate: number;
  averageAdvanceRate: number;
  weightedYieldBps: number;
  delayedExposure: number;
}

export interface Receivable {
  id: string;
  referenceNumber: string;
  sellerId: string;
  buyerId: string;
  sellerEntityName: string;
  buyerEntityName: string;
  amount: number;
  requestedFinancingAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  sector: string;
  jurisdiction: string;
  description: string;
  memo: string;
  documentHash: string;
  holdbackPercent: number;
  status: ReceivableStatus;
  riskBand: RiskBand;
  riskScore: number;
  complianceEligible: boolean;
  buyerAcknowledgedAt?: string;
  anomalyFlags: string[];
  fundingProgress: number;
  indicativeAdvanceRate: number;
  indicativeDiscountBps: number;
  settlementStatus: SettlementStatus;
  lastUpdated: string;
}

export interface ModeConfig {
  appMode: "demo" | "live";
  hspMode: "mock" | "live";
}

export interface CreateReceivableInput {
  sellerEntityName: string;
  buyerEntityOrWallet: string;
  referenceNumber: string;
  amount: number;
  requestedFinancingAmount: number;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  currency: string;
  sector: string;
  jurisdiction: string;
  description: string;
  holdbackPercent: number;
  memo: string;
  documentHash: string;
}
