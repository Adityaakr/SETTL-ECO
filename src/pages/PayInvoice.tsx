import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useSettl } from "@/context/settl-context";
import { PageSection, SettlementTimeline, Surface } from "@/components/settl/shared";
import { Button } from "@/components/ui/button";
import { currencyFormatter, dateFormatter } from "@/domain/formatters";

export default function PayInvoice() {
  const { invoiceId } = useParams();
  const { receivables, settlements, settleReceivable } = useSettl();

  const receivable = useMemo(
    () => receivables.find((item) => item.id === invoiceId || item.referenceNumber === invoiceId),
    [invoiceId, receivables],
  );
  const settlement = settlements.find((item) => item.receivableId === receivable?.id);

  if (!receivable) {
    return (
      <div className="min-h-screen bg-porcelain px-4 py-10 md:px-8">
        <div className="mx-auto max-w-4xl">
          <Surface className="space-y-4">
            <p className="text-xl font-semibold text-espresso">Receivable not found</p>
            <p className="text-sm text-taupe">This settlement link is not available in the current demo dataset.</p>
            <Button asChild>
              <Link to="/">Return home</Link>
            </Button>
          </Surface>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-porcelain px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageSection
          eyebrow="Public settlement page"
          title={`Settle ${receivable.referenceNumber}`}
          description="This buyer-facing surface stays clean and operational. It can run against mock or live HSP modes without changing the surrounding experience."
        />
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Surface className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DataRow label="Seller" value={receivable.sellerEntityName} />
              <DataRow label="Buyer" value={receivable.buyerEntityName} />
              <DataRow label="Amount" value={currencyFormatter(receivable.amount, receivable.currency)} />
              <DataRow label="Due date" value={dateFormatter(receivable.dueDate)} />
            </div>
            <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-taupe">Description</p>
              <p className="mt-2 text-sm text-cocoa">{receivable.description}</p>
            </div>
            <Button onClick={() => void settleReceivable(receivable.id)}>
              Initiate settlement
            </Button>
          </Surface>
          {settlement ? <SettlementTimeline settlement={settlement} /> : null}
        </div>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-taupe">{label}</p>
      <p className="mt-1 text-sm font-medium text-espresso">{value}</p>
    </div>
  );
}
