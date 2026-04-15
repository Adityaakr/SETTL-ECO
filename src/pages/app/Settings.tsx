import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { useAccount, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contractAddresses, contractLabels } from "@/lib/contracts";
import { useSettl } from "@/context/settl-context";
import { useDemoUsdcFaucet } from "@/hooks/useDemoUsdcFaucet";
import { PageSection, Surface } from "@/components/settl/shared";
import { preferredChain } from "@/lib/hashkey-config";
import { hashKeyIntegrations } from "@/lib/hashkey-integrations";
import {
  getHashKeyKycLevelLabel,
  getHashKeyKycStatusLabel,
  HashKeyKycSBTABI,
  readHashKeyKycSnapshot,
} from "@/lib/hashkey-kyc";
import { formatEther } from "viem";

export default function Settings() {
  const { currentUser, enableCompliance, mode, refreshLiveState, walletAddress } = useSettl();
  const faucet = useDemoUsdcFaucet();
  const publicClient = usePublicClient({ chainId: preferredChain.id });
  const { data: walletClient } = useWalletClient();
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [kycEnsName, setKycEnsName] = useState("bluewave.hsk");
  const [kycFee, setKycFee] = useState<bigint | null>(null);
  const [kycState, setKycState] = useState<{
    ensName: string;
    level: string;
    status: string;
    isHuman: boolean;
  } | null>(null);
  const [requestingKyc, setRequestingKyc] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(false);

  const hasOfficialKyc = Boolean(contractAddresses.HashKeyKycSBT);
  const kycConfigured = hashKeyIntegrations.kyc.enabled && hasOfficialKyc;
  const normalizedDefaultEns = useMemo(
    () =>
      `${currentUser.entityName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "settl"}.hsk`,
    [currentUser.entityName],
  );

  useEffect(() => {
    setKycEnsName(normalizedDefaultEns);
  }, [normalizedDefaultEns]);

  useEffect(() => {
    async function loadHashKeyKyc() {
      if (!kycConfigured || !walletAddress || !publicClient) {
        setKycState(null);
        setKycFee(null);
        return;
      }

      setLoadingKyc(true);
      try {
        const [snapshot, fee] = await Promise.all([
          readHashKeyKycSnapshot(
            publicClient,
            contractAddresses.HashKeyKycSBT as `0x${string}`,
            walletAddress,
          ),
          publicClient.readContract({
            address: contractAddresses.HashKeyKycSBT as `0x${string}`,
            abi: HashKeyKycSBTABI,
            functionName: "getTotalFee",
          }) as Promise<bigint>,
        ]);

        setKycFee(fee);
        setKycState({
          ensName: snapshot.ensName || "Not registered",
          level: getHashKeyKycLevelLabel(snapshot.level),
          status: getHashKeyKycStatusLabel(snapshot.status),
          isHuman: snapshot.isHuman,
        });
      } catch (error) {
        console.error("Failed to load HashKey KYC state", error);
        setKycState(null);
      } finally {
        setLoadingKyc(false);
      }
    }

    void loadHashKeyKyc();
  }, [kycConfigured, publicClient, walletAddress]);

  const requestHashKeyKyc = async () => {
    if (!walletAddress || !walletClient || !publicClient || !contractAddresses.HashKeyKycSBT) {
      return;
    }

    setRequestingKyc(true);
    try {
      if (chainId !== preferredChain.id && switchChainAsync) {
        await switchChainAsync({ chainId: preferredChain.id });
      }

      const fee =
        kycFee ??
        ((await publicClient.readContract({
          address: contractAddresses.HashKeyKycSBT as `0x${string}`,
          abi: HashKeyKycSBTABI,
          functionName: "getTotalFee",
        })) as bigint);

      const hash = await walletClient.writeContract({
        address: contractAddresses.HashKeyKycSBT as `0x${string}`,
        abi: HashKeyKycSBTABI,
        functionName: "requestKyc",
        args: [kycEnsName],
        value: fee,
        account: walletAddress,
        chain: preferredChain,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await refreshLiveState();
    } finally {
      setRequestingKyc(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Settings"
        title="Runtime modes, chain endpoints, and live integration surfaces"
        description="SETTL is wired to HashKey testnet. This screen exposes official HashKey KYC, Safe endpoints, live protocol contracts, and the demo USDC faucet."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="space-y-4">
          <p className="text-lg font-semibold text-espresso">Mode configuration</p>
          <div className="grid gap-3">
            <Row label="App mode" value={mode.appMode} />
            <Row label="HSP mode" value={mode.hspMode} />
            <Row
              label="Preferred chain"
              value={`${preferredChain.name} (${preferredChain.id})`}
            />
            <Row label="Explorer" value={preferredChain.blockExplorers.default.url} />
            <Row label="Connected wallet" value={walletAddress ?? "Not connected"} />
            <Row
              label="Compliance"
              value={currentUser.complianceStatus.replace("_", " ")}
            />
          </div>
        </Surface>

        <Surface className="space-y-4">
          <p className="text-lg font-semibold text-espresso">Contract wiring</p>
          <div className="grid gap-3">
            {Object.entries(contractAddresses).map(([key, value]) => (
              <Row
                key={key}
                label={contractLabels[key as keyof typeof contractLabels]}
                value={value || "Not configured"}
              />
            ))}
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-mint px-3 py-1 text-xs font-medium text-green-deep">
              <ShieldCheck className="h-3.5 w-3.5" />
              Official HashKey KYC
            </div>
            <p className="text-lg font-semibold text-espresso">Compliance integration</p>
            <p className="text-sm leading-6 text-taupe">
              SETTL now supports the official HashKey KYC SBT flow. If the SBT address is
              configured, protocol compliance can be synced from HashKey KYC instead of relying on
              local self-approval.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Row
              label="KYC provider"
              value={kycConfigured ? "HashKey KYC SBT configured" : "Not configured"}
            />
            <Row
              label="Portal"
              value={hashKeyIntegrations.kyc.portalUrl}
            />
            <Row
              label="Current ENS"
              value={loadingKyc ? "Loading..." : kycState?.ensName || "Not registered"}
            />
            <Row
              label="Verification"
              value={
                loadingKyc
                  ? "Loading..."
                  : kycState
                    ? `${kycState.status} · ${kycState.level}${kycState.isHuman ? " · human" : ""}`
                    : "Unavailable"
              }
            />
          </div>

          {kycConfigured ? (
            <div className="space-y-3 rounded-[24px] border border-sand bg-card-cream p-4">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-taupe">
                  ENS name for HashKey KYC
                </span>
                <Input
                  value={kycEnsName}
                  onChange={(event) => setKycEnsName(event.target.value)}
                  className="h-12 rounded-2xl border-sand bg-card-stone text-espresso"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.open(hashKeyIntegrations.kyc.portalUrl, "_blank", "noopener,noreferrer")}
                >
                  Open KYC portal
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button onClick={() => void requestHashKeyKyc()} disabled={requestingKyc}>
                  {requestingKyc ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Request HashKey KYC
                </Button>
                <Button variant="outline" onClick={() => void enableCompliance()}>
                  Sync into SETTL
                </Button>
              </div>
              <p className="text-sm text-taupe">
                {kycFee !== null
                  ? `Current HashKey KYC fee: ${formatEther(kycFee)} HSK`
                  : "HashKey KYC fee loads from the official SBT contract."}
              </p>
            </div>
          ) : (
            <div className="rounded-[24px] border border-sand bg-card-cream p-4 text-sm leading-6 text-cocoa">
              <span className="font-mono text-xs text-espresso">VITE_HASHKEY_KYC_SBT_ADDRESS</span>{" "}
              is not set, so this deployment still falls back to the local compliance gate. Add the
              official HashKey KYC SBT address to enable the full flow.
            </div>
          )}
        </Surface>

        <div className="space-y-6">
          <Surface className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-espresso">HashKey Safe</p>
              <p className="text-sm text-taupe">
                Institutional treasury and admin actions can route through HashKey’s official Safe
                instances.
              </p>
            </div>
            <div className="grid gap-3">
              <Row label="Testnet Safe" value={hashKeyIntegrations.safe.testnetUrl} />
              <Row label="Mainnet Safe" value={hashKeyIntegrations.safe.mainnetUrl} />
              <Row label="Tx service" value={hashKeyIntegrations.safe.txServiceUrl} />
            </div>
          </Surface>

          <Surface className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-espresso">Test USDC faucet</p>
              <p className="text-sm text-taupe">
                Mint demo USDC on HashKey testnet for LP funding and buyer settlement.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void faucet.mint(10000)}
                disabled={!faucet.canMint || faucet.isPending || faucet.isConfirming}
              >
                {faucet.isPending || faucet.isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Mint 10,000 demo USDC
              </Button>
              <p className="text-sm text-taupe">
                {contractAddresses.DemoUSDC
                  ? `Faucet contract: ${contractAddresses.DemoUSDC}`
                  : "Deploy DemoUSDC and set VITE_DEMO_USDC_ADDRESS to enable minting."}
              </p>
            </div>
          </Surface>

          <Surface className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-espresso">Protocol sync</p>
              <p className="text-sm text-taupe">
                Use this action after KYC approval to update the protocol gate and unlock live
                receivable execution.
              </p>
            </div>
            <Button onClick={() => void enableCompliance()}>
              Sync compliance into protocol
            </Button>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{label}</p>
      <p className="mt-1 break-all text-sm text-espresso">{value}</p>
    </div>
  );
}
