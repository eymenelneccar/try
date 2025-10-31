import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { ArrowRight, MessageSquare, Send } from "lucide-react";
import { Header } from "@/components/layout/header";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertFeedbackSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { z } from "zod";

const feedbackFormSchema = insertFeedbackSchema.omit({ userId: true });

export default function Feedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      type: "complaint" as "complaint" | "suggestion",
      subject: "",
      message: "",
    },
  });

  const { data: userFeedback, isLoading, error: feedbackError } = useQuery({
    queryKey: ["/api/feedback/my"]
  });

  if (feedbackError && isUnauthorizedError(feedbackError as Error)) {
    toast({
      title: "غير مصرح",
      description: "جاري إعادة تسجيل الدخول...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const createFeedbackMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/my"] });
      form.reset();
      toast({
        title: "تم الإرسال بنجاح",
        description: "تم إرسال ملاحظتك بنجاح وسيتم مراجعتها قريباً",
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
        description: "فشل في إرسال الملاحظة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createFeedbackMutation.mutate(data);
  };

  const getTypeText = (type: string) => {
    return type === 'complaint' ? 'شكوى' : 'اقتراح';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد المراجعة';
      case 'reviewed': return 'تمت المراجعة';
      case 'resolved': return 'تم الحل';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300';
      case 'reviewed': return 'bg-blue-500/20 text-blue-300';
      case 'resolved': return 'bg-green-500/20 text-green-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    return type === 'complaint' ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300';
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center mb-8 space-x-4 space-x-reverse">
          <Link href="/">
            <Button variant="ghost" className="hover:bg-white/10" data-testid="button-back">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold" data-testid="text-page-title">الشكاوى والاقتراحات</h2>
            <p className="text-gray-300" data-testid="text-page-subtitle">إرسال الشكاوى والاقتراحات للإدارة</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feedback Form */}
          <GlassCard className="p-6" data-testid="card-feedback-form">
            <div className="flex items-center space-x-3 space-x-reverse mb-6">
              <div className="p-3 rounded-xl gradient-pink">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold" data-testid="text-form-title">إرسال ملاحظة جديدة</h3>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">النوع</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-type">
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="complaint" data-testid="option-complaint">شكوى</SelectItem>
                          <SelectItem value="suggestion" data-testid="option-suggestion">اقتراح</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">الموضوع</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-slate-800 border-slate-700 text-white" placeholder="موضوع الملاحظة" data-testid="input-subject" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">الرسالة</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          className="bg-slate-800 border-slate-700 text-white min-h-[150px]" 
                          placeholder="اكتب ملاحظتك هنا..." 
                          data-testid="textarea-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full gradient-pink" 
                  disabled={createFeedbackMutation.isPending}
                  data-testid="button-submit-feedback"
                >
                  {createFeedbackMutation.isPending ? "جاري الإرسال..." : "إرسال"}
                  <Send className="h-4 w-4 mr-2" />
                </Button>
              </form>
            </Form>
          </GlassCard>

          {/* Previous Feedback */}
          <GlassCard className="p-6" data-testid="card-previous-feedback">
            <h3 className="text-xl font-bold mb-6" data-testid="text-previous-title">ملاحظاتي السابقة</h3>
            
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400" data-testid="text-loading">
                  جاري التحميل...
                </div>
              ) : userFeedback && userFeedback.length > 0 ? (
                userFeedback.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    data-testid={`item-feedback-${item.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs ${getTypeBadgeClass(item.type)}`} data-testid={`badge-type-${item.id}`}>
                          {getTypeText(item.type)}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs ${getStatusBadgeClass(item.status)}`} data-testid={`badge-status-${item.id}`}>
                          {getStatusText(item.status)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400" data-testid={`text-date-${item.id}`}>
                        {new Date(item.createdAt).toLocaleDateString('ar-IQ')}
                      </span>
                    </div>
                    <h4 className="font-semibold text-white mb-2" data-testid={`text-subject-${item.id}`}>{item.subject}</h4>
                    <p className="text-sm text-gray-300" data-testid={`text-message-${item.id}`}>{item.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400" data-testid="text-no-feedback">
                  لم تقم بإرسال أي ملاحظات بعد
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
