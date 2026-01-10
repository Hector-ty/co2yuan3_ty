import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Column {
  key: string;
  label: string;
  labelEn?: string;
}

interface FactorTableProps<T> {
  columns: Column[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  isAdmin?: boolean;
}

export function FactorTable<T extends { id: number; updatedAt?: Date | string }>({
  columns,
  data,
  onEdit,
  onDelete,
  isAdmin = false,
}: FactorTableProps<T>) {
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return format(d, "yyyy/MM/dd");
  };

  const getValue = (item: T, key: string): string => {
    if (key === "updatedAt") {
      return formatDate((item as Record<string, unknown>)[key] as Date | string);
    }
    const value = (item as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "-";
    return String(value);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
              >
                <div>{col.label}</div>
                {col.labelEn && (
                  <div className="text-xs opacity-60">{col.labelEn}</div>
                )}
              </th>
            ))}
            {isAdmin && (
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/30 hover:bg-accent/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm">
                  {getValue(item, col.key)}
                </td>
              ))}
              {isAdmin && (
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item)}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          暂无数据
        </div>
      )}
    </div>
  );
}
