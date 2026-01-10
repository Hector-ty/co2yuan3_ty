import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

type FactorType = "fossil" | "fugitive" | "indirect";

interface FactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: FactorType;
  mode: "add" | "edit";
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  isLoading?: boolean;
}

export function FactorDialog({
  open,
  onOpenChange,
  type,
  mode,
  initialData,
  onSubmit,
  isLoading = false,
}: FactorDialogProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const data: Record<string, string> = {};
      Object.entries(initialData).forEach(([key, value]) => {
        data[key] = String(value ?? "");
      });
      setFormData(data);
    } else {
      setFormData({});
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: Record<string, unknown> = { ...formData };
    if (type === "fugitive" && formData.gwpValue) {
      submitData.gwpValue = parseInt(formData.gwpValue, 10);
    }
    if (initialData?.id) {
      submitData.id = initialData.id;
    }
    onSubmit(submitData);
  };

  const updateField = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getTitle = () => {
    const typeNames = {
      fossil: "化石燃料排放因子",
      fugitive: "逸散排放因子",
      indirect: "间接排放因子",
    };
    return `${mode === "add" ? "添加" : "编辑"}${typeNames[type]}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {type === "fossil" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fuelTypeCn" className="text-right">
                    燃料类型
                  </Label>
                  <Input
                    id="fuelTypeCn"
                    value={formData.fuelTypeCn || ""}
                    onChange={(e) => updateField("fuelTypeCn", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fuelTypeEn" className="text-right">
                    英文名
                  </Label>
                  <Input
                    id="fuelTypeEn"
                    value={formData.fuelTypeEn || ""}
                    onChange={(e) => updateField("fuelTypeEn", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emissionFactor" className="text-right">
                    排放因子
                  </Label>
                  <Input
                    id="emissionFactor"
                    value={formData.emissionFactor || ""}
                    onChange={(e) => updateField("emissionFactor", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit" className="text-right">
                    单位
                  </Label>
                  <Input
                    id="unit"
                    value={formData.unit || ""}
                    onChange={(e) => updateField("unit", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
              </>
            )}

            {type === "fugitive" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="gasNameCn" className="text-right">
                    气体名称
                  </Label>
                  <Input
                    id="gasNameCn"
                    value={formData.gasNameCn || ""}
                    onChange={(e) => updateField("gasNameCn", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="gasNameEn" className="text-right">
                    英文名
                  </Label>
                  <Input
                    id="gasNameEn"
                    value={formData.gasNameEn || ""}
                    onChange={(e) => updateField("gasNameEn", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="gwpValue" className="text-right">
                    GWP值
                  </Label>
                  <Input
                    id="gwpValue"
                    type="number"
                    value={formData.gwpValue || ""}
                    onChange={(e) => updateField("gwpValue", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emissionFactor" className="text-right">
                    排放因子
                  </Label>
                  <Input
                    id="emissionFactor"
                    value={formData.emissionFactor || ""}
                    onChange={(e) => updateField("emissionFactor", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit" className="text-right">
                    单位
                  </Label>
                  <Input
                    id="unit"
                    value={formData.unit || ""}
                    onChange={(e) => updateField("unit", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    分类
                  </Label>
                  <Select
                    value={formData.category || ""}
                    onValueChange={(value) => updateField("category", value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="airConditioning">空调系统</SelectItem>
                      <SelectItem value="fireSuppression">灭火系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {type === "indirect" && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emissionTypeCn" className="text-right">
                    排放类型
                  </Label>
                  <Input
                    id="emissionTypeCn"
                    value={formData.emissionTypeCn || ""}
                    onChange={(e) => updateField("emissionTypeCn", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emissionTypeEn" className="text-right">
                    英文名
                  </Label>
                  <Input
                    id="emissionTypeEn"
                    value={formData.emissionTypeEn || ""}
                    onChange={(e) => updateField("emissionTypeEn", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="emissionFactor" className="text-right">
                    排放因子
                  </Label>
                  <Input
                    id="emissionFactor"
                    value={formData.emissionFactor || ""}
                    onChange={(e) => updateField("emissionFactor", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="unit" className="text-right">
                    单位
                  </Label>
                  <Input
                    id="unit"
                    value={formData.unit || ""}
                    onChange={(e) => updateField("unit", e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="remarks" className="text-right">
                    备注
                  </Label>
                  <Input
                    id="remarks"
                    value={formData.remarks || ""}
                    onChange={(e) => updateField("remarks", e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
