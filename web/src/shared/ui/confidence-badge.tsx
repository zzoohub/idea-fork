import { AlertTriangle } from "lucide-react";

export function ConfidenceBadge() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <span className="font-medium">Low confidence</span>
        <p className="text-muted-foreground mt-0.5">
          This brief is based on fewer than 3 source posts. Evidence is limited.
        </p>
      </div>
    </div>
  );
}
