import { useMemo, useState } from "react";
import { useSettl } from "@/context/settl-context";
import {
  DetailDrawer,
  FilterToolbar,
  PageSection,
  ReceivableCard,
  ReceivableTable,
  SettlementTimeline,
  Surface,
} from "@/components/settl/shared";
import { currencyFormatter, dateFormatter, percentFormatter } from "@/domain/formatters";

export default function Pipeline() {
  const { receivables, settlements } = useSettl();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "cards">("table");

  const filtered = useMemo(
    () =>
      receivables.filter((receivable) =>
        `${receivable.referenceNumber} ${receivable.sellerEntityName} ${receivable.buyerEntityName} ${receivable.sector}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [receivables, search],
  );

  const selectedReceivable = filtered.find((receivable) => receivable.id === selectedId);
  const selectedSettlement = settlements.find(
    (settlement) => settlement.receivableId === selectedReceivable?.id,
  );

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Receivables pipeline"
        title="Monitor the full lifecycle from issuance to cleared settlement"
        description="Status chips, anomaly flags, compliance badges, and funding progress remain visible at portfolio scale."
      />

      <FilterToolbar
        search={search}
        onSearchChange={setSearch}
        filters={
          <>
            <button
              onClick={() => setView("table")}
              className={`rounded-full border px-4 py-2 text-sm ${view === "table" ? "border-green/20 bg-mint text-green-deep" : "border-sand bg-card-stone text-cocoa"}`}
            >
              Table
            </button>
            <button
              onClick={() => setView("cards")}
              className={`rounded-full border px-4 py-2 text-sm ${view === "cards" ? "border-green/20 bg-mint text-green-deep" : "border-sand bg-card-stone text-cocoa"}`}
            >
              Cards
            </button>
          </>
        }
      />

      {view === "table" ? (
        <ReceivableTable receivables={filtered} onSelect={(item) => setSelectedId(item.id)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((receivable) => (
            <button key={receivable.id} className="text-left" onClick={() => setSelectedId(receivable.id)}>
              <ReceivableCard receivable={receivable} />
            </button>
          ))}
        </div>
      )}

      <DetailDrawer
        title={selectedReceivable ? selectedReceivable.referenceNumber : "Receivable detail"}
        open={Boolean(selectedReceivable)}
        onClose={() => setSelectedId(null)}
      >
        {selectedReceivable ? (
          <div className="space-y-5">
            <Surface className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <DataRow label="Seller" value={selectedReceivable.sellerEntityName} />
                <DataRow label="Buyer" value={selectedReceivable.buyerEntityName} />
                <DataRow label="Amount" value={currencyFormatter(selectedReceivable.amount, selectedReceivable.currency)} />
                <DataRow label="Requested advance" value={currencyFormatter(selectedReceivable.requestedFinancingAmount, selectedReceivable.currency)} />
                <DataRow label="Advance rate" value={percentFormatter(selectedReceivable.indicativeAdvanceRate)} />
                <DataRow label="Discount" value={`${(selectedReceivable.indicativeDiscountBps / 100).toFixed(2)}%`} />
                <DataRow label="Issue date" value={dateFormatter(selectedReceivable.issueDate)} />
                <DataRow label="Due date" value={dateFormatter(selectedReceivable.dueDate)} />
              </div>
              <div className="rounded-2xl border border-sand bg-card-stone/40 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-taupe">Memo</p>
                <p className="mt-1 text-sm text-cocoa">{selectedReceivable.memo}</p>
              </div>
            </Surface>
            {selectedSettlement ? <SettlementTimeline settlement={selectedSettlement} /> : null}
          </div>
        ) : null}
      </DetailDrawer>
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
