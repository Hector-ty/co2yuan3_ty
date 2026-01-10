import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  count: number;
  color: "fossil" | "fugitive" | "indirect";
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const colorClasses = {
  fossil: {
    bg: "bg-blue-900/50",
    border: "border-blue-700",
    text: "text-blue-300",
    badge: "bg-blue-700 text-blue-100",
  },
  fugitive: {
    bg: "bg-orange-900/50",
    border: "border-orange-700",
    text: "text-orange-300",
    badge: "bg-orange-700 text-orange-100",
  },
  indirect: {
    bg: "bg-emerald-900/50",
    border: "border-emerald-700",
    text: "text-emerald-300",
    badge: "bg-emerald-700 text-emerald-100",
  },
};

export function CollapsibleSection({
  title,
  count,
  color,
  defaultExpanded = true,
  children,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const colors = colorClasses[color];

  return (
    <div className={`rounded-lg border ${colors.border} overflow-hidden mb-4`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 ${colors.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className={`w-5 h-5 ${colors.text}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${colors.text}`} />
          )}
          <span className={`font-semibold text-lg ${colors.text}`}>{title}</span>
          <span className={`px-2 py-0.5 rounded-full text-sm ${colors.badge}`}>
            {count}种
          </span>
        </div>
      </button>
      {isExpanded && (
        <div className="bg-card/50">
          {children}
        </div>
      )}
    </div>
  );
}
