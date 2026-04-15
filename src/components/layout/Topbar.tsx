import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, Building2, Circle, Network, ShieldCheck, Wallet } from "lucide-react";
import { useSettl } from "@/context/settl-context";
import { preferredChain } from "@/lib/hashkey-config";
import { Button } from "@/components/ui/button";
import { ComplianceBadge } from "@/components/settl/shared";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, currentUser, setRole, mode } = useSettl();

  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-porcelain/90 backdrop-blur">
      <div className="flex flex-col gap-4 px-4 py-4 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-taupe">
              {location.pathname === "/app" ? "Overview" : location.pathname.replace("/app/", "").replace("-", " ")}
            </p>
            <p className="text-xl font-semibold text-espresso">
              {currentUser.entityName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-sand bg-card-stone px-3 py-2 text-xs font-medium text-cocoa">
              <Circle className="h-3 w-3 fill-current" />
              {mode.appMode === "demo" ? "Demo mode" : "Live mode"}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-sand bg-card-stone px-3 py-2 text-xs font-medium text-cocoa">
              <Network className="h-3.5 w-3.5" />
              {preferredChain.name}
            </span>
            <ComplianceBadge status={currentUser.complianceStatus} />
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { value: "seller", label: "Seller", icon: Building2 },
              { value: "buyer", label: "Buyer", icon: Wallet },
              { value: "lp", label: "Capital", icon: ArrowUpRight },
              { value: "admin", label: "Admin", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              const active = currentRole === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => {
                    setRole(item.value as typeof currentRole);
                    navigate(
                      item.value === "seller"
                        ? "/app/seller"
                        : item.value === "buyer"
                          ? "/app/buyer"
                          : item.value === "lp"
                            ? "/app/capital"
                            : "/app/admin",
                    );
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-green/20 bg-mint text-green-deep"
                      : "border-sand bg-card-stone text-cocoa hover:border-cocoa/20 hover:text-espresso"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/connect">Connect / route</Link>
            </Button>
            <Button asChild>
              <Link to="/app/settings">Integration settings</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
