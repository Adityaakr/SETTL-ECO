import { Link } from "react-router-dom";
import { Surface } from "@/components/settl/shared";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelain px-4">
      <div className="w-full max-w-xl">
        <Surface className="space-y-4 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-taupe">404</p>
          <p className="text-3xl font-semibold text-espresso">This route is outside the SETTL operating surface.</p>
          <p className="text-sm leading-6 text-taupe">
            Use the workspace navigation to return to the HashKey-native receivables flow.
          </p>
          <Button asChild>
            <Link to="/">Return home</Link>
          </Button>
        </Surface>
      </div>
    </div>
  );
}
