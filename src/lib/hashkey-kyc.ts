import type { Abi, PublicClient } from "viem";
import type { ComplianceLevel, ComplianceStatus } from "@/domain/models";

export const HashKeyKycSBTABI = [
  {
    type: "function",
    name: "getTotalFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getKycInfo",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "ensName", type: "string" },
      { name: "level", type: "uint8" },
      { name: "status", type: "uint8" },
      { name: "createTime", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "isHuman",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "level", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "requestKyc",
    stateMutability: "payable",
    inputs: [{ name: "ensName", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isEnsNameApproved",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "ensName", type: "string" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

export type HashKeyKycLevel = 0 | 1 | 2 | 3 | 4;
export type HashKeyKycStatus = 0 | 1 | 2;

export interface HashKeyKycSnapshot {
  ensName: string;
  level: HashKeyKycLevel;
  status: HashKeyKycStatus;
  createTime: bigint;
  isHuman: boolean;
  humanLevel: number;
}

export function getHashKeyKycLevelLabel(level: number) {
  return (
    {
      0: "None",
      1: "Basic",
      2: "Advanced",
      3: "Premium",
      4: "Ultimate",
    }[level] ?? "Unknown"
  );
}

export function getHashKeyKycStatusLabel(status: number) {
  return (
    {
      0: "none",
      1: "approved",
      2: "revoked",
    }[status] ?? "none"
  );
}

export function mapHashKeyKycLevelToCompliance(level: number): ComplianceLevel {
  if (level >= 4) return "institutional";
  if (level >= 2) return "enhanced";
  return "standard";
}

export function mapHashKeyKycToComplianceStatus(
  snapshot: HashKeyKycSnapshot,
): ComplianceStatus {
  if (snapshot.status === 2) return "restricted";
  if (snapshot.status === 1 && snapshot.isHuman && snapshot.level > 0) return "approved";
  return "pending_review";
}

export async function readHashKeyKycSnapshot(
  publicClient: PublicClient,
  kycSbtAddress: `0x${string}`,
  walletAddress: `0x${string}`,
): Promise<HashKeyKycSnapshot> {
  const [info, human] = await Promise.all([
    publicClient.readContract({
      address: kycSbtAddress,
      abi: HashKeyKycSBTABI,
      functionName: "getKycInfo",
      args: [walletAddress],
    }) as Promise<[string, number, number, bigint]>,
    publicClient.readContract({
      address: kycSbtAddress,
      abi: HashKeyKycSBTABI,
      functionName: "isHuman",
      args: [walletAddress],
    }) as Promise<[boolean, number]>,
  ]);

  return {
    ensName: info[0],
    level: info[1] as HashKeyKycLevel,
    status: info[2] as HashKeyKycStatus,
    createTime: info[3],
    isHuman: human[0],
    humanLevel: human[1],
  };
}
