import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  BadgeDollarSign,
  Building2,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Landmark,
  ShieldCheck,
  Sparkle,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", href: "/app", icon: LayoutDashboard },
  { label: "Seller", href: "/app/seller", icon: Building2 },
  { label: "Buyer", href: "/app/buyer", icon: WalletCards },
  { label: "Capital", href: "/app/capital", icon: Landmark },
  { label: "Pipeline", href: "/app/pipeline", icon: ClipboardList },
  { label: "Settlements", href: "/app/settlements", icon: BadgeDollarSign },
  { label: "Risk", href: "/app/risk", icon: Sparkle },
  { label: "Admin", href: "/app/admin", icon: ShieldCheck },
  { label: "Analytics", href: "/app/analytics", icon: ChartNoAxesCombined },
  { label: "Activity", href: "/app/activity", icon: Activity },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden w-[276px] shrink-0 border-r border-sand bg-card-cream/80 px-5 py-6 md:flex md:flex-col">
      <Link to="/" className="rounded-3xl border border-sand bg-card-stone/80 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-taupe">
          HashKey-native PayFi
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-espresso">SETTL</p>
        <p className="mt-2 text-sm leading-6 text-cocoa">
          Compliant receivables, settlement operations, and capital formation.
        </p>
      </Link>

      <nav className="mt-8 space-y-1.5">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "border border-sand bg-porcelain text-espresso"
                  : "text-cocoa hover:bg-card-stone/80 hover:text-espresso",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
