import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { ArrowRight, Plus, Receipt, Edit2, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { insertExpenseEntrySchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Expenses() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertExpenseEntrySchema),
    defaultValues: {
      amount: "",
      reason: "",
      description: "",
    },
  });

  const { data: expenseEntries, isLoading, error: expenseError } = useQuery({
    queryKey: ["/api/expenses"]
  });

  if (expenseError && isUnauthorizedError(expenseError as Error)) {
    toast({
      title: "غير مصرح",
      description: "جاري إعادة تسجيل الدخول...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const addExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الإخراج بنجاح",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "غير مصرح",
          description: "جاري إعادة تسجيل الدخول...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الإخراج",
        variant: "destructive",
      });
    },
  });

  const editExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/expenses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsEditDialogOpen(false);
      setEditingEntry(null);
      form.reset();
      toast({
        title: "تم بنجاح",
        description: "تم تعديل الإخراج بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: "فشل في تعديل الإخراج",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "تم بنجاح",
        description: "تم حذف الإخراج بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الإخراج",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (editingEntry) {
      editExpenseMutation.mutate({ id: editingEntry.id, data });
    } else {
      addExpenseMutation.mutate(data);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    form.reset({
      reason: entry.reason,
      amount: entry.amount.toString(),
      description: entry.description || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الإخراج؟')) {
      deleteExpenseMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowRight className="w-4 h-4 ml-2" />
                العودة للرئيسية
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">إدارة الإخراجات</h1>
              <p className="text-gray-300" data-testid="text-page-subtitle">تسجيل المصاريف والنفقات</p>
            </div>
          </div>

          <Dialog 
            open={isAddDialogOpen || isEditDialogOpen} 
            onOpenChange={(open) => {
              if (!open) {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setEditingEntry(null);
                form.reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button 
                className="gradient-red hover:scale-105 transition-transform" 
                data-testid="button-add-expense"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة إخراج
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md glass-card border-white/20">
              <DialogHeader>
                <DialogTitle data-testid="text-dialog-title">
                  {editingEntry ? 'تعديل الإخراج' : 'إضافة إخراج جديد'}
                </DialogTitle>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سبب الإخراج</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="مثال: رواتب الموظفين، إيجار المكتب..." 
                            className="glass-card border-white/20 focus:border-red-400"
                            data-testid="input-expense-reason"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ (دينار عراقي)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="0" 
                            className="glass-card border-white/20 focus:border-red-400"
                            data-testid="input-expense-amount"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>التفاصيل (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="تفاصيل إضافية عن الإخراج..." 
                            className="glass-card border-white/20 focus:border-red-400 min-h-[100px]"
                            data-testid="textarea-expense-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full gradient-red hover:scale-105 transition-transform"
                    disabled={addExpenseMutation.isPending || editExpenseMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {(addExpenseMutation.isPending || editExpenseMutation.isPending) 
                      ? "جاري الحفظ..." 
                      : editingEntry 
                        ? "تحديث الإخراج" 
                        : "تسجيل الإخراج"
                    }
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expense Entries List */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-6" data-testid="text-expense-list-title">قائمة الإخراجات</h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">جاري تحميل الإخراجات...</p>
            </div>
          ) : expenseEntries?.length ? (
            <div className="grid gap-4">
              {expenseEntries.map((entry: any, index: number) => (
                <GlassCard 
                  key={entry.id} 
                  className="p-6"
                  data-testid={`card-expense-${index}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 space-x-reverse flex-1">
                      <div className="w-12 h-12 gradient-red rounded-full flex items-center justify-center mt-1">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" data-testid={`text-expense-reason-${index}`}>
                          {entry.reason}
                        </h3>
                        <p className="text-2xl font-bold text-red-400 mb-2" data-testid={`text-expense-amount-${index}`}>
                          {entry.amount} د.ع
                        </p>
                        <p className="text-sm text-gray-400 mb-2" data-testid={`text-expense-date-${index}`}>
                          {new Date(entry.createdAt).toLocaleDateString('ar-IQ')} - {new Date(entry.createdAt).toLocaleTimeString('ar-IQ')}
                        </p>
                        {entry.description && (
                          <p className="text-sm text-gray-300 leading-relaxed" data-testid={`text-expense-description-${index}`}>
                            {entry.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10"
                        onClick={() => handleEdit(entry)}
                        data-testid={`button-edit-expense-${index}`}
                      >
                        <Edit2 className="w-4 h-4 ml-1" />
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-400 text-red-400 hover:bg-red-400/10"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleteExpenseMutation.isPending}
                        data-testid={`button-delete-expense-${index}`}
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p data-testid="text-no-expenses">لا توجد إخراجات مسجلة بعد</p>
              <p className="text-sm mt-2">ابدأ بتسجيل أول إخراج</p>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}