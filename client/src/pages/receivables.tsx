import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { ArrowRight, DollarSign, Plus, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Header } from "@/components/layout/header";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.string().min(1, "المبلغ مطلوب"),
  description: z.string().optional(),
});

export default function Receivables() {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      description: "",
    },
  });

  const { data: receivables, isLoading, error: receivablesError } = useQuery({
    queryKey: ["/api/receivables"]
  });

  if (receivablesError && isUnauthorizedError(receivablesError as Error)) {
    toast({
      title: "غير مصرح",
      description: "جاري إعادة تسجيل الدخول...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"]
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/receivables/${selectedReceivable?.id}/payments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsPaymentDialogOpen(false);
      setSelectedReceivable(null);
      form.reset();
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل الدفعة بنجاح",
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
        description: "فشل في تسجيل الدفعة",
        variant: "destructive",
      });
    },
  });

  const deleteReceivableMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/receivables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receivables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "تم بنجاح",
        description: "تم حذف المستحق بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: "فشل في حذف المستحق",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    addPaymentMutation.mutate(data);
  };

  const handleAddPayment = (receivable: any) => {
    setSelectedReceivable(receivable);
    form.reset({
      amount: "",
      description: "",
    });
    setIsPaymentDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستحق؟')) {
      deleteReceivableMutation.mutate(id);
    }
  };

  const getCustomerName = (customerId: string) => {
    if (!customers || !Array.isArray(customers)) return "غير محدد";
    const customer = customers.find((c: any) => c.id === customerId);
    return customer?.name || "غير محدد";
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return { label: 'مدفوع بالكامل', color: 'text-green-400', icon: CheckCircle, bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' };
      case 'partial':
        return { label: 'مدفوع جزئياً', color: 'text-yellow-400', icon: Clock, bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' };
      default:
        return { label: 'لم يدفع', color: 'text-red-400', icon: AlertCircle, bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' };
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
              <h1 className="text-3xl font-bold" data-testid="text-page-title">المستحقات</h1>
              <p className="text-gray-300" data-testid="text-page-subtitle">إدارة الديون والمستحقات المالية</p>
            </div>
          </div>
        </div>

        {/* Payment Dialog */}
        <Dialog 
          open={isPaymentDialogOpen} 
          onOpenChange={(open) => {
            if (!open) {
              setIsPaymentDialogOpen(false);
              setSelectedReceivable(null);
              form.reset();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg glass-card border-white/20">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                إضافة دفعة على المستحق
              </DialogTitle>
            </DialogHeader>
            
            {selectedReceivable && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-200">
                  <strong>المبلغ الكامل:</strong> {selectedReceivable.totalAmount} د.ع
                </p>
                <p className="text-sm text-blue-200">
                  <strong>المدفوع:</strong> {selectedReceivable.paidAmount} د.ع
                </p>
                <p className="text-sm text-blue-200">
                  <strong>المتبقي:</strong> {selectedReceivable.remainingAmount} د.ع
                </p>
              </div>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ المدفوع (دينار عراقي) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0" 
                          className="glass-card border-white/20 focus:border-green-400"
                          data-testid="input-payment-amount"
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
                      <FormLabel>ملاحظات (اختياري)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="أدخل ملاحظات" 
                          className="glass-card border-white/20 focus:border-green-400"
                          data-testid="input-payment-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full gradient-green hover:scale-105 transition-transform"
                  disabled={addPaymentMutation.isPending}
                  data-testid="button-submit-payment"
                >
                  {addPaymentMutation.isPending ? "جاري الحفظ..." : "تسجيل الدفعة"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Receivables List */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold mb-6" data-testid="text-receivables-list-title">قائمة المستحقات</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-400">جاري تحميل المستحقات...</p>
            </div>
          ) : receivables && Array.isArray(receivables) && receivables.length > 0 ? (
            <div className="grid gap-4">
              {receivables.map((receivable: any, index: number) => {
                const statusInfo = getStatusInfo(receivable.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <GlassCard 
                    key={receivable.id} 
                    className="p-6"
                    data-testid={`card-receivable-${index}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`px-3 py-1 rounded-full ${statusInfo.bgColor} border ${statusInfo.borderColor} flex items-center gap-2`}>
                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                            <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                          </div>
                          <p className="text-sm text-gray-400">
                            {new Date(receivable.createdAt).toLocaleDateString('ar-IQ')}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-400">العميل</p>
                            <p className="text-sm font-semibold">{getCustomerName(receivable.customerId)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">المبلغ الكامل</p>
                            <p className="text-lg font-bold text-blue-400">{receivable.totalAmount} د.ع</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">المدفوع</p>
                            <p className="text-lg font-bold text-green-400">{receivable.paidAmount} د.ع</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">المتبقي</p>
                            <p className="text-lg font-bold text-orange-400">{receivable.remainingAmount} د.ع</p>
                          </div>
                        </div>
                        
                        {receivable.description && (
                          <p className="text-sm text-gray-300" data-testid={`text-receivable-description-${index}`}>
                            {receivable.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 mr-4">
                        {receivable.status !== 'paid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-400 text-green-400 hover:bg-green-400/10"
                            onClick={() => handleAddPayment(receivable)}
                            data-testid={`button-add-payment-${index}`}
                          >
                            <Plus className="w-4 h-4 ml-1" />
                            إضافة دفعة
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-400 text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDelete(receivable.id)}
                          disabled={deleteReceivableMutation.isPending}
                          data-testid={`button-delete-receivable-${index}`}
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p data-testid="text-no-receivables">لا توجد مستحقات مسجلة بعد</p>
              <p className="text-sm mt-2">سيتم إضافة المستحقات تلقائياً عند تسجيل عربون</p>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}
