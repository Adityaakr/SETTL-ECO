import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PublicClient } from "viem";
import { formatEther, formatUnits, keccak256, parseUnits, stringToHex } from "viem";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { toast } from "sonner";
import {
  ActivityEvent,
  ComplianceStatus,
  CreateReceivableInput,
  DashboardMetrics,
  Dispute,
  FundingOffer,
  FundingPosition,
  ModeConfig,
  PortfolioMetrics,
  Receivable,
  RiskFactor,
  RiskScore,
  Role,
  Settlement,
  TxState,
  User,
} from "@/domain/models";
import {
  seedActivity,
  seedDisputes,
  seedFundingOffers,
  seedFundingPositions,
  seedReceivables,
  seedRiskScores,
  seedSettlements,
  seedUsers,
} from "@/data/demo";
import { appMode, getExplorerLink, preferredChain } from "@/lib/hashkey-config";
import { createHspSettlementAdapter } from "@/lib/hsp-adapter";
import { hashKeyIntegrations } from "@/lib/hashkey-integrations";
import {
  getHashKeyKycLevelLabel,
  mapHashKeyKycLevelToCompliance,
  mapHashKeyKycToComplianceStatus,
  readHashKeyKycSnapshot,
} from "@/lib/hashkey-kyc";
import { usePrivyAccount } from "@/hooks/usePrivyAccount";
import { areContractsConfigured, contractAddresses } from "@/lib/contracts";
import {
  AdvanceEngineABI,
  ComplianceGateABI,
  DemoUSDCABI,
  DisputeEscrowABI,
  HspSettlementAdapterABI,
  ReceivableRegistryABI,
  SettlementRouterABI,
} from "@/lib/abis";

interface SettlContextValue {
  currentRole: Role;
  currentUser: User;
  users: User[];
  receivables: Receivable[];
  riskScores: RiskScore[];
  settlements: Settlement[];
  disputes: Dispute[];
  fundingOffers: FundingOffer[];
  fundingPositions: FundingPosition[];
  activity: ActivityEvent[];
  mode: ModeConfig;
  connected: boolean;
  walletAddress?: `0x${string}`;
  liveReady: boolean;
  txStates: Record<string, TxState>;
  setRole: (role: Role) => void;
  connectAs: (role: Role) => void;
  createReceivable: (input: CreateReceivableInput) => Promise<void>;
  acknowledgeReceivable: (
    receivableId: string,
    decision: "approve" | "reject",
  ) => Promise<void>;
  fundReceivable: (receivableId: string) => Promise<void>;
  settleReceivable: (receivableId: string) => Promise<void>;
  releaseHoldback: (receivableId: string) => Promise<void>;
  openDispute: (receivableId: string, reason: string) => Promise<void>;
  resolveDispute: (receivableId: string, resolution: string) => Promise<void>;
  updateComplianceStatus: (
    userId: string,
    status: ComplianceStatus,
  ) => Promise<void>;
  enableCompliance: () => Promise<void>;
  refreshLiveState: () => Promise<void>;
  overviewMetrics: DashboardMetrics;
  portfolioMetrics: PortfolioMetrics;
}

const SettlContext = createContext<SettlContextValue | null>(null);

const initialRole: Role = "seller";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ROLE_NAMES: Record<Role, string> = {
  seller: "BlueWave Exports",
  buyer: "Meridian Retail",
  lp: "North Harbor Capital",
  admin: "SETTL Ops",
};
const ROLE_SECTORS: Record<Role, string> = {
  seller: "Export Services",
  buyer: "Retail",
  lp: "Private Credit",
  admin: "Operations",
};
const ROLE_JURISDICTIONS: Record<Role, string> = {
  seller: "Hong Kong",
  buyer: "Hong Kong",
  lp: "Hong Kong",
  admin: "Hong Kong",
};
const STORAGE_KEYS = {
  receivables: "settl.live.receivableMeta",
  settlements: "settl.live.settlementMeta",
  disputes: "settl.live.disputeMeta",
} as const;

type ReceivableMetaMap = Record<
  string,
  Pick<
    Receivable,
    | "sellerEntityName"
    | "buyerEntityName"
    | "paymentTerms"
    | "sector"
    | "jurisdiction"
    | "description"
    | "memo"
    | "documentHash"
    | "currency"
  >
>;

type SettlementMetaMap = Record<string, { txHash?: string }>;
type DisputeMetaMap = Record<string, { reason?: string; resolution?: string }>;

type LiveComplianceSnapshot = {
  status: ComplianceStatus;
  level: User["complianceLevel"];
  badges: string[];
  recommendedTerms: string;
  reliabilityScore: number;
};

const complianceStatusMap: ComplianceStatus[] = [
  "pending_review",
  "approved",
  "pending_review",
  "restricted",
  "expired",
];
const receivableStatusMap = [
  "Draft",
  "Issued",
  "BuyerAcknowledged",
  "FinanceEligible",
  "Funded",
  "Paid",
  "Cleared",
  "Overdue",
  "Disputed",
  "Rejected",
] as const;

const computeOverviewMetrics = (receivables: Receivable[]): DashboardMetrics => {
  const financedVolume = receivables
    .filter((receivable) =>
      ["Funded", "Paid", "Cleared", "Overdue", "Disputed"].includes(
        receivable.status,
      ),
    )
    .reduce(
      (sum, receivable) => sum + receivable.requestedFinancingAmount,
      0,
    );

  const outstandingExposure = receivables
    .filter((receivable) =>
      ["FinanceEligible", "Funded", "Overdue", "Disputed"].includes(
        receivable.status,
      ),
    )
    .reduce((sum, receivable) => sum + receivable.amount, 0);

  const settled = receivables.filter((receivable) =>
    ["Paid", "Cleared"].includes(receivable.status),
  );

  const overdueExposure = receivables
    .filter((receivable) => receivable.status === "Overdue")
    .reduce((sum, receivable) => sum + receivable.amount, 0);

  return {
    totalReceivables: receivables.length,
    financedVolume,
    outstandingExposure,
    settlementSuccessRate: receivables.length
      ? (settled.length / receivables.length) * 100
      : 0,
    averageDaysToFund: 1.2,
    overdueExposure,
    totalSettledVolume: settled.reduce(
      (sum, receivable) => sum + receivable.amount,
      0,
    ),
  };
};

const computePortfolioMetrics = (
  fundingPositions: FundingPosition[],
): PortfolioMetrics => {
  const deployedCapital = fundingPositions.reduce(
    (sum, position) => sum + position.amount,
    0,
  );
  const delayedExposure = fundingPositions
    .filter((position) => position.status === "delayed")
    .reduce((sum, position) => sum + position.amount, 0);
  const weightedYieldBps = fundingPositions.length
    ? fundingPositions.reduce(
        (sum, position) => sum + position.expectedYieldBps,
        0,
      ) / fundingPositions.length
    : 0;

  return {
    deployedCapital,
    availableCapital: Math.max(0, 500000 - deployedCapital),
    utilizationRate: deployedCapital ? (deployedCapital / 500000) * 100 : 0,
    averageAdvanceRate: fundingPositions.length ? 72 : 0,
    weightedYieldBps,
    delayedExposure,
  };
};

const isBrowser = typeof window !== "undefined";

function loadStorageMap<T>(key: string): Record<string, T> {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function saveStorageMap<T>(key: string, value: Record<string, T>) {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function shortAddress(value?: string) {
  if (!value) return "Unassigned";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function toDateStringFromUnix(value: bigint | number) {
  const seconds = Number(value);
  if (!seconds) return new Date().toISOString().slice(0, 10);
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function unixFromDateString(value: string) {
  return BigInt(Math.floor(new Date(value).getTime() / 1000));
}

function toKey(value: string | number | bigint) {
  return value.toString();
}

function getStructValue<T>(raw: any, key: string, index: number): T {
  return (raw?.[key] ?? raw?.[index]) as T;
}

function toComplianceStatus(value: number): ComplianceStatus {
  return complianceStatusMap[value] ?? "pending_review";
}

function toReceivableStatus(value: number): Receivable["status"] {
  return (
    receivableStatusMap[value] ??
    "Issued"
  ) as Receivable["status"];
}

function deriveRiskFactors(receivable: Receivable): RiskFactor[] {
  const factors: RiskFactor[] = [
    {
      label: "Compliance state",
      impact: receivable.complianceEligible ? "positive" : "negative",
      detail: receivable.complianceEligible
        ? "Counterparties remain eligible for live execution."
        : "Execution is blocked until compliance clears.",
    },
  ];

  if (receivable.status === "Disputed") {
    factors.push({
      label: "Dispute flag",
      impact: "negative",
      detail: "Disputed receivable requires manual resolution before normal flow resumes.",
    });
  }

  if (receivable.status === "Overdue") {
    factors.push({
      label: "Maturity drift",
      impact: "negative",
      detail: "Receivable is past due and carries overdue exposure.",
    });
  }

  if (receivable.holdbackPercent > 0) {
    factors.push({
      label: "Holdback structure",
      impact: "neutral",
      detail: `${receivable.holdbackPercent}% holdback retained until final release.`,
    });
  }

  if (!factors.some((factor) => factor.impact === "negative")) {
    factors.push({
      label: "Settlement path",
      impact: "positive",
      detail: "Clean testnet lifecycle with direct onchain settlement routing.",
    });
  }

  return factors;
}

function deriveRiskScore(receivable: Receivable): RiskScore {
  let score = 82;
  if (receivable.status === "Disputed") score = 48;
  else if (receivable.status === "Overdue") score = 56;
  else if (receivable.status === "FinanceEligible") score = 78;
  else if (receivable.status === "Funded") score = 74;

  const band =
    score >= 80
      ? "Low"
      : score >= 65
        ? "Moderate"
        : score >= 50
          ? "Elevated"
          : "Watchlist";

  return {
    receivableId: receivable.id,
    score,
    band,
    advanceRateRecommendation: Math.round(
      (receivable.requestedFinancingAmount / Math.max(receivable.amount, 1)) * 100,
    ),
    expectedSettlementConfidence: score,
    confidenceLabel: score >= 75 ? "High confidence" : "Manual review required",
    payerConcentration: 22,
    anomalyFlags: receivable.anomalyFlags,
    agingBucket: receivable.status === "Overdue" ? "30+ days" : "0-30 days",
    memo:
      receivable.status === "Disputed"
        ? "Dispute remains open. Restore finance eligibility only after confirmation."
        : "Live chain state available for underwriting review.",
    factors: deriveRiskFactors(receivable),
  };
}

function buildLiveUsers(
  walletAddress: `0x${string}`,
  compliance: LiveComplianceSnapshot,
): User[] {
  return (["seller", "buyer", "lp", "admin"] as Role[]).map((role) => ({
    id: `${role}-live`,
    entityName: ROLE_NAMES[role],
    wallet: walletAddress,
    role,
    jurisdiction: ROLE_JURISDICTIONS[role],
    sector: ROLE_SECTORS[role],
    complianceStatus: compliance.status,
    complianceLevel: compliance.level,
    badges: compliance.badges,
    recommendedTerms: compliance.recommendedTerms,
    reliabilityScore: compliance.reliabilityScore,
  }));
}

async function readLiveComplianceSnapshot(
  publicClient: PublicClient,
  walletAddress: `0x${string}`,
) {
  if (hashKeyIntegrations.kyc.enabled && contractAddresses.HashKeyKycSBT) {
    try {
      const snapshot = await readHashKeyKycSnapshot(
        publicClient,
        contractAddresses.HashKeyKycSBT as `0x${string}`,
        walletAddress,
      );
      const complianceStatus = mapHashKeyKycToComplianceStatus(snapshot);
      const complianceLevel = mapHashKeyKycLevelToCompliance(snapshot.level);
      const levelLabel = getHashKeyKycLevelLabel(snapshot.level);

      return {
        status: complianceStatus,
        level: complianceLevel,
        badges:
          complianceStatus === "approved"
            ? [`HashKey KYC ${levelLabel}`]
            : snapshot.status === 2
              ? ["HashKey KYC revoked"]
              : ["HashKey KYC pending"],
        recommendedTerms:
          complianceStatus === "approved"
            ? `Official HashKey KYC verified${snapshot.ensName ? ` as ${snapshot.ensName}` : ""}.`
            : `Complete HashKey KYC through ${hashKeyIntegrations.kyc.portalUrl} and sync it into SETTL.`,
        reliabilityScore:
          complianceStatus === "approved" ? 93 : snapshot.status === 2 ? 20 : 58,
      };
    } catch (error) {
      console.error("Failed to read HashKey KYC status", error);
    }
  }

  if (contractAddresses.ComplianceGate) {
    const complianceStatusIndex = Number(
      (await publicClient.readContract({
        address: contractAddresses.ComplianceGate as `0x${string}`,
        abi: ComplianceGateABI,
        functionName: "getStatus",
        args: [walletAddress],
      })) as bigint,
    );
    const complianceStatus = toComplianceStatus(complianceStatusIndex);

    return {
      status: complianceStatus,
      level: complianceStatus === "approved" ? "institutional" : "enhanced",
      badges:
        complianceStatus === "approved"
          ? ["HashKey testnet cleared"]
          : ["Compliance action required"],
      recommendedTerms:
        complianceStatus === "approved"
          ? "Live testnet execution is enabled for this wallet."
          : "Run the testnet compliance activation before funding or settlement.",
      reliabilityScore: complianceStatus === "approved" ? 91 : 62,
    };
  }

  return {
    status: "pending_review" as ComplianceStatus,
    level: "standard" as const,
    badges: ["Compliance action required"],
    recommendedTerms: "Configure the HashKey KYC provider or the protocol compliance gate.",
    reliabilityScore: 50,
  };
}

export function SettlProvider({ children }: { children: ReactNode }) {
  const mode = appMode;
  const privyAccount = usePrivyAccount();
  const { chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: preferredChain.id });
  const { switchChainAsync } = useSwitchChain();

  const [currentRole, setCurrentRole] = useState<Role>(initialRole);
  const [demoConnected, setDemoConnected] = useState(true);
  const [liveUsers, setLiveUsers] = useState<User[]>([]);
  const [liveReceivables, setLiveReceivables] = useState<Receivable[]>([]);
  const [liveSettlements, setLiveSettlements] = useState<Settlement[]>([]);
  const [liveDisputes, setLiveDisputes] = useState<Dispute[]>([]);
  const [liveFundingPositions, setLiveFundingPositions] = useState<FundingPosition[]>([]);
  const [sessionActivity, setSessionActivity] = useState<ActivityEvent[]>([]);
  const [txStates, setTxStates] = useState<Record<string, TxState>>({});

  const walletAddress = privyAccount.address;
  const liveReady =
    mode.appMode === "live" &&
    Boolean(walletAddress) &&
    areContractsConfigured() &&
    Boolean(publicClient);

  const activeUsers =
    liveReady && walletAddress && liveUsers.length > 0 ? liveUsers : seedUsers;
  const currentUser =
    activeUsers.find((user) => user.role === currentRole) ??
    seedUsers.find((user) => user.role === currentRole) ??
    activeUsers[0] ??
    seedUsers[0];
  const connected = mode.appMode === "live" ? Boolean(walletAddress) : demoConnected;

  const addActivity = useCallback((entry: ActivityEvent) => {
    setSessionActivity((current) => [entry, ...current].slice(0, 24));
  }, []);

  const ensureChain = useCallback(async () => {
    if (chainId === preferredChain.id || !switchChainAsync) return;
    await switchChainAsync({ chainId: preferredChain.id });
  }, [chainId, switchChainAsync]);

  const sendWrite = useCallback(
    async (
      key: string,
      request: {
        address: `0x${string}`;
        abi: any;
        functionName: string;
        args?: readonly unknown[];
      },
    ) => {
      if (!walletAddress || !walletClient || !publicClient) {
        throw new Error("Connect a wallet before executing live actions.");
      }

      await ensureChain();
      setTxStates((current) => ({ ...current, [key]: "pending" }));

      try {
        const hash = await walletClient.writeContract({
          ...request,
          account: walletAddress,
          chain: preferredChain,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        setTxStates((current) => ({ ...current, [key]: "success" }));
        return hash;
      } catch (error) {
        setTxStates((current) => ({ ...current, [key]: "failed" }));
        throw error;
      }
    },
    [ensureChain, publicClient, walletAddress, walletClient],
  );

  const ensureAllowance = useCallback(
    async (spender: `0x${string}`, amount: bigint, key: string) => {
      if (!walletAddress || !publicClient || !contractAddresses.DemoUSDC) {
        throw new Error("Demo USDC is not configured.");
      }

      const allowance = (await publicClient.readContract({
        address: contractAddresses.DemoUSDC as `0x${string}`,
        abi: DemoUSDCABI,
        functionName: "allowance",
        args: [walletAddress, spender],
      })) as bigint;

      if (allowance >= amount) return;

      await sendWrite(`${key}-approve`, {
        address: contractAddresses.DemoUSDC as `0x${string}`,
        abi: DemoUSDCABI,
        functionName: "approve",
        args: [spender, amount],
      });
    },
    [publicClient, sendWrite, walletAddress],
  );

  const refreshLiveState = useCallback(async () => {
    if (!liveReady || !walletAddress || !publicClient) return;

    const receivableMeta = loadStorageMap<ReceivableMetaMap[string]>(
      STORAGE_KEYS.receivables,
    );
    const settlementMeta = loadStorageMap<SettlementMetaMap[string]>(
      STORAGE_KEYS.settlements,
    );
    const disputeMeta = loadStorageMap<DisputeMetaMap[string]>(
      STORAGE_KEYS.disputes,
    );

    const compliance = await readLiveComplianceSnapshot(publicClient, walletAddress);
    setLiveUsers(buildLiveUsers(walletAddress, compliance));

    const receivableCount = Number(
      (await publicClient.readContract({
        address: contractAddresses.ReceivableRegistry as `0x${string}`,
        abi: ReceivableRegistryABI,
        functionName: "receivableCount",
      })) as bigint,
    );

    const loaded = await Promise.all(
      Array.from({ length: receivableCount }, (_, index) => index + 1).map(
        async (id) => {
          const receivableId = BigInt(id);
          const [receivableRaw, fundingRaw, settlementRaw, disputeRaw, hspRequestRaw] =
            await Promise.all([
              publicClient.readContract({
                address: contractAddresses.ReceivableRegistry as `0x${string}`,
                abi: ReceivableRegistryABI,
                functionName: "getReceivable",
                args: [receivableId],
              }),
              publicClient.readContract({
                address: contractAddresses.AdvanceEngine as `0x${string}`,
                abi: AdvanceEngineABI,
                functionName: "getFundingPosition",
                args: [receivableId],
              }),
              publicClient.readContract({
                address: contractAddresses.SettlementRouter as `0x${string}`,
                abi: SettlementRouterABI,
                functionName: "getSettlement",
                args: [receivableId],
              }),
              publicClient.readContract({
                address: contractAddresses.DisputeEscrow as `0x${string}`,
                abi: DisputeEscrowABI,
                functionName: "getDispute",
                args: [receivableId],
              }),
              contractAddresses.HspSettlementAdapter
                ? publicClient.readContract({
                    address: contractAddresses.HspSettlementAdapter as `0x${string}`,
                    abi: HspSettlementAdapterABI,
                    functionName: "requests",
                    args: [receivableId],
                  })
                : Promise.resolve(null),
            ]);

          return { id, receivableRaw, fundingRaw, settlementRaw, disputeRaw, hspRequestRaw };
        },
      ),
    );

    const nextReceivables: Receivable[] = [];
    const nextSettlements: Settlement[] = [];
    const nextDisputes: Dispute[] = [];
    const nextFundingPositions: FundingPosition[] = [];

    loaded.forEach(({ id, receivableRaw, fundingRaw, settlementRaw, disputeRaw, hspRequestRaw }) => {
      const key = toKey(id);
      const metadata = receivableMeta[key];
      const seller = getStructValue<string>(receivableRaw, "seller", 0);
      const buyer = getStructValue<string>(receivableRaw, "buyer", 1);
      const amount = getStructValue<bigint>(receivableRaw, "amount", 2);
      const requestedAdvance = getStructValue<bigint>(
        receivableRaw,
        "requestedAdvance",
        3,
      );
      const holdbackBps = getStructValue<bigint>(receivableRaw, "holdbackBps", 4);
      const issueDate = getStructValue<bigint>(receivableRaw, "issueDate", 5);
      const dueDate = getStructValue<bigint>(receivableRaw, "dueDate", 6);
      const metadataHash = getStructValue<string>(receivableRaw, "metadataHash", 7);
      const reference = getStructValue<string>(receivableRaw, "referenceCode", 8);
      let status = toReceivableStatus(
        Number(getStructValue<bigint>(receivableRaw, "status", 9)),
      );
      const buyerAcknowledged = getStructValue<boolean>(
        receivableRaw,
        "buyerAcknowledged",
        10,
      );

      if (
        new Date(toDateStringFromUnix(dueDate)).getTime() < Date.now() &&
        ["FinanceEligible", "Funded"].includes(status)
      ) {
        status = "Overdue";
      }

      const fundingProvider = getStructValue<string>(fundingRaw, "provider", 0);
      const fundedAmount = getStructValue<bigint>(fundingRaw, "advanceAmount", 1);
      const expectedRepaymentAmount = getStructValue<bigint>(
        fundingRaw,
        "expectedRepaymentAmount",
        2,
      );
      const fundedAt = getStructValue<bigint>(fundingRaw, "fundedAt", 3);
      const yieldBps = Number(getStructValue<bigint>(fundingRaw, "yieldBps", 4));
      const repaid = getStructValue<boolean>(fundingRaw, "repaid", 5);

      const disputeStatus = Number(getStructValue<bigint>(disputeRaw, "status", 2));
      const disputeReasonHash = getStructValue<string>(disputeRaw, "reasonHash", 3);
      const disputeResolutionHash = getStructValue<string>(
        disputeRaw,
        "resolutionHash",
        4,
      );
      const disputeOpenedAt = getStructValue<bigint>(disputeRaw, "openedAt", 5);
      const disputeUpdatedAt = getStructValue<bigint>(disputeRaw, "updatedAt", 6);

      const settlementGross = getStructValue<bigint>(
        settlementRaw,
        "grossAmount",
        1,
      );
      const settlementFee = getStructValue<bigint>(settlementRaw, "feeAmount", 2);
      const holdbackAmount = getStructValue<bigint>(
        settlementRaw,
        "holdbackAmount",
        3,
      );
      const fundingRepaymentAmount = getStructValue<bigint>(
        settlementRaw,
        "fundingRepaymentAmount",
        4,
      );
      const sellerNetAmount = getStructValue<bigint>(
        settlementRaw,
        "sellerNetAmount",
        5,
      );
      const settlementReference = getStructValue<string>(
        settlementRaw,
        "settlementReference",
        6,
      );
      const settledAt = getStructValue<bigint>(settlementRaw, "settledAt", 7);
      const settlementCompleted = getStructValue<boolean>(
        settlementRaw,
        "completed",
        8,
      );
      const holdbackReleased = getStructValue<boolean>(
        settlementRaw,
        "holdbackReleased",
        9,
      );
      const hspReference = hspRequestRaw
        ? getStructValue<string>(hspRequestRaw, "settlementReference", 2)
        : undefined;
      const hspMode = hspRequestRaw
        ? Number(getStructValue<bigint>(hspRequestRaw, "mode", 3))
        : null;
      const hspCompleted = hspRequestRaw
        ? getStructValue<boolean>(hspRequestRaw, "completed", 4)
        : false;

      const anomalyFlags: string[] = [];
      if (status === "Disputed") anomalyFlags.push("Dispute opened");
      if (status === "Overdue") anomalyFlags.push("Past due");
      if (status === "Rejected") anomalyFlags.push("Buyer rejected or blocked");

      const receivable: Receivable = {
        id: key,
        referenceNumber: reference || `REC-${key}`,
        sellerId:
          seller.toLowerCase() === walletAddress.toLowerCase()
            ? "seller-live"
            : seller,
        buyerId:
          buyer.toLowerCase() === walletAddress.toLowerCase()
            ? "buyer-live"
            : buyer,
        sellerEntityName:
          metadata?.sellerEntityName ??
          (seller.toLowerCase() === walletAddress.toLowerCase()
            ? ROLE_NAMES.seller
            : shortAddress(seller)),
        buyerEntityName:
          metadata?.buyerEntityName ??
          (buyer.toLowerCase() === walletAddress.toLowerCase()
            ? ROLE_NAMES.buyer
            : shortAddress(buyer)),
        amount: Number(formatUnits(amount, 6)),
        requestedFinancingAmount: Number(formatUnits(requestedAdvance, 6)),
        currency: metadata?.currency ?? "USD",
        issueDate: toDateStringFromUnix(issueDate),
        dueDate: toDateStringFromUnix(dueDate),
        paymentTerms: metadata?.paymentTerms ?? "Net 14",
        sector: metadata?.sector ?? "General Business",
        jurisdiction: metadata?.jurisdiction ?? "HashKey Testnet",
        description:
          metadata?.description ?? "Live receivable created and tracked on HashKey testnet.",
        memo:
          metadata?.memo ??
          "Buyer acknowledgement and settlement are executed through live contracts.",
        documentHash: metadata?.documentHash ?? metadataHash,
        holdbackPercent: Number(holdbackBps) / 100,
        status,
        riskBand:
          status === "Disputed"
            ? "Watchlist"
            : status === "Overdue"
              ? "Elevated"
              : status === "FinanceEligible" || status === "Funded"
                ? "Moderate"
                : "Low",
        riskScore:
          status === "Disputed"
            ? 48
            : status === "Overdue"
              ? 56
              : status === "Funded"
                ? 74
                : 83,
        complianceEligible: compliance.status === "approved",
        buyerAcknowledgedAt: buyerAcknowledged
          ? toDateStringFromUnix(issueDate)
          : undefined,
        anomalyFlags,
        fundingProgress:
          fundingProvider !== ZERO_ADDRESS
            ? 100
            : status === "FinanceEligible"
              ? 0
              : 0,
        indicativeAdvanceRate:
          Number(formatUnits(amount, 6)) > 0
            ? Math.round((Number(formatUnits(requestedAdvance, 6)) / Number(formatUnits(amount, 6))) * 100)
            : 0,
        indicativeDiscountBps: yieldBps || 600,
        settlementStatus:
          status === "Disputed"
            ? "held"
            : settlementCompleted
              ? holdbackReleased || Number(formatUnits(holdbackAmount, 6)) === 0
                ? "completed"
                : "processing"
              : status === "Funded" || status === "FinanceEligible"
                ? "pending"
                : "scheduled",
        lastUpdated: new Date().toISOString(),
      };

      nextReceivables.push(receivable);

      if (fundingProvider !== ZERO_ADDRESS) {
        nextFundingPositions.push({
          id: `position-${key}`,
          receivableId: key,
          providerId:
            fundingProvider.toLowerCase() === walletAddress.toLowerCase()
              ? "lp-live"
              : fundingProvider,
          amount: Number(formatUnits(fundedAmount, 6)),
          fundedAt: fundedAt
            ? new Date(Number(fundedAt) * 1000).toISOString()
            : new Date().toISOString(),
          expectedYieldBps: yieldBps || 600,
          status:
            status === "Overdue" && !repaid
              ? "delayed"
              : repaid
                ? "repaid"
                : "active",
        });
      }

      if (settledAt > 0n || settlementGross > 0n) {
        const explorerPath =
          settlementMeta[key]?.txHash && settlementMeta[key]?.txHash?.startsWith("0x")
            ? getExplorerLink({ hash: settlementMeta[key].txHash!, path: "tx" })
            : getExplorerLink({
                hash: contractAddresses.SettlementRouter as string,
                path: "address",
              });

        nextSettlements.push({
          id: `settlement-${key}`,
          receivableId: key,
          amount: Number(formatUnits(settlementGross, 6)),
          dueDate: toDateStringFromUnix(dueDate),
          initiatedAt: new Date(Number(settledAt || 0n) * 1000).toISOString(),
          completedAt: settlementCompleted
            ? new Date(Number(settledAt || 0n) * 1000).toISOString()
            : undefined,
          status:
            status === "Disputed"
              ? "held"
              : settlementCompleted && !hspCompleted
                ? "processing"
                : holdbackReleased || Number(formatUnits(holdbackAmount, 6)) === 0
                ? "completed"
                : "processing",
          rail:
            hspMode === 1 || mode.hspMode === "live"
              ? "HSP_LIVE"
              : "HSP_MOCK",
          reference: hspReference || settlementReference || `settlement-${key}`,
          explorerPath,
          feeAmount: Number(formatUnits(settlementFee, 6)),
          holdbackAmount: Number(formatUnits(holdbackAmount, 6)),
          waterfall: [
            { label: "Protocol fee", amount: Number(formatUnits(settlementFee, 6)) },
            {
              label: "Funding repayment",
              amount: Number(formatUnits(fundingRepaymentAmount, 6)),
            },
            { label: "Seller remainder", amount: Number(formatUnits(sellerNetAmount, 6)) },
            { label: "Holdback retained", amount: Number(formatUnits(holdbackAmount, 6)) },
          ].filter((entry) => entry.amount > 0),
        });
      }

      if (disputeStatus > 0) {
        nextDisputes.push({
          id: `dispute-${key}`,
          receivableId: key,
          openedBy:
            getStructValue<string>(disputeRaw, "openedBy", 1).toLowerCase() ===
            buyer.toLowerCase()
              ? "buyer"
              : "seller",
          status: disputeStatus === 2 ? "under_review" : "resolved",
          reason:
            disputeMeta[key]?.reason ??
            disputeReasonHash ??
            "Dispute reason recorded onchain.",
          openedAt:
            disputeOpenedAt > 0n
              ? new Date(Number(disputeOpenedAt) * 1000).toISOString()
              : new Date().toISOString(),
          updatedAt:
            disputeUpdatedAt > 0n
              ? new Date(Number(disputeUpdatedAt) * 1000).toISOString()
              : new Date().toISOString(),
          resolutionSummary:
            disputeMeta[key]?.resolution ??
            (disputeResolutionHash !==
            "0x0000000000000000000000000000000000000000000000000000000000000000"
              ? disputeResolutionHash
              : undefined),
        });
      }
    });

    setLiveReceivables(nextReceivables.sort((a, b) => Number(b.id) - Number(a.id)));
    setLiveSettlements(nextSettlements.sort((a, b) => b.initiatedAt.localeCompare(a.initiatedAt)));
    setLiveDisputes(nextDisputes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    setLiveFundingPositions(nextFundingPositions.sort((a, b) => b.fundedAt.localeCompare(a.fundedAt)));
  }, [liveReady, mode.hspMode, publicClient, walletAddress]);

  useEffect(() => {
    if (!liveReady) return;
    void refreshLiveState();
  }, [liveReady, refreshLiveState]);

  const setRole = (role: Role) => setCurrentRole(role);

  const connectAs = (role: Role) => {
    if (mode.appMode === "live" && !walletAddress) {
      toast.error("Connect a wallet first");
      return;
    }

    if (mode.appMode !== "live") {
      setDemoConnected(true);
    }

    setCurrentRole(role);
    toast.success("Workspace ready", {
      description:
        mode.appMode === "live"
          ? `SETTL routed ${role} mode to the connected HashKey wallet.`
          : `SETTL loaded ${role} mode on demo rails.`,
    });
  };

  const enableCompliance = useCallback(async () => {
    if (!liveReady || !contractAddresses.ComplianceGate) {
      toast.error("Compliance gate is not configured for live mode.");
      return;
    }

    try {
      if (hashKeyIntegrations.kyc.enabled && contractAddresses.HashKeyKycSBT && publicClient) {
        const snapshot = await readHashKeyKycSnapshot(
          publicClient,
          contractAddresses.HashKeyKycSBT as `0x${string}`,
          walletAddress as `0x${string}`,
        );

        if (snapshot.status !== 1 || !snapshot.isHuman || snapshot.level === 0) {
          const fee = (await publicClient.readContract({
            address: contractAddresses.HashKeyKycSBT as `0x${string}`,
            abi: [
              {
                type: "function",
                name: "getTotalFee",
                stateMutability: "view",
                inputs: [],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "getTotalFee",
          })) as bigint;

          toast.info("HashKey KYC required", {
            description: `Complete official HashKey KYC at ${hashKeyIntegrations.kyc.portalUrl} and pay the current fee of ${formatEther(
              fee,
            )} HSK before syncing SETTL.`,
          });
          await refreshLiveState();
          return;
        }

        await sendWrite("compliance-sync", {
          address: contractAddresses.ComplianceGate as `0x${string}`,
          abi: ComplianceGateABI,
          functionName: "syncMyHashKeyKyc",
        });
        toast.success("HashKey KYC synced", {
          description: "Official HashKey KYC now backs live protocol execution.",
        });
      } else {
        await sendWrite("compliance", {
          address: contractAddresses.ComplianceGate as `0x${string}`,
          abi: ComplianceGateABI,
          functionName: "selfApprove",
          args: [2, keccak256(stringToHex("settl-testnet-self-serve"))],
        });
        toast.success("Compliance enabled", {
          description: "This wallet is now approved for HashKey testnet execution.",
        });
      }
      await refreshLiveState();
    } catch (error) {
      toast.error("Compliance action failed", {
        description:
          error instanceof Error ? error.message : "Unable to update compliance state.",
      });
    }
  }, [liveReady, publicClient, refreshLiveState, sendWrite, walletAddress]);

  const createReceivable = useCallback(
    async (input: CreateReceivableInput) => {
      if (!liveReady || !publicClient || !contractAddresses.ReceivableRegistry) {
        toast.error("Live receivable creation is not available.");
        return;
      }

      if (currentUser.complianceStatus !== "approved") {
        toast.error("Compliance approval is required before submission.");
        return;
      }

      try {
        const buyerAddress = input.buyerEntityOrWallet.startsWith("0x")
          ? (input.buyerEntityOrWallet as `0x${string}`)
          : walletAddress;

        if (!buyerAddress) {
          throw new Error("Buyer wallet is required in live mode.");
        }

        const beforeCount = Number(
          (await publicClient.readContract({
            address: contractAddresses.ReceivableRegistry as `0x${string}`,
            abi: ReceivableRegistryABI,
            functionName: "receivableCount",
          })) as bigint,
        );

        await sendWrite("create-receivable", {
          address: contractAddresses.ReceivableRegistry as `0x${string}`,
          abi: ReceivableRegistryABI,
          functionName: "createReceivable",
          args: [
            buyerAddress,
            parseUnits(input.amount.toString(), 6),
            parseUnits(input.requestedFinancingAmount.toString(), 6),
            BigInt(Math.round(input.holdbackPercent * 100)),
            unixFromDateString(input.issueDate),
            unixFromDateString(input.dueDate),
            keccak256(stringToHex(input.documentHash)),
            input.referenceNumber,
          ],
        });

        const nextId = toKey(beforeCount + 1);
        const metadataMap = loadStorageMap<ReceivableMetaMap[string]>(
          STORAGE_KEYS.receivables,
        );
        metadataMap[nextId] = {
          sellerEntityName: input.sellerEntityName,
          buyerEntityName:
            input.buyerEntityOrWallet.startsWith("0x")
              ? shortAddress(input.buyerEntityOrWallet)
              : input.buyerEntityOrWallet,
          paymentTerms: input.paymentTerms,
          sector: input.sector,
          jurisdiction: input.jurisdiction,
          description: input.description,
          memo: input.memo,
          documentHash: input.documentHash,
          currency: input.currency,
        };
        saveStorageMap(STORAGE_KEYS.receivables, metadataMap);

        addActivity({
          id: `activity-create-${nextId}`,
          title: "Receivable issued",
          detail: `${input.referenceNumber} is live on HashKey testnet and awaits buyer acknowledgement.`,
          timestamp: new Date().toISOString(),
          tone: "positive",
          actor: currentUser.entityName,
          receivableId: nextId,
        });
        toast.success("Receivable created", {
          description: "Buyer acknowledgement is now required before financing.",
        });
        await refreshLiveState();
      } catch (error) {
        toast.error("Receivable creation failed", {
          description:
            error instanceof Error ? error.message : "Unable to create receivable.",
        });
      }
    },
    [
      addActivity,
      currentUser.complianceStatus,
      currentUser.entityName,
      liveReady,
      publicClient,
      refreshLiveState,
      sendWrite,
      walletAddress,
    ],
  );

  const acknowledgeReceivable = useCallback(
    async (receivableId: string, decision: "approve" | "reject") => {
      if (!liveReady || !contractAddresses.ReceivableRegistry) return;

      try {
        await sendWrite(`ack-${receivableId}`, {
          address: contractAddresses.ReceivableRegistry as `0x${string}`,
          abi: ReceivableRegistryABI,
          functionName: "acknowledgeReceivable",
          args: [BigInt(receivableId), decision === "approve"],
        });
        addActivity({
          id: `activity-ack-${receivableId}-${Date.now()}`,
          title:
            decision === "approve"
              ? "Buyer acknowledged"
              : "Buyer rejected receivable",
          detail:
            decision === "approve"
              ? `Receivable ${receivableId} moved into finance eligibility.`
              : `Receivable ${receivableId} was rejected by the buyer wallet.`,
          timestamp: new Date().toISOString(),
          tone: decision === "approve" ? "positive" : "negative",
          actor: currentUser.entityName,
          receivableId,
        });
        toast.success(
          decision === "approve" ? "Buyer acknowledged" : "Receivable rejected",
        );
        await refreshLiveState();
      } catch (error) {
        toast.error("Buyer acknowledgement failed", {
          description:
            error instanceof Error ? error.message : "Unable to update receivable status.",
        });
      }
    },
    [addActivity, currentUser.entityName, liveReady, refreshLiveState, sendWrite],
  );

  const fundReceivable = useCallback(
    async (receivableId: string) => {
      if (!liveReady || !contractAddresses.AdvanceEngine) return;

      const target = liveReceivables.find((receivable) => receivable.id === receivableId);
      if (!target) return;

      try {
        const amount = parseUnits(
          target.requestedFinancingAmount.toString(),
          6,
        );
        await ensureAllowance(
          contractAddresses.AdvanceEngine as `0x${string}`,
          amount,
          `fund-${receivableId}`,
        );

        await sendWrite(`fund-${receivableId}`, {
          address: contractAddresses.AdvanceEngine as `0x${string}`,
          abi: AdvanceEngineABI,
          functionName: "fundReceivable",
          args: [BigInt(receivableId)],
        });

        addActivity({
          id: `activity-fund-${receivableId}-${Date.now()}`,
          title: "Funding committed",
          detail: `${target.referenceNumber} was funded through live testnet USDC.`,
          timestamp: new Date().toISOString(),
          tone: "positive",
          actor: currentUser.entityName,
          receivableId,
        });
        toast.success("Capital deployed");
        await refreshLiveState();
      } catch (error) {
        toast.error("Funding failed", {
          description:
            error instanceof Error ? error.message : "Unable to fund this receivable.",
        });
      }
    },
    [
      addActivity,
      currentUser.entityName,
      ensureAllowance,
      liveReady,
      liveReceivables,
      refreshLiveState,
      sendWrite,
    ],
  );

  const settleReceivable = useCallback(
    async (receivableId: string) => {
      const target = liveReceivables.find((receivable) => receivable.id === receivableId);
      if (!target) return;

      if (mode.appMode !== "live" || !contractAddresses.SettlementRouter) {
        const adapter = createHspSettlementAdapter(mode.hspMode);
        await adapter.initiateSettlement({
          receivableId,
          amount: target.amount,
          holdbackPercent: target.holdbackPercent,
          currency: target.currency,
        });
        return;
      }

      try {
        const amount = parseUnits(target.amount.toString(), 6);
        await ensureAllowance(
          contractAddresses.SettlementRouter as `0x${string}`,
          amount,
          `settle-${receivableId}`,
        );

        const hash = await sendWrite(`settle-${receivableId}`, {
          address: contractAddresses.SettlementRouter as `0x${string}`,
          abi: SettlementRouterABI,
          functionName: "settleReceivable",
          args: [
            BigInt(receivableId),
            keccak256(stringToHex(`SETTL-${receivableId}-${Date.now()}`)),
            mode.hspMode === "live" ? 1 : 0,
          ],
        });

        const metadataMap = loadStorageMap<SettlementMetaMap[string]>(
          STORAGE_KEYS.settlements,
        );
        metadataMap[receivableId] = { txHash: hash };
        saveStorageMap(STORAGE_KEYS.settlements, metadataMap);

        addActivity({
          id: `activity-settle-${receivableId}-${Date.now()}`,
          title: "Settlement routed",
          detail: `${target.referenceNumber} settled through the live HSP adapter contract.`,
          timestamp: new Date().toISOString(),
          tone: "positive",
          actor: currentUser.entityName,
          receivableId,
        });
        toast.success("Settlement submitted");
        await refreshLiveState();
      } catch (error) {
        toast.error("Settlement failed", {
          description:
            error instanceof Error ? error.message : "Unable to settle receivable.",
        });
      }
    },
    [
      addActivity,
      currentUser.entityName,
      ensureAllowance,
      liveReceivables,
      mode.appMode,
      mode.hspMode,
      refreshLiveState,
      sendWrite,
    ],
  );

  const releaseHoldback = useCallback(
    async (receivableId: string) => {
      if (!liveReady || !contractAddresses.SettlementRouter) return;

      try {
        await sendWrite(`holdback-${receivableId}`, {
          address: contractAddresses.SettlementRouter as `0x${string}`,
          abi: SettlementRouterABI,
          functionName: "releaseHoldback",
          args: [BigInt(receivableId)],
        });

        addActivity({
          id: `activity-holdback-${receivableId}-${Date.now()}`,
          title: "Holdback released",
          detail: `Holdback for receivable ${receivableId} was released to the seller.`,
          timestamp: new Date().toISOString(),
          tone: "positive",
          actor: currentUser.entityName,
          receivableId,
        });
        toast.success("Holdback released");
        await refreshLiveState();
      } catch (error) {
        toast.error("Holdback release failed", {
          description:
            error instanceof Error
              ? error.message
              : "Unable to release holdback.",
        });
      }
    },
    [addActivity, currentUser.entityName, liveReady, refreshLiveState, sendWrite],
  );

  const openDispute = useCallback(
    async (receivableId: string, reason: string) => {
      if (!liveReady || !contractAddresses.DisputeEscrow) return;

      try {
        await sendWrite(`dispute-${receivableId}`, {
          address: contractAddresses.DisputeEscrow as `0x${string}`,
          abi: DisputeEscrowABI,
          functionName: "openDispute",
          args: [BigInt(receivableId), keccak256(stringToHex(reason))],
        });

        const metadataMap = loadStorageMap<DisputeMetaMap[string]>(
          STORAGE_KEYS.disputes,
        );
        metadataMap[receivableId] = { ...metadataMap[receivableId], reason };
        saveStorageMap(STORAGE_KEYS.disputes, metadataMap);

        addActivity({
          id: `activity-dispute-${receivableId}-${Date.now()}`,
          title: "Dispute opened",
          detail: reason,
          timestamp: new Date().toISOString(),
          tone: "negative",
          actor: currentUser.entityName,
          receivableId,
        });
        toast.warning("Dispute opened");
        await refreshLiveState();
      } catch (error) {
        toast.error("Dispute action failed", {
          description:
            error instanceof Error ? error.message : "Unable to open dispute.",
        });
      }
    },
    [addActivity, currentUser.entityName, liveReady, refreshLiveState, sendWrite],
  );

  const resolveDispute = useCallback(
    async (receivableId: string, resolution: string) => {
      if (!liveReady || !contractAddresses.DisputeEscrow) return;

      const hasSettlement = liveSettlements.some(
        (settlement) => settlement.receivableId === receivableId,
      );

      try {
        await sendWrite(`resolve-${receivableId}`, {
          address: contractAddresses.DisputeEscrow as `0x${string}`,
          abi: DisputeEscrowABI,
          functionName: "resolveDispute",
          args: [
            BigInt(receivableId),
            hasSettlement,
            keccak256(stringToHex(resolution)),
          ],
        });

        const metadataMap = loadStorageMap<DisputeMetaMap[string]>(
          STORAGE_KEYS.disputes,
        );
        metadataMap[receivableId] = {
          ...metadataMap[receivableId],
          resolution,
        };
        saveStorageMap(STORAGE_KEYS.disputes, metadataMap);

        addActivity({
          id: `activity-resolve-${receivableId}-${Date.now()}`,
          title: "Dispute resolved",
          detail: resolution,
          timestamp: new Date().toISOString(),
          tone: "positive",
          actor: currentUser.entityName,
          receivableId,
        });
        toast.success("Dispute resolved");
        await refreshLiveState();
      } catch (error) {
        toast.error("Resolution failed", {
          description:
            error instanceof Error ? error.message : "Unable to resolve dispute.",
        });
      }
    },
    [
      addActivity,
      currentUser.entityName,
      liveReady,
      liveSettlements,
      refreshLiveState,
      sendWrite,
    ],
  );

  const updateComplianceStatus = useCallback(
    async (_userId: string, status: ComplianceStatus) => {
      if (status === "approved") {
        await enableCompliance();
        return;
      }

      if (!liveReady || !contractAddresses.ComplianceGate) {
        return;
      }

      if (status === "pending_review") {
        if (hashKeyIntegrations.kyc.enabled) {
          toast.info("Official HashKey KYC review", {
            description: `Request or review KYC through ${hashKeyIntegrations.kyc.portalUrl}, then sync the protocol gate.`,
          });
          return;
        }

        try {
          await sendWrite("compliance-review", {
            address: contractAddresses.ComplianceGate as `0x${string}`,
            abi: ComplianceGateABI,
            functionName: "requestReview",
            args: [1, keccak256(stringToHex("settl-testnet-review"))],
          });
          toast.success("Compliance review requested");
          await refreshLiveState();
        } catch (error) {
          toast.error("Compliance request failed", {
            description:
              error instanceof Error
                ? error.message
                : "Unable to request compliance review.",
          });
        }
        return;
      }

      toast.info("Restriction updates remain owner-only in this deployment.");
    },
    [enableCompliance, liveReady, refreshLiveState, sendWrite],
  );

  const derivedRiskScores = useMemo(
    () =>
      liveReady
        ? liveReceivables.map(deriveRiskScore)
        : seedRiskScores,
    [liveReady, liveReceivables],
  );

  const derivedFundingOffers = useMemo(
    () =>
      liveReady
        ? liveReceivables
            .filter((receivable) => receivable.status === "FinanceEligible")
            .map((receivable) => ({
              id: `offer-${receivable.id}`,
              receivableId: receivable.id,
              providerId: "lp-live",
              advanceRate: receivable.indicativeAdvanceRate,
              discountRateBps: receivable.indicativeDiscountBps,
              holdbackPercent: receivable.holdbackPercent,
              status: "open" as const,
            }))
        : seedFundingOffers,
    [liveReady, liveReceivables],
  );

  const derivedActivity = useMemo(() => {
    if (!liveReady) return seedActivity;

    const items: ActivityEvent[] = [
      ...liveSettlements.map((settlement) => ({
        id: `activity-settlement-${settlement.id}`,
        title: "Settlement completed",
        detail: `${settlement.receivableId} settled via live testnet rail.`,
        timestamp: settlement.completedAt ?? settlement.initiatedAt,
        tone: settlement.status === "held" ? "warning" : "positive",
        actor: "SETTL Router",
        receivableId: settlement.receivableId,
      })),
      ...liveDisputes.map((dispute) => ({
        id: `activity-dispute-derived-${dispute.id}`,
        title: dispute.status === "resolved" ? "Dispute resolved" : "Dispute open",
        detail: dispute.reason,
        timestamp: dispute.updatedAt,
        tone: dispute.status === "resolved" ? "positive" : "negative",
        actor: dispute.openedBy === "buyer" ? ROLE_NAMES.buyer : ROLE_NAMES.seller,
        receivableId: dispute.receivableId,
      })),
      ...liveReceivables.map((receivable) => ({
        id: `activity-receivable-${receivable.id}`,
        title: "Receivable live",
        detail: `${receivable.referenceNumber} is tracked on HashKey testnet with status ${receivable.status}.`,
        timestamp: receivable.lastUpdated,
        tone:
          receivable.status === "Disputed" || receivable.status === "Overdue"
            ? "warning"
            : "neutral",
        actor: receivable.sellerEntityName,
        receivableId: receivable.id,
      })),
    ];

    return items
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 18);
  }, [liveDisputes, liveReady, liveReceivables, liveSettlements]);

  const receivables = liveReady ? liveReceivables : seedReceivables;
  const settlements = liveReady ? liveSettlements : seedSettlements;
  const disputes = liveReady ? liveDisputes : seedDisputes;
  const fundingPositions = liveReady ? liveFundingPositions : seedFundingPositions;
  const fundingOffers = liveReady ? derivedFundingOffers : seedFundingOffers;
  const riskScores = liveReady ? derivedRiskScores : seedRiskScores;
  const activity = useMemo(
    () =>
      [...sessionActivity, ...derivedActivity]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 24),
    [derivedActivity, sessionActivity],
  );

  const overviewMetrics = useMemo(
    () => computeOverviewMetrics(receivables),
    [receivables],
  );
  const portfolioMetrics = useMemo(
    () => computePortfolioMetrics(fundingPositions),
    [fundingPositions],
  );

  const value = useMemo<SettlContextValue>(
    () => ({
      currentRole,
      currentUser,
      users: activeUsers,
      receivables,
      riskScores,
      settlements,
      disputes,
      fundingOffers,
      fundingPositions,
      activity,
      mode,
      connected,
      walletAddress,
      liveReady,
      txStates,
      setRole,
      connectAs,
      createReceivable,
      acknowledgeReceivable,
      fundReceivable,
      settleReceivable,
      releaseHoldback,
      openDispute,
      resolveDispute,
      updateComplianceStatus,
      enableCompliance,
      refreshLiveState,
      overviewMetrics,
      portfolioMetrics,
    }),
    [
      acknowledgeReceivable,
      activeUsers,
      activity,
      connected,
      createReceivable,
      currentRole,
      currentUser,
      disputes,
      enableCompliance,
      fundReceivable,
      fundingOffers,
      fundingPositions,
      liveReady,
      mode,
      openDispute,
      overviewMetrics,
      portfolioMetrics,
      receivables,
      refreshLiveState,
      releaseHoldback,
      resolveDispute,
      riskScores,
      settleReceivable,
      settlements,
      txStates,
      updateComplianceStatus,
      walletAddress,
    ],
  );

  return <SettlContext.Provider value={value}>{children}</SettlContext.Provider>;
}

export function useSettl() {
  const context = useContext(SettlContext);
  if (!context) {
    throw new Error("useSettl must be used within SettlProvider");
  }
  return context;
}
