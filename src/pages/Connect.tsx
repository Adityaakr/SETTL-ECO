import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Landmark,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useSettl } from "@/context/settl-context";
import {
  ComplianceBadge,
  PageSection,
  Surface,
} from "@/components/settl/shared";
import { preferredChain } from "@/lib/hashkey-config";
import { Button } from "@/components/ui/button";

const roleTargets = {
  seller: "/app/seller",
  buyer: "/app/buyer",
  lp: "/app/capital",
  admin: "/app/admin",
} as const;

export default function Connect() {
  const navigate = useNavigate();
  const { authenticated, login, logout, ready } = usePrivy();
  const { users, connectAs, mode, walletAddress, liveReady } = useSettl();

  const walletConnected =
    mode.appMode === "live" ? authenticated && Boolean(walletAddress) : true;

  const roleCards = useMemo(
    () => [
      {
        role: "seller" as const,
        icon: Building2,
        entity: users.find((user) => user.role === "seller"),
        detail: "Originate verified receivables and request early liquidity.",
      },
      {
        role: "buyer" as const,
        icon: Wallet,
        entity: users.find((user) => user.role === "buyer"),
        detail: "Acknowledge invoices, settle obligations, and raise disputes.",
      },
      {
        role: "lp" as const,
        icon: Landmark,
        entity: users.find((user) => user.role === "lp"),
        detail: "Provide capital against finance-eligible receivables.",
      },
      {
        role: "admin" as const,
        icon: ShieldCheck,
        entity: users.find((user) => user.role === "admin"),
        detail: "Operate compliance and dispute workflows on live contracts.",
      },
    ],
    [users],
  );

  return (
    <div className="min-h-screen bg-porcelain px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageSection
          eyebrow="Access routing"
          title="Connect into the appropriate regulated workspace"
          description={
            mode.appMode === "live"
              ? "SETTL uses a Privy embedded wallet on HashKey testnet for the most reliable live demo flow. One wallet can move across seller, buyer, LP, and admin surfaces for full platform verification."
              : "SETTL routes each participant into a role-aware operating surface. In demo mode, wallet connection and settlement remain simulated while preserving production-style state transitions."
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Surface className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-espresso">Connection status</p>
              <p className="text-sm leading-6 text-taupe">
                {mode.appMode === "demo"
                  ? "Demo mode is active. Role routing, transaction states, and settlement flows remain fully interactive."
                  : walletConnected
                    ? "Live mode is active. The embedded wallet can execute against deployed HashKey testnet contracts."
                    : "Live mode is active. Sign in with email to create or access the embedded wallet, then enable compliance from Settings before funding or settlement."}
              </p>
            </div>

            {mode.appMode === "live" ? (
              <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-sand bg-card-stone/40 p-4">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-taupe">Wallet</p>
                  <p className="mt-1 break-all text-sm text-espresso">
                    {walletAddress ?? "Not connected"}
                  </p>
                  <p className="mt-1 text-xs text-taupe">
                    {liveReady
                      ? `Ready on ${preferredChain.name}.`
                      : `Target network: ${preferredChain.name} (${preferredChain.id}).`}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => (walletConnected ? logout() : login())}
                  disabled={!ready}
                >
                  {!ready ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading
                    </>
                  ) : walletConnected ? (
                    "Disconnect"
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {roleCards.map((card) => {
                const Icon = card.icon;
                if (!card.entity) return null;

                return (
                  <button
                    key={card.role}
                    onClick={() => {
                      if (mode.appMode === "live" && !walletConnected) return;
                      connectAs(card.role);
                      navigate(roleTargets[card.role]);
                    }}
                    disabled={mode.appMode === "live" && !walletConnected}
                    className="rounded-3xl border border-sand bg-card-cream p-5 text-left transition hover:border-cocoa/20 hover:bg-card-stone/50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-card-stone p-3">
                        <Icon className="h-5 w-5 text-espresso" />
                      </div>
                      <ComplianceBadge status={card.entity.complianceStatus} />
                    </div>
                    <p className="mt-4 text-lg font-semibold text-espresso">
                      {card.entity.entityName}
                    </p>
                    <p className="mt-1 text-sm text-cocoa">{card.detail}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-taupe">
                      {card.entity.complianceLevel} diligence
                    </p>
                  </button>
                );
              })}
            </div>
          </Surface>

          <div className="space-y-6">
            <Surface className="space-y-4">
              <p className="text-sm font-medium text-espresso">Network readiness</p>
              <div className="rounded-3xl border border-green/15 bg-mint/50 p-4">
                <p className="text-lg font-semibold text-espresso">
                  {preferredChain.name}
                </p>
                <p className="mt-1 text-sm text-cocoa">
                  Chain ID {preferredChain.id} · HSK gas token
                </p>
              </div>
              <div className="rounded-3xl border border-sand bg-card-stone/60 p-4">
                <p className="text-sm font-medium text-espresso">Switcher behavior</p>
                <p className="mt-1 text-sm leading-6 text-taupe">
                  In live mode, wallet writes target HashKey Chain Testnet. In demo mode, switching remains simulated.
                </p>
              </div>
            </Surface>

            <Surface className="space-y-4">
              <p className="text-sm font-medium text-espresso">Restricted state handling</p>
              <div className="rounded-3xl border border-red-soft/15 bg-rose-tint/40 p-4">
                <p className="font-medium text-espresso">Graceful compliance block</p>
                <p className="mt-1 text-sm leading-6 text-cocoa">
                  Unapproved wallets can inspect the product, mint test USDC, and enable testnet compliance, but funding and settlement remain blocked until the compliance gate clears.
                </p>
              </div>
              <Button className="w-full" asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (mode.appMode === "live" && !walletConnected) return;
                    connectAs("seller");
                    navigate("/app");
                  }}
                >
                  Enter overview
                  {walletConnected || mode.appMode === "demo" ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </button>
              </Button>
            </Surface>
          </div>
        </div>
      </div>
    </div>
  );
}
