import { useSettl } from "@/context/settl-context";
import { ActivityFeed, PageSection } from "@/components/settl/shared";

export default function ActivityPage() {
  const { activity } = useSettl();

  return (
    <div className="space-y-6">
      <PageSection
        eyebrow="Activity"
        title="Operational feed across receivables, compliance, and settlement"
        description="Every meaningful state change remains visible so demos and audits can follow the system of record."
      />
      <ActivityFeed items={activity} />
    </div>
  );
}
