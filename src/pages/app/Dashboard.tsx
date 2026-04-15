import { AlertTriangle, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettl } from "@/context/settl-context";
import {
  ActivityFeed,
  CompliancePanel,
  InsightCard,
  MetricCard,
  PageSection,
  ReceivableTable,
  Surface,
} from "@/components/settl/shared";
import { compactFormatter, currencyFormatter, percentFormatter } from "@/domain/formatters";
import { contractAddresses } from "@/lib/contracts";
import { getExplorerLink } from "@/lib/hashkey-config";
import { hashKeyIntegrations } from "@/lib/hashkey-integrations";

export default function Dashboard() {
  const { activity, currentUser, overviewMetrics, receivables } = useSettl();

  const spotlightReceivables = receivables.slice(0, 4);
  const openAlerts = receivables.filter((receivable) =>
    ["Overdue", "Disputed", "Rejected"].includes(receivable.status),
  );

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Overview dashboard"
        title="Receivables, settlement, and compliance in one operating layer"
        description="SETTL tracks finance eligibility, HSP settlement readiness, and counterparty quality across the full receivable lifecycle."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          label="Total receivables"
          value={compactFormatter(overviewMetrics.totalReceivables)}
          detail={`${currencyFormatter(overviewMetrics.totalSettledVolume)} cleared through the operating layer.`}
        />
        <MetricCard
          label="Financed volume"
          value={currencyFormatter(overviewMetrics.financedVolume)}
          detail={`${percentFormatter(overviewMetrics.settlementSuccessRate, 1)} settlement success rate across active receivables.`}
          tone="positive"
        />
        <MetricCard
          label="Overdue exposure"
          value={currencyFormatter(overviewMetrics.overdueExposure)}
          detail={`${currencyFormatter(overviewMetrics.outstandingExposure)} remains outstanding across the current book.`}
          tone={overviewMetrics.overdueExposure > 0 ? "warning" : "neutral"}
        />
      </div>

	      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <ReceivableTable receivables={spotlightReceivables} />
          <Surface className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-espresso">Judge route</p>
                <p className="mt-1 text-sm leading-6 text-taupe">
                  Use this sequence for a clean 3–5 minute showcase without getting lost in the
                  workspace switching.
                </p>
              </div>
              <Link
                to="/app/settings"
                className="inline-flex items-center gap-2 text-sm font-medium text-cocoa transition hover:text-espresso"
              >
                Integration settings
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  step: "Step 1",
                  title: "Settings",
                  detail: "Show HashKey contracts, Safe endpoints, KYC-ready config, and mint USDC.",
                  href: "/app/settings",
                },
                {
                  step: "Step 2",
                  title: "Seller → Buyer",
                  detail: "Create a receivable, then approve it to move into finance eligibility.",
                  href: "/app/seller",
                },
                {
                  step: "Step 3",
                  title: "Capital",
                  detail: "Commit USDC from the connected wallet into the finance-eligible item.",
                  href: "/app/capital",
                },
                {
                  step: "Step 4",
                  title: "Settlement",
                  detail: "Settle, release holdback if needed, and open analytics or explorer links.",
                  href: "/app/settlements",
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="rounded-2xl border border-sand bg-card-stone/40 p-4 transition hover:border-cocoa/20 hover:bg-card-cream"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-taupe">{item.step}</p>
                  <p className="mt-2 font-medium text-espresso">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-cocoa">{item.detail}</p>
                </Link>
              ))}
            </div>
          </Surface>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InsightCard
              title="Average days to fund"
              value={`${overviewMetrics.averageDaysToFund.toFixed(1)} days`}
              detail="Buyer acknowledgement remains the hard gate before capital deployment."
            />
            <InsightCard
              title="Underwriting summary"
              value={`${openAlerts.length} flagged items`}
              detail="Live receivables with disputes, overdue drift, or blocked execution surface here."
              accent="warning"
            />
            <InsightCard
              title="Compliance coverage"
              value={currentUser.complianceStatus === "approved" ? "100%" : "0%"}
              detail="The current wallet must clear ComplianceGate before live writes execute."
              accent="positive"
            />
          </div>
        </div>

        <div className="space-y-6">
	          <Surface className="space-y-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-green-deep" />
              <div>
                <p className="text-sm font-medium text-espresso">Underwriting memo</p>
                <p className="mt-1 text-sm leading-6 text-taupe">
                  SETTL now reads its primary state from live HashKey testnet contracts. Funding, settlement, compliance, and disputes are no longer simulated in the main flow.
                </p>
              </div>
            </div>
          </Surface>
          <Surface className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-cocoa" />
              <div>
                <p className="text-sm font-medium text-espresso">HashKey proof points</p>
                <p className="mt-1 text-sm leading-6 text-taupe">
                  Showcase the surfaces that are verifiably live and institutional on HashKey.
                </p>
              </div>
            </div>
            <div className="grid gap-3">
              <ProofRow
                label="Chain"
                value="HashKey Chain Testnet"
                href={getExplorerLink({
                  hash: contractAddresses.SettlementRouter || currentUser.wallet,
                  path: contractAddresses.SettlementRouter ? "address" : "address",
                })}
                action="Explorer"
              />
              <ProofRow
                label="Treasury ops"
                value="HashKey Safe ready"
                href={hashKeyIntegrations.safe.testnetUrl}
                action="Open Safe"
              />
              <ProofRow
                label="Compliance"
                value={
                  hashKeyIntegrations.kyc.enabled
                    ? "Official HashKey KYC sync path"
                    : "Protocol gate live · official KYC address pending"
                }
                href="/app/settings"
                internal
                action="View settings"
              />
              <ProofRow
                label="Settlement rail"
                value="HSP adapter logged onchain"
                href={contractAddresses.HspSettlementAdapter
                  ? getExplorerLink({
                      hash: contractAddresses.HspSettlementAdapter,
                      path: "address",
                    })
                  : "/app/settings"}
                internal={!contractAddresses.HspSettlementAdapter}
                action={contractAddresses.HspSettlementAdapter ? "View adapter" : "Configure"}
              />
            </div>
          </Surface>
          <CompliancePanel
            title={currentUser.entityName}
            status={currentUser.complianceStatus}
            detail="Execution rights depend on ComplianceGate approval before funding or settlement can proceed."
          />
          <Surface className="space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber" />
              <div>
                <p className="text-sm font-medium text-espresso">Operational alerts</p>
                <ul className="mt-2 space-y-2 text-sm text-taupe">
                  {openAlerts.length ? (
                    openAlerts.slice(0, 3).map((receivable) => (
                      <li key={receivable.id}>
                        {receivable.referenceNumber} is {receivable.status.toLowerCase()}.
                      </li>
                    ))
                  ) : (
                    <li>No live operational alerts are open.</li>
                  )}
                </ul>
              </div>
            </div>
          </Surface>
          <Surface className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-cocoa" />
              <div>
                <p className="text-sm font-medium text-espresso">Audit readiness</p>
                <p className="mt-1 text-sm leading-6 text-taupe">
                  Live receivables carry onchain status, settlement references, and stored document hashes suitable for testnet walkthroughs.
                </p>
              </div>
            </div>
          </Surface>
          <ActivityFeed items={activity.slice(0, 4)} />
        </div>
      </div>
    </div>
  );
}

function ProofRow({
  label,
  value,
  href,
  action,
  internal = false,
}: {
  label: string;
  value: string;
  href: string;
  action: string;
  internal?: boolean;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-sand/60 bg-card-stone/40 px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-taupe">{label}</p>
        <p className="mt-1 text-sm font-medium text-espresso">{value}</p>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-cocoa">
        {action}
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </div>
  );

  if (internal) {
    return <Link to={href}>{content}</Link>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}
