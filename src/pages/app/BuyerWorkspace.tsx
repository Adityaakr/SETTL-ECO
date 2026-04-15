import { useMemo } from "react";
import { useSettl } from "@/context/settl-context";
import {
  CounterpartyCard,
  PageSection,
  ReceivableCard,
  Surface,
} from "@/components/settl/shared";
import { currencyFormatter } from "@/domain/formatters";
import { Button } from "@/components/ui/button";
import { seedCounterparties } from "@/data/demo";
import { useTokenBalance } from "@/hooks/useTokenBalance";

export default function BuyerWorkspace() {
  const { acknowledgeReceivable, currentUser, mode, openDispute, receivables, settleReceivable } = useSettl();
  const { balance: tokenBalance } = useTokenBalance();

  const pendingAcknowledgement = useMemo(
    () =>
      receivables.filter(
        (receivable) =>
          receivable.buyerId === currentUser.id &&
          (receivable.status === "Issued" || receivable.status === "BuyerAcknowledged"),
      ),
    [currentUser.id, receivables],
  );

  const payableReceivables = useMemo(
    () =>
      receivables.filter(
        (receivable) =>
          receivable.buyerId === currentUser.id &&
          ["FinanceEligible", "Funded", "Overdue", "Disputed"].includes(receivable.status),
      ),
    [currentUser.id, receivables],
  );

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Buyer workspace"
        title="Acknowledge, settle, and contest receivables with clear control points"
        description="Buyers confirm invoice validity before financing, then route settlement through HSP rails with dispute handling and holdback visibility."
      />

      <Surface className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-espresso">Buyer wallet spending</p>
            <p className="text-sm text-taupe">
              Settlement pulls demo USDC directly from the connected wallet. No separate vault
              deposit is required in the v2 flow.
            </p>
          </div>
          <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-taupe">Wallet demo USDC</p>
            <p className="mt-1 text-lg font-semibold text-espresso">
              {currencyFormatter(tokenBalance)}
            </p>
          </div>
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-6">
          <Surface className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-espresso">Awaiting acknowledgement</p>
              <p className="text-sm text-taupe">
                These receivables cannot be financed until the buyer confirms them.
              </p>
            </div>
            <div className="grid gap-4">
              {pendingAcknowledgement.map((receivable) => (
                <ReceivableCard
                  key={receivable.id}
                  receivable={receivable}
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => acknowledgeReceivable(receivable.id, "approve")}>
                        Approve
                      </Button>
                      <Button variant="outline" onClick={() => acknowledgeReceivable(receivable.id, "reject")}>
                        Reject
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          </Surface>

          <Surface className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-espresso">Settlement queue</p>
              <p className="text-sm text-taupe">
                {mode.appMode === "live"
                  ? "HSP routing is executed through the live settlement adapter contract on HashKey testnet."
                  : "HSP routing is isolated behind an adapter and remains fully functional in mock mode."}
              </p>
            </div>
            <div className="grid gap-4">
              {payableReceivables.map((receivable) => {
                const required = receivable.amount;
                const hasBalance = tokenBalance >= required;

                return (
                  <ReceivableCard
                    key={receivable.id}
                    receivable={receivable}
                    action={
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-sand/60 bg-card-stone/40 px-4 py-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-taupe">Settlement amount</span>
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
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => void settleReceivable(receivable.id)} disabled={!hasBalance}>
                          {hasBalance ? "Settle receivable" : "Insufficient demo USDC"}
                        </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                          openDispute(
                            receivable.id,
                            "Buyer requested review for settlement amount and delivery reconciliation.",
                          )
                        }
                          >
                            Open dispute
                          </Button>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </Surface>
        </div>

        <div className="space-y-6">
          {seedCounterparties.slice(0, 2).map((counterparty) => (
            <CounterpartyCard key={counterparty.id} counterparty={counterparty} />
          ))}
        </div>
      </div>
    </div>
  );
}
