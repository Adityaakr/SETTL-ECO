export interface ContractsData {
  network: string;
  chainId: string;
  deployer: string;
  contracts: {
    DemoUSDC?: string;
    ComplianceGate?: string;
    HashKeyKycSBT?: string;
    ReceivableRegistry?: string;
    ReceivableToken?: string;
    FundingPool?: string;
    AdvanceEngine?: string;
    HspSettlementAdapter?: string;
    SettlementRouter?: string;
    DisputeEscrow?: string;
    Reputation?: string;
    Treasury?: string;
    ProtocolFeeBps?: string;
  };
  deployedAt: string;
}

export const contractAddresses: ContractsData["contracts"] = {
  DemoUSDC: import.meta.env.VITE_DEMO_USDC_ADDRESS,
  ComplianceGate: import.meta.env.VITE_COMPLIANCE_GATE_ADDRESS,
  HashKeyKycSBT: import.meta.env.VITE_HASHKEY_KYC_SBT_ADDRESS,
  ReceivableRegistry: import.meta.env.VITE_RECEIVABLE_REGISTRY_ADDRESS,
  ReceivableToken: import.meta.env.VITE_RECEIVABLE_TOKEN_ADDRESS,
  FundingPool: import.meta.env.VITE_FUNDING_POOL_ADDRESS,
  AdvanceEngine: import.meta.env.VITE_ADVANCE_ENGINE_ADDRESS,
  HspSettlementAdapter: import.meta.env.VITE_HSP_SETTLEMENT_ADAPTER_ADDRESS,
  SettlementRouter: import.meta.env.VITE_SETTLEMENT_ROUTER_ADDRESS,
  DisputeEscrow: import.meta.env.VITE_DISPUTE_ESCROW_ADDRESS,
  Reputation: import.meta.env.VITE_REPUTATION_ADDRESS,
};

export const contractLabels: Record<keyof ContractsData["contracts"], string> = {
  DemoUSDC: "DemoUSDC",
  ComplianceGate: "ComplianceGate",
  HashKeyKycSBT: "HashKeyKycSBT",
  ReceivableRegistry: "ReceivableRegistry",
  ReceivableToken: "ReceivableToken",
  FundingPool: "FundingPool",
  AdvanceEngine: "AdvanceEngine",
  HspSettlementAdapter: "HspSettlementAdapter",
  SettlementRouter: "SettlementRouter",
  DisputeEscrow: "DisputeEscrow",
  Reputation: "Reputation",
  Treasury: "Treasury",
  ProtocolFeeBps: "ProtocolFeeBps",
};

export const areContractsConfigured = () =>
  Boolean(
    contractAddresses.ComplianceGate &&
      contractAddresses.ReceivableRegistry &&
      contractAddresses.FundingPool &&
      contractAddresses.AdvanceEngine &&
      contractAddresses.HspSettlementAdapter &&
      contractAddresses.SettlementRouter &&
      contractAddresses.DisputeEscrow &&
      contractAddresses.Reputation,
  );
