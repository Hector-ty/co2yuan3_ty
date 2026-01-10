import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { FactorTable } from "@/components/FactorTable";
import { FactorDialog } from "@/components/FactorDialog";
import { trpc } from "@/lib/trpc";
import { Plus, Database, LogIn, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FactorType = "fossil" | "fugitive" | "indirect";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const isAdmin = isAuthenticated && user?.role === "admin";

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<FactorType>("fossil");
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingData, setEditingData] = useState<Record<string, unknown> | undefined>();

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: FactorType; id: number } | null>(null);

  // 获取数据
  const { data: allFactors, isLoading, refetch } = trpc.emissionFactors.getAll.useQuery();

  // 种子数据
  const seedMutation = trpc.emissionFactors.seed.useMutation({
    onSuccess: () => {
      toast.success("初始化数据成功！");
      refetch();
    },
    onError: (error) => {
      toast.error(`初始化失败: ${error.message}`);
    },
  });

  // 化石燃料 CRUD
  const createFossilMutation = trpc.fossilFuel.create.useMutation({
    onSuccess: () => {
      toast.success("添加成功！");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`添加失败: ${error.message}`),
  });

  const updateFossilMutation = trpc.fossilFuel.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功！");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`更新失败: ${error.message}`),
  });

  const deleteFossilMutation = trpc.fossilFuel.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功！");
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`删除失败: ${error.message}`),
  });

  // 逸散排放 CRUD
  const createFugitiveMutation = trpc.fugitive.create.useMutation({
    onSuccess: () => {
      toast.success("添加成功！");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`添加失败: ${error.message}`),
  });

  const updateFugitiveMutation = trpc.fugitive.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功！");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`更新失败: ${error.message}`),
  });

  const deleteFugitiveMutation = trpc.fugitive.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功！");
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`删除失败: ${error.message}`),
  });

  // 间接排放 CRUD
  const createIndirectMutation = trpc.indirect.create.useMutation({
    onSuccess: () => {
      toast.success("添加成功！");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`添加失败: ${error.message}`),
  });

  const updateIndirectMutation = trpc.indirect.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功！");
      setDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`更新失败: ${error.message}`),
  });

  const deleteIndirectMutation = trpc.indirect.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功！");
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error) => toast.error(`删除失败: ${error.message}`),
  });

  // 处理添加
  const handleAdd = (type: FactorType) => {
    setDialogType(type);
    setDialogMode("add");
    setEditingData(undefined);
    setDialogOpen(true);
  };

  // 处理编辑
  const handleEdit = (type: FactorType, item: Record<string, unknown>) => {
    setDialogType(type);
    setDialogMode("edit");
    setEditingData(item);
    setDialogOpen(true);
  };

  // 处理删除
  const handleDelete = (type: FactorType, item: { id: number }) => {
    setDeletingItem({ type, id: item.id });
    setDeleteDialogOpen(true);
  };

  // 确认删除
  const confirmDelete = () => {
    if (!deletingItem) return;
    switch (deletingItem.type) {
      case "fossil":
        deleteFossilMutation.mutate({ id: deletingItem.id });
        break;
      case "fugitive":
        deleteFugitiveMutation.mutate({ id: deletingItem.id });
        break;
      case "indirect":
        deleteIndirectMutation.mutate({ id: deletingItem.id });
        break;
    }
  };

  // 提交表单
  const handleSubmit = (data: Record<string, unknown>) => {
    if (dialogMode === "add") {
      switch (dialogType) {
        case "fossil":
          createFossilMutation.mutate(data as Parameters<typeof createFossilMutation.mutate>[0]);
          break;
        case "fugitive":
          createFugitiveMutation.mutate(data as Parameters<typeof createFugitiveMutation.mutate>[0]);
          break;
        case "indirect":
          createIndirectMutation.mutate(data as Parameters<typeof createIndirectMutation.mutate>[0]);
          break;
      }
    } else {
      switch (dialogType) {
        case "fossil":
          updateFossilMutation.mutate(data as Parameters<typeof updateFossilMutation.mutate>[0]);
          break;
        case "fugitive":
          updateFugitiveMutation.mutate(data as Parameters<typeof updateFugitiveMutation.mutate>[0]);
          break;
        case "indirect":
          updateIndirectMutation.mutate(data as Parameters<typeof updateIndirectMutation.mutate>[0]);
          break;
      }
    }
  };

  // 表格列定义
  const fossilColumns = [
    { key: "fuelTypeCn", label: "燃料类型", labelEn: "Fuel Type" },
    { key: "fuelTypeEn", label: "英文名", labelEn: "English Name" },
    { key: "emissionFactor", label: "排放因子", labelEn: "Emission Factor" },
    { key: "unit", label: "单位", labelEn: "Unit" },
    { key: "gwp", label: "GWP" },
    { key: "updatedAt", label: "最后更新", labelEn: "Last Updated" },
  ];

  const fugitiveColumns = [
    { key: "gasNameCn", label: "气体名称", labelEn: "Gas Name" },
    { key: "gasNameEn", label: "英文名", labelEn: "English Name" },
    { key: "gwpValue", label: "GWP值", labelEn: "GWP Value" },
    { key: "emissionFactor", label: "排放因子", labelEn: "Emission Factor" },
    { key: "unit", label: "单位", labelEn: "Unit" },
    { key: "updatedAt", label: "最后更新", labelEn: "Last Updated" },
  ];

  const indirectColumns = [
    { key: "emissionTypeCn", label: "排放类型", labelEn: "Emission Type" },
    { key: "emissionTypeEn", label: "英文名", labelEn: "English Name" },
    { key: "emissionFactor", label: "排放因子", labelEn: "Emission Factor" },
    { key: "unit", label: "单位", labelEn: "Unit" },
    { key: "remarks", label: "备注", labelEn: "Remarks" },
    { key: "updatedAt", label: "最后更新", labelEn: "Last Updated" },
  ];

  const fossilFuels = allFactors?.directEmissions.fossilFuels ?? [];
  const airConditioning = allFactors?.directEmissions.fugitiveEmissions.airConditioning ?? [];
  const fireSuppression = allFactors?.directEmissions.fugitiveEmissions.fireSuppression ?? [];
  const fugitiveAll = [...airConditioning, ...fireSuppression];
  const indirectEmissions = allFactors?.indirectEmissions ?? [];

  const hasNoData = fossilFuels.length === 0 && fugitiveAll.length === 0 && indirectEmissions.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                排放因子管理系统
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Emission Factor Management System
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    初始化数据
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAdd("fossil")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增因子
                  </Button>
                </>
              )}
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {user?.name || "用户"}
                    {isAdmin && (
                      <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        管理员
                      </span>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => logout()}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = getLoginUrl()}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  登录
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">加载中...</span>
          </div>
        ) : hasNoData ? (
          <div className="text-center py-20">
            <Database className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">暂无排放因子数据</h2>
            <p className="text-muted-foreground mb-6">
              {isAdmin
                ? "点击上方【初始化数据】按钮加载默认排放因子"
                : "请联系管理员初始化数据"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 直接排放 - 化石燃料 */}
            <CollapsibleSection
              title="化石燃料排放因子"
              count={fossilFuels.length}
              color="fossil"
              defaultExpanded={true}
            >
              <div className="p-2">
                {isAdmin && (
                  <div className="flex justify-end mb-2 px-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAdd("fossil")}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                )}
                <FactorTable
                  columns={fossilColumns}
                  data={fossilFuels}
                  isAdmin={isAdmin}
                  onEdit={(item) => handleEdit("fossil", item)}
                  onDelete={(item) => handleDelete("fossil", item)}
                />
              </div>
            </CollapsibleSection>

            {/* 直接排放 - 逸散排放 */}
            <CollapsibleSection
              title="逸散排放因子"
              count={fugitiveAll.length}
              color="fugitive"
              defaultExpanded={true}
            >
              <div className="p-2">
                {isAdmin && (
                  <div className="flex justify-end mb-2 px-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAdd("fugitive")}
                      className="text-orange-400 hover:text-orange-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                )}
                {/* 空调系统 */}
                {airConditioning.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-orange-300 px-4 py-2 bg-orange-900/20 rounded-t">
                      空调系统 / Air Conditioning System ({airConditioning.length}种)
                    </h4>
                    <FactorTable
                      columns={fugitiveColumns}
                      data={airConditioning}
                      isAdmin={isAdmin}
                      onEdit={(item) => handleEdit("fugitive", item)}
                      onDelete={(item) => handleDelete("fugitive", item)}
                    />
                  </div>
                )}
                {/* 灭火系统 */}
                {fireSuppression.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-orange-300 px-4 py-2 bg-orange-900/20 rounded-t">
                      灭火系统 / Fire Suppression System ({fireSuppression.length}种)
                    </h4>
                    <FactorTable
                      columns={fugitiveColumns}
                      data={fireSuppression}
                      isAdmin={isAdmin}
                      onEdit={(item) => handleEdit("fugitive", item)}
                      onDelete={(item) => handleDelete("fugitive", item)}
                    />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* 间接排放 */}
            <CollapsibleSection
              title="间接排放因子"
              count={indirectEmissions.length}
              color="indirect"
              defaultExpanded={true}
            >
              <div className="p-2">
                {isAdmin && (
                  <div className="flex justify-end mb-2 px-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAdd("indirect")}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加
                    </Button>
                  </div>
                )}
                <FactorTable
                  columns={indirectColumns}
                  data={indirectEmissions}
                  isAdmin={isAdmin}
                  onEdit={(item) => handleEdit("indirect", item)}
                  onDelete={(item) => handleDelete("indirect", item)}
                />
              </div>
            </CollapsibleSection>

            {/* 计算公式说明 */}
            <div className="mt-8 p-6 bg-card rounded-lg border border-border">
              <h3 className="text-lg font-semibold mb-4">计算公式说明</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-medium text-blue-300 mb-2">总碳排放量</h4>
                  <code className="block bg-background/50 p-3 rounded text-muted-foreground">
                    C_总 = C_直接 + C_间接
                  </code>
                </div>
                <div>
                  <h4 className="font-medium text-blue-300 mb-2">直接排放</h4>
                  <code className="block bg-background/50 p-3 rounded text-muted-foreground">
                    C_直接 = C_化石燃料 + C_逸散
                  </code>
                </div>
                <div>
                  <h4 className="font-medium text-orange-300 mb-2">化石燃料排放</h4>
                  <code className="block bg-background/50 p-3 rounded text-muted-foreground">
                    C_化石 = Σ(消耗量_i × 排放因子_i)
                  </code>
                </div>
                <div>
                  <h4 className="font-medium text-emerald-300 mb-2">间接排放</h4>
                  <code className="block bg-background/50 p-3 rounded text-muted-foreground">
                    C_间接 = C_外购电力 + C_外购热力
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>碳排放因子管理系统 | 基于《公共机构碳排放核算与管理要求》标准</p>
        </div>
      </footer>

      {/* 添加/编辑对话框 */}
      <FactorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        mode={dialogMode}
        initialData={editingData}
        onSubmit={handleSubmit}
        isLoading={
          createFossilMutation.isPending ||
          updateFossilMutation.isPending ||
          createFugitiveMutation.isPending ||
          updateFugitiveMutation.isPending ||
          createIndirectMutation.isPending ||
          updateIndirectMutation.isPending
        }
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个排放因子吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
