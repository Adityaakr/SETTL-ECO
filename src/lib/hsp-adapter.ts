import { Settlement } from "@/domain/models";
import { getExplorerLink } from "@/lib/hashkey-config";

export interface InitiateSettlementInput {
  receivableId: string;
  amount: number;
  holdbackPercent: number;
  currency: string;
}

export interface HspSettlementReceipt {
  settlementId: string;
  reference: string;
  explorerPath: string;
  status: Settlement["status"];
  rail: Settlement["rail"];
}

export interface HspSettlementAdapter {
  mode: "mock" | "live";
  initiateSettlement(input: InitiateSettlementInput): Promise<HspSettlementReceipt>;
  getSettlementStatus(reference: string): Promise<Settlement["status"]>;
}

class MockHspSettlementAdapter implements HspSettlementAdapter {
  readonly mode = "mock" as const;

  async initiateSettlement(input: InitiateSettlementInput): Promise<HspSettlementReceipt> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const reference = `HSP-MOCK-${input.receivableId.toUpperCase()}`;
    const syntheticHash = `0x${reference
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()
      .padEnd(64, "0")
      .slice(0, 64)}`;

    return {
      settlementId: `settlement-${input.receivableId}`,
      reference,
      explorerPath: getExplorerLink({ hash: syntheticHash }),
      status: "processing",
      rail: "HSP_MOCK",
    };
  }

  async getSettlementStatus(): Promise<Settlement["status"]> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return "completed";
  }
}

class LiveHspSettlementAdapter implements HspSettlementAdapter {
  readonly mode = "live" as const;

  async initiateSettlement(input: InitiateSettlementInput): Promise<HspSettlementReceipt> {
    const endpoint = import.meta.env.VITE_HSP_API_BASE_URL;

    if (!endpoint) {
      throw new Error(
        "Live HSP mode is not configured. Set VITE_HSP_API_BASE_URL and wire settlement credentials.",
      );
    }

    return {
      settlementId: `live-${input.receivableId}`,
      reference: `HSP-LIVE-${input.receivableId.toUpperCase()}`,
      explorerPath: `${endpoint}/settlements/${input.receivableId}`,
      status: "pending",
      rail: "HSP_LIVE",
    };
  }

  async getSettlementStatus(): Promise<Settlement["status"]> {
    return "pending";
  }
}

export const createHspSettlementAdapter = (mode: "mock" | "live") =>
  mode === "live"
    ? new LiveHspSettlementAdapter()
    : new MockHspSettlementAdapter();
