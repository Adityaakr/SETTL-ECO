import { useMemo } from "react";
import { parseUnits } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { contractAddresses } from "@/lib/contracts";
import { usePrivyAccount } from "@/hooks/usePrivyAccount";

const demoUsdcAbi = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function useDemoUsdcFaucet() {
  const { address } = usePrivyAccount();
  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const canMint = Boolean(address && contractAddresses.DemoUSDC);

  const mint = async (amount = 10000) => {
    if (!address || !contractAddresses.DemoUSDC) {
      toast.error("Demo USDC is not configured");
      return;
    }

    try {
      const txHash = await writeContractAsync({
        address: contractAddresses.DemoUSDC as `0x${string}`,
        abi: demoUsdcAbi,
        functionName: "mint",
        args: [address, parseUnits(amount.toString(), 6)],
      });

      toast.success("Demo USDC mint submitted", {
        description: `Transaction ${txHash.slice(0, 10)}… submitted.`,
      });
    } catch (error) {
      toast.error("Demo USDC mint failed", {
        description:
          error instanceof Error ? error.message : "Wallet rejected or transaction failed.",
      });
    }
  };

  return useMemo(
    () => ({
      mint,
      canMint,
      isPending,
      isConfirming: receipt.isLoading,
      isSuccess: receipt.isSuccess,
      hash,
    }),
    [canMint, hash, isPending, receipt.isLoading, receipt.isSuccess],
  );
}
