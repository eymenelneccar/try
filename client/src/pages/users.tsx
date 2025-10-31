import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { ArrowRight, Plus, UserCog, Trash2, Edit } from "lucide-react";
import { Header } from "@/components/layout/header";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertManualUserSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Users() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(insertManualUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "viewer" as "viewer" | "editor" | "admin",
    },
  });

  const editForm = useForm({
    defaultValues: {
      username: "",
      password: "",
      role: "viewer" as "viewer" | "editor" | "admin",
    },
  });

  const { data: users, isLoading, error: usersError } = useQuery({
    queryKey: ["/api/users"]
  });

  if (usersError && isUnauthorizedError(usersError as Error)) {
    toast({
      title: "غير مصرح",
      description: "جاري إعادة تسجيل الدخول...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const addUserMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء المستخدم بنجاح",
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
        description: "فشل في إنشاء المستخدم",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
      toast({
        title: "تم بنجاح",
        description: "تم تحديث المستخدم بنجاح",
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
        description: "فشل في تحديث المستخدم",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح",
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
        description: "فشل في حذف المستخدم",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    addUserMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    if (!editingUser) return;
    const updateData: any = { 
      username: data.username, 
      role: data.role 
    };
    if (data.password && data.password.trim() !== '') {
      updateData.password = data.password;
    }
    updateUserMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      password: "",
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    const confirmDelete = window.confirm("⚠️ هل أنت متأكد من حذف هذا المستخدم؟\n\nهذا الإجراء لا يمكن التراجع عنه.");
    
    if (confirmDelete) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'مدير';
      case 'editor': return 'محرر';
      case 'viewer': return 'مشاهد';
      default: return role;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/20 text-purple-300';
      case 'editor': return 'bg-blue-500/20 text-blue-300';
      case 'viewer': return 'bg-gray-500/20 text-gray-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      <Header />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4 space-x-reverse">
            <Link href="/">
              <Button variant="ghost" className="hover:bg-white/10" data-testid="button-back">
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold" data-testid="text-page-title">إدارة المستخدمين</h2>
              <p className="text-gray-300" data-testid="text-page-subtitle">إضافة وتعديل وحذف المستخدمين</p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-purple" data-testid="button-add-user">
                <Plus className="h-5 w-5 ml-2" />
                إضافة مستخدم جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700" data-testid="dialog-add-user">
              <DialogHeader>
                <DialogTitle className="text-white text-right" data-testid="text-dialog-title">إضافة مستخدم جديد</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">اسم المستخدم</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-slate-800 border-slate-700 text-white" data-testid="input-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">كلمة المرور</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" className="bg-slate-800 border-slate-700 text-white" data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">الصلاحية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-role">
                              <SelectValue placeholder="اختر الصلاحية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="viewer" data-testid="option-viewer">مشاهد</SelectItem>
                            <SelectItem value="editor" data-testid="option-editor">محرر</SelectItem>
                            <SelectItem value="admin" data-testid="option-admin">مدير</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full gradient-purple" 
                    disabled={addUserMutation.isPending}
                    data-testid="button-submit-add"
                  >
                    {addUserMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="bg-slate-900 border-slate-700" data-testid="dialog-edit-user">
              <DialogHeader>
                <DialogTitle className="text-white text-right" data-testid="text-dialog-edit-title">تعديل المستخدم</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">اسم المستخدم</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-slate-800 border-slate-700 text-white" data-testid="input-edit-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">كلمة المرور (اتركها فارغة إذا لم ترد تغييرها)</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" className="bg-slate-800 border-slate-700 text-white" placeholder="كلمة مرور جديدة (اختياري)" data-testid="input-edit-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">الصلاحية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-edit-role">
                              <SelectValue placeholder="اختر الصلاحية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="viewer" data-testid="option-edit-viewer">مشاهد</SelectItem>
                            <SelectItem value="editor" data-testid="option-edit-editor">محرر</SelectItem>
                            <SelectItem value="admin" data-testid="option-edit-admin">مدير</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full gradient-purple" 
                    disabled={updateUserMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateUserMutation.isPending ? "جاري التحديث..." : "تحديث"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <GlassCard className="overflow-hidden" data-testid="card-users-list">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300" data-testid="header-username">اسم المستخدم</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300" data-testid="header-role">الصلاحية</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300" data-testid="header-created">تاريخ الإنشاء</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300" data-testid="header-actions">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400" data-testid="text-loading">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : users && users.length > 0 ? (
                  users.map((user: any) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors" data-testid={`row-user-${user.id}`}>
                      <td className="px-6 py-4 text-white" data-testid={`text-username-${user.id}`}>{user.username}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm ${getRoleBadgeClass(user.role)}`} data-testid={`badge-role-${user.id}`}>
                          {getRoleText(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300" data-testid={`text-created-${user.id}`}>
                        {new Date(user.createdAt).toLocaleDateString('ar-IQ')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2 space-x-reverse">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="hover:bg-blue-500/20 text-blue-300"
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="hover:bg-red-500/20 text-red-300"
                            data-testid={`button-delete-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400" data-testid="text-no-users">
                      لا يوجد مستخدمين بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
