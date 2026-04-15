import { useMemo } from "react";
import { useSettl } from "@/context/settl-context";
import {
  PageSection,
  SettlementTimeline,
  Surface,
} from "@/components/settl/shared";
import { dateFormatter, daysUntil } from "@/domain/formatters";
import { Button } from "@/components/ui/button";

export default function Settlements() {
  const { receivables, releaseHoldback, settlements } = useSettl();

  const upcoming = useMemo(
    () => receivables.filter((receivable) => ["Funded", "FinanceEligible", "Overdue", "Disputed"].includes(receivable.status)),
    [receivables],
  );

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Settlement operations"
        title="Track maturities, held items, and waterfall execution"
        description="SETTL exposes upcoming due dates, disputed states, and settlement references so reconciliation remains visible."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-espresso">Upcoming maturities</p>
            <p className="text-sm text-taupe">Receivables approaching due date or requiring intervention.</p>
          </div>
          <div className="space-y-3">
            {upcoming.map((receivable) => (
              <div key={receivable.id} className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-espresso">{receivable.referenceNumber}</p>
                    <p className="text-sm text-taupe">{receivable.buyerEntityName}</p>
                  </div>
                  <p className="text-sm text-cocoa">{dateFormatter(receivable.dueDate)}</p>
                </div>
                <p className="mt-3 text-sm text-cocoa">
                  Due in {daysUntil(receivable.dueDate)} days · holdback {receivable.holdbackPercent}%
                </p>
              </div>
            ))}
          </div>
        </Surface>

        <div className="space-y-6">
          {settlements.slice(0, 3).map((settlement) => (
            <div key={settlement.id} className="space-y-3">
              <SettlementTimeline settlement={settlement} />
              {settlement.holdbackAmount > 0 && settlement.status !== "completed" ? (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => void releaseHoldback(settlement.receivableId)}
                  >
                    Release holdback
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
