import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  BriefcaseBusiness,
  ChevronRight,
  CircleDot,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ActivityEvent,
  ComplianceStatus,
  CounterpartyProfile,
  Receivable,
  ReceivableStatus,
  RiskBand,
  Settlement,
  TxState,
} from "@/domain/models";
import {
  compactFormatter,
  currencyFormatter,
  dateFormatter,
  daysUntil,
  percentFormatter,
} from "@/domain/formatters";

export function PageSection({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-sand/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-taupe">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-espresso md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-cocoa">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-sand bg-card-cream p-5 shadow-[0_1px_0_rgba(47,35,30,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "warning" | "negative";
}) {
  return (
    <Surface
      className={cn(
        "space-y-3",
        tone === "positive" && "bg-mint/50",
        tone === "warning" && "bg-amber-tint/50",
        tone === "negative" && "bg-rose-tint/40",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-taupe">
        {label}
      </p>
      <p className="text-3xl font-bold tracking-tight text-espresso tabular-nums">
        {value}
      </p>
      <p className="text-sm leading-6 text-cocoa">{detail}</p>
    </Surface>
  );
}

export function StatusChip({ status }: { status: ReceivableStatus | Settlement["status"] }) {
  const tone =
    status === "Cleared" || status === "Paid" || status === "completed"
      ? "positive"
      : status === "Overdue" || status === "Disputed" || status === "failed"
        ? "negative"
        : status === "FinanceEligible" || status === "BuyerAcknowledged" || status === "pending"
          ? "warning"
          : "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        tone === "positive" && "border-green/20 bg-mint text-green-deep",
        tone === "warning" && "border-amber/25 bg-amber-tint text-amber",
        tone === "negative" && "border-red-soft/20 bg-rose-tint text-red-soft",
        tone === "neutral" && "border-sand bg-card-stone text-cocoa",
      )}
    >
      <CircleDot className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const map = {
    approved: {
      label: "Compliance approved",
      className: "border-green/20 bg-mint text-green-deep",
      icon: BadgeCheck,
    },
    pending_review: {
      label: "Review pending",
      className: "border-amber/25 bg-amber-tint text-amber",
      icon: Clock3,
    },
    restricted: {
      label: "Restricted",
      className: "border-red-soft/20 bg-rose-tint text-red-soft",
      icon: Ban,
    },
    expired: {
      label: "Expired",
      className: "border-sand bg-card-stone text-cocoa",
      icon: AlertTriangle,
    },
  } as const;

  const item = map[status];
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        item.className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {item.label}
    </span>
  );
}

export function RiskBadge({ band }: { band: RiskBand }) {
  const className =
    band === "Low"
      ? "border-green/20 bg-mint text-green-deep"
      : band === "Moderate"
        ? "border-sand bg-card-stone text-cocoa"
        : band === "Elevated"
          ? "border-amber/25 bg-amber-tint text-amber"
          : "border-red-soft/20 bg-rose-tint text-red-soft";

  return <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", className)}>{band} risk</span>;
}

export function FundingProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="h-2 rounded-full bg-warm-canvas">
        <div
          className="h-2 rounded-full bg-green transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-taupe">
        <span>Funding progress</span>
        <span className="tabular-nums">{progress}%</span>
      </div>
    </div>
  );
}

export function InsightCard({
  title,
  value,
  detail,
  accent = "neutral",
}: {
  title: string;
  value: string;
  detail: string;
  accent?: "neutral" | "positive" | "warning";
}) {
  return (
    <Surface
      className={cn(
        "space-y-2",
        accent === "positive" && "bg-mint/40",
        accent === "warning" && "bg-amber-tint/40",
      )}
    >
      <p className="text-sm font-medium text-cocoa">{title}</p>
      <p className="text-2xl font-semibold text-espresso">{value}</p>
      <p className="text-sm leading-6 text-taupe">{detail}</p>
    </Surface>
  );
}

export function AnalyticsCard({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <Surface className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-espresso">{title}</h3>
        {detail ? <p className="text-sm text-taupe">{detail}</p> : null}
      </div>
      {children}
    </Surface>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <Surface className="border-dashed text-center">
      <p className="text-lg font-semibold text-espresso">{title}</p>
      <p className="mt-2 text-sm text-taupe">{detail}</p>
    </Surface>
  );
}

export function ErrorState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <Surface className="bg-rose-tint/40">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-soft" />
        <div className="space-y-1">
          <p className="font-semibold text-espresso">{title}</p>
          <p className="text-sm text-cocoa">{detail}</p>
        </div>
      </div>
    </Surface>
  );
}

export function ActivityFeed({ items }: { items: ActivityEvent[] }) {
  return (
    <Surface className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-espresso">Activity center</h3>
        <Link to="/app/activity" className="text-sm text-taupe transition hover:text-espresso">
          View all
        </Link>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3 border-b border-sand/60 pb-4 last:border-b-0 last:pb-0">
            <span
              className={cn(
                "mt-1 h-2.5 w-2.5 rounded-full",
                item.tone === "positive" && "bg-green",
                item.tone === "warning" && "bg-amber",
                item.tone === "negative" && "bg-red-soft",
                item.tone === "neutral" && "bg-taupe",
              )}
            />
            <div className="space-y-1">
              <p className="text-sm font-medium text-espresso">{item.title}</p>
              <p className="text-sm leading-6 text-taupe">{item.detail}</p>
              <p className="text-xs uppercase tracking-[0.18em] text-dusty">
                {item.actor} · {dateFormatter(item.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

export function CompliancePanel({
  title,
  status,
  detail,
}: {
  title: string;
  status: ComplianceStatus;
  detail: string;
}) {
  return (
    <Surface className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-espresso">{title}</p>
          <p className="text-sm text-taupe">{detail}</p>
        </div>
        <ComplianceBadge status={status} />
      </div>
    </Surface>
  );
}

export function CounterpartyCard({ counterparty }: { counterparty: CounterpartyProfile }) {
  return (
    <Surface className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-espresso">{counterparty.entityName}</p>
          <p className="text-sm text-taupe">
            {counterparty.sector} · {counterparty.jurisdiction}
          </p>
        </div>
        <span className="rounded-full border border-sand px-3 py-1 text-xs font-medium text-cocoa">
          {counterparty.reliabilityLabel}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DataPoint label="Settlement success" value={percentFormatter(counterparty.settlementSuccessRate, 1)} />
        <DataPoint label="On-time rate" value={percentFormatter(counterparty.onTimeRate, 1)} />
        <DataPoint label="Dispute rate" value={percentFormatter(counterparty.disputeRate, 1)} />
        <DataPoint label="Cleared receivables" value={counterparty.clearedReceivables.toString()} />
      </div>
    </Surface>
  );
}

export function FilterToolbar({
  search,
  onSearchChange,
  filters,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters?: ReactNode;
}) {
  return (
    <Surface className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search receivables, counterparties, or references"
        className="w-full rounded-2xl border border-sand bg-card-stone px-4 py-3 text-sm text-espresso outline-none placeholder:text-dusty focus:border-green md:max-w-md"
      />
      <div className="flex flex-wrap items-center gap-2">{filters}</div>
    </Surface>
  );
}

export function ReceivableTable({
  receivables,
  onSelect,
  action,
}: {
  receivables: Receivable[];
  onSelect?: (receivable: Receivable) => void;
  action?: (receivable: Receivable) => ReactNode;
}) {
  return (
    <Surface className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-card-stone/80 text-xs uppercase tracking-[0.18em] text-taupe">
            <tr>
              <th className="px-5 py-4 font-medium">Reference</th>
              <th className="px-5 py-4 font-medium">Counterparty</th>
              <th className="px-5 py-4 font-medium">Amount</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Risk</th>
              <th className="px-5 py-4 font-medium">Due</th>
              <th className="px-5 py-4 font-medium">Funding</th>
              <th className="px-5 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/70">
            {receivables.map((receivable) => (
              <tr
                key={receivable.id}
                className="transition hover:bg-card-stone/30"
                onClick={() => onSelect?.(receivable)}
              >
                <td className="px-5 py-4 align-top">
                  <div className="space-y-1">
                    <p className="font-medium text-espresso">{receivable.referenceNumber}</p>
                    <p className="text-sm text-taupe">{receivable.sector}</p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-espresso">{receivable.buyerEntityName}</p>
                    <p className="text-sm text-taupe">{receivable.jurisdiction}</p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-sm font-medium text-espresso">
                  <div className="space-y-1">
                    <p>{currencyFormatter(receivable.amount, receivable.currency)}</p>
                    <p className="text-xs text-taupe">
                      Request {currencyFormatter(receivable.requestedFinancingAmount, receivable.currency)}
                    </p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <StatusChip status={receivable.status} />
                </td>
                <td className="px-5 py-4 align-top">
                  <RiskBadge band={receivable.riskBand} />
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="space-y-1 text-sm text-cocoa">
                    <p>{dateFormatter(receivable.dueDate)}</p>
                    <p className="text-xs text-taupe">{daysUntil(receivable.dueDate)} days</p>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="min-w-[140px]">
                    <FundingProgressBar progress={receivable.fundingProgress} />
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-right">
                  {action ? action(receivable) : <ChevronRight className="ml-auto h-4 w-4 text-dusty" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

export function ReceivableCard({
  receivable,
  action,
}: {
  receivable: Receivable;
  action?: ReactNode;
}) {
  return (
    <Surface className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold text-espresso">{receivable.referenceNumber}</p>
          <p className="text-sm text-taupe">
            {receivable.sellerEntityName} → {receivable.buyerEntityName}
          </p>
        </div>
        <StatusChip status={receivable.status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DataPoint label="Amount" value={currencyFormatter(receivable.amount, receivable.currency)} />
        <DataPoint label="Requested advance" value={currencyFormatter(receivable.requestedFinancingAmount, receivable.currency)} />
        <DataPoint label="Due date" value={dateFormatter(receivable.dueDate)} />
        <DataPoint label="Risk" value={`${receivable.riskBand} · ${receivable.riskScore}`} />
      </div>
      {receivable.anomalyFlags.length ? (
        <div className="rounded-2xl border border-amber/25 bg-amber-tint px-4 py-3 text-sm text-cocoa">
          <p className="font-medium text-espresso">Anomaly flags</p>
          <p className="mt-1">{receivable.anomalyFlags.join(" · ")}</p>
        </div>
      ) : null}
      <FundingProgressBar progress={receivable.fundingProgress} />
      {action}
    </Surface>
  );
}

export function DetailDrawer({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-espresso/20 backdrop-blur-[1px]"
          />
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto border-l border-sand bg-porcelain px-5 py-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-espresso">{title}</h3>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
            {children}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function SettlementTimeline({
  settlement,
}: {
  settlement: Settlement;
}) {
  return (
    <Surface className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-espresso">Settlement timeline</p>
          <p className="text-sm text-taupe">{settlement.reference}</p>
        </div>
        <StatusChip status={settlement.status} />
      </div>
      <div className="space-y-3">
        {settlement.waterfall.map((entry) => (
          <div key={entry.label} className="flex items-center justify-between rounded-2xl border border-sand/60 bg-card-stone/40 px-4 py-3">
            <p className="text-sm text-cocoa">{entry.label}</p>
            <p className="text-sm font-medium text-espresso">{currencyFormatter(entry.amount)}</p>
          </div>
        ))}
      </div>
      <a
        href={settlement.explorerPath}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-cocoa transition hover:text-espresso"
      >
        View settlement reference
        <ArrowUpRight className="h-4 w-4" />
      </a>
    </Surface>
  );
}

export function TransactionToast({
  state,
  label,
}: {
  state: TxState;
  label: string;
}) {
  if (state === "idle") return null;

  return (
    <Surface
      className={cn(
        "flex items-center gap-3",
        state === "success" && "bg-mint/40",
        state === "pending" && "bg-card-stone",
        state === "failed" && "bg-rose-tint/40",
      )}
    >
      {state === "success" ? (
        <ShieldCheck className="h-5 w-5 text-green-deep" />
      ) : state === "failed" ? (
        <AlertTriangle className="h-5 w-5 text-red-soft" />
      ) : (
        <BriefcaseBusiness className="h-5 w-5 text-cocoa" />
      )}
      <div>
        <p className="text-sm font-medium text-espresso">{label}</p>
        <p className="text-sm text-taupe">
          {state === "pending"
            ? "Transaction pending."
            : state === "success"
              ? "Transaction confirmed."
              : "Transaction failed."}
        </p>
      </div>
    </Surface>
  );
}

function DataPoint({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sand/60 bg-card-stone/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{label}</p>
      <p className="mt-1 text-sm font-medium text-espresso">{value}</p>
    </div>
  );
}

export function StatStrip({
  items,
}: {
  items: Array<{ label: string; value: number | string; positive?: boolean }>;
}) {
  return (
    <Surface className="grid gap-4 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-taupe">{item.label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              item.positive ? "text-green-deep" : "text-espresso",
            )}
          >
            {typeof item.value === "number" ? compactFormatter(item.value) : item.value}
          </p>
        </div>
      ))}
    </Surface>
  );
}
