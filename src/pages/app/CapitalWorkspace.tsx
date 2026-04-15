import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSettl } from "@/context/settl-context";
import {
  EmptyState,
  MetricCard,
  PageSection,
  ReceivableCard,
  Surface,
} from "@/components/settl/shared";
import { currencyFormatter, percentFormatter } from "@/domain/formatters";
import { Button } from "@/components/ui/button";
import { useTokenBalance } from "@/hooks/useTokenBalance";

export default function CapitalWorkspace() {
  const { fundReceivable, portfolioMetrics, receivables } = useSettl();
  const { balance: tokenBalance } = useTokenBalance();

  const financeable = useMemo(
    () => receivables.filter((receivable) => receivable.status === "FinanceEligible"),
    [receivables],
  );
  const activeBook = useMemo(
    () =>
      receivables.filter((receivable) =>
        ["Funded", "Paid", "Cleared", "Overdue", "Disputed"].includes(receivable.status),
      ),
    [receivables],
  );

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Capital workspace"
        title="Deploy capital into compliant receivables with visible risk boundaries"
        description="Capital providers inspect underwriting context, jurisdiction, tenor, and compliance state before committing liquidity."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Deployed capital"
          value={currencyFormatter(portfolioMetrics.deployedCapital)}
          detail={`${currencyFormatter(portfolioMetrics.availableCapital)} dry powder remains.`}
        />
        <MetricCard
          label="Utilization"
          value={percentFormatter(portfolioMetrics.utilizationRate, 1)}
          detail={`${percentFormatter(portfolioMetrics.averageAdvanceRate)} average advance rate across the book.`}
          tone="positive"
        />
        <MetricCard
          label="Delayed exposure"
          value={currencyFormatter(portfolioMetrics.delayedExposure)}
          detail={`${(portfolioMetrics.weightedYieldBps / 100).toFixed(2)}% weighted portfolio yield.`}
          tone={portfolioMetrics.delayedExposure > 0 ? "warning" : "neutral"}
        />
        <MetricCard
          label="Wallet demo USDC"
          value={currencyFormatter(tokenBalance)}
          detail="This wallet balance is spent directly when capital is committed."
          tone={tokenBalance > 0 ? "positive" : "warning"}
        />
      </div>

      <Surface className="space-y-5">
        <div>
          <p className="text-lg font-semibold text-espresso">Finance-eligible receivables</p>
          <p className="text-sm text-taupe">
            Each opportunity is already gated by buyer acknowledgement and compliance status. Demo
            USDC is spent here when capital is committed.
          </p>
        </div>
        {financeable.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {financeable.map((receivable) => {
              const required = receivable.requestedFinancingAmount;
              const hasBalance = tokenBalance >= required;

              return (
                <ReceivableCard
                  key={receivable.id}
                  receivable={receivable}
                  action={
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-sand/60 bg-card-stone/40 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-taupe">Spend required</span>
                          <span className="font-medium text-espresso">
                            {currencyFormatter(required)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-taupe">Wallet balance</span>
                          <span
                            className={
                              hasBalance ? "font-medium text-green-deep" : "font-medium text-red-soft"
                            }
                          >
                            {currencyFormatter(tokenBalance)}
                          </span>
                        </div>
                      </div>
                      <Button onClick={() => fundReceivable(receivable.id)} disabled={!hasBalance}>
                        {hasBalance ? "Commit capital" : "Insufficient demo USDC"}
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <EmptyState
              title="No receivables are ready for capital yet"
              detail="You only see the commit action after a seller creates a receivable and the buyer approves it. Once the status becomes FinanceEligible, it appears here."
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <Surface className="space-y-2 bg-card-cream">
                <p className="text-xs uppercase tracking-[0.18em] text-taupe">Step 1</p>
                <p className="font-medium text-espresso">Issue a receivable</p>
                <p className="text-sm leading-6 text-cocoa">
                  Go to the seller workspace and submit a receivable draft.
                </p>
                <Link className="text-sm font-medium text-green-deep" to="/app/seller">
                  Open seller workspace
                </Link>
              </Surface>
              <Surface className="space-y-2 bg-card-cream">
                <p className="text-xs uppercase tracking-[0.18em] text-taupe">Step 2</p>
                <p className="font-medium text-espresso">Approve as buyer</p>
                <p className="text-sm leading-6 text-cocoa">
                  Buyer acknowledgement moves the receivable into finance eligibility.
                </p>
                <Link className="text-sm font-medium text-green-deep" to="/app/buyer">
                  Open buyer workspace
                </Link>
              </Surface>
              <Surface className="space-y-2 bg-card-cream">
                <p className="text-xs uppercase tracking-[0.18em] text-taupe">Step 3</p>
                <p className="font-medium text-espresso">Return here to fund</p>
                <p className="text-sm leading-6 text-cocoa">
                  The LP wallet spends demo USDC here when you click commit capital.
                </p>
                <Link className="text-sm font-medium text-green-deep" to="/app/settings">
                  Mint test USDC
                </Link>
              </Surface>
            </div>
          </div>
        )}
      </Surface>

      <Surface className="space-y-5">
        <div>
          <p className="text-lg font-semibold text-espresso">Active capital book</p>
          <p className="text-sm text-taupe">
            Receivables that have already been funded or moved through repayment remain visible
            here.
          </p>
        </div>
        {activeBook.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeBook.slice(0, 4).map((receivable) => (
              <ReceivableCard key={receivable.id} receivable={receivable} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No capital has been deployed yet"
            detail="Once a finance-eligible receivable is funded, it will remain visible here through settlement and clearance."
          />
        )}
      </Surface>
    </div>
  );
}
