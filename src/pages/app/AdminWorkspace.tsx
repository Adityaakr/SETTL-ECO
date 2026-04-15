import { useMemo } from "react";
import { useSettl } from "@/context/settl-context";
import {
  CompliancePanel,
  PageSection,
  Surface,
} from "@/components/settl/shared";
import { Button } from "@/components/ui/button";

export default function AdminWorkspace() {
  const {
    currentUser,
    disputes,
    enableCompliance,
    liveReady,
    receivables,
    resolveDispute,
    walletAddress,
  } = useSettl();

  const flaggedReceivables = useMemo(
    () =>
      receivables.filter(
        (receivable) =>
          receivable.anomalyFlags.length > 0 ||
          receivable.status === "Overdue" ||
          receivable.status === "Disputed",
      ),
    [receivables],
  );

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Admin and compliance"
        title="Operate compliance, dispute resolution, and settlement controls"
        description="The admin surface is wired to live contracts. In this testnet deployment, the connected wallet can self-activate compliance and resolve disputes for end-to-end verification."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-espresso">Compliance control</p>
            <p className="text-sm text-taupe">
              Wallet-level compliance gating remains a first-class requirement for creation, funding, and settlement.
            </p>
          </div>
          <CompliancePanel
            title={walletAddress ?? currentUser.entityName}
            status={currentUser.complianceStatus}
            detail={
              liveReady
                ? "This wallet is connected to the live HashKey testnet deployment."
                : "Connect a wallet on HashKey testnet to enable live execution."
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void enableCompliance()}>
              Enable testnet compliance
            </Button>
          </div>
        </Surface>

        <Surface className="space-y-4">
          <div>
            <p className="text-lg font-semibold text-espresso">Dispute queue</p>
            <p className="text-sm text-taupe">
              Disputed receivables remain blocked until a live resolution transaction restores the lifecycle.
            </p>
          </div>
          <div className="space-y-4">
            {disputes.length ? (
              disputes.map((dispute) => (
                <div
                  key={dispute.id}
                  className="rounded-2xl border border-sand bg-card-stone/40 p-4"
                >
                  <p className="font-medium text-espresso">
                    Receivable {dispute.receivableId}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-cocoa">
                    {dispute.reason}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-taupe">
                    {dispute.status.replace("_", " ")}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() =>
                        void resolveDispute(
                          dispute.receivableId,
                          "Resolved on testnet after document and settlement review.",
                        )
                      }
                    >
                      Resolve dispute
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-sand bg-card-stone/40 p-4 text-sm text-taupe">
                No live disputes are currently open.
              </div>
            )}
          </div>
        </Surface>
      </div>

      <Surface className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-espresso">Flagged receivables</p>
          <p className="text-sm text-taupe">
            Overdue, disputed, or otherwise flagged items remain visible for manual intervention.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {flaggedReceivables.length ? (
            flaggedReceivables.map((receivable) => (
              <div
                key={receivable.id}
                className="rounded-2xl border border-sand bg-card-stone/40 p-4"
              >
                <p className="font-medium text-espresso">
                  {receivable.referenceNumber}
                </p>
                <p className="mt-1 text-sm text-taupe">
                  {receivable.anomalyFlags.join(" · ") || receivable.status}
                </p>
                <p className="mt-3 text-sm text-cocoa">
                  Holdback {receivable.holdbackPercent}% · {receivable.buyerEntityName}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-sand bg-card-stone/40 p-4 text-sm text-taupe">
              No flagged receivables.
            </div>
          )}
        </div>
      </Surface>
    </div>
  );
}
