import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
  }
}

interface ReportData {
  period: string;
  type: string;
  generatedAt: string;
  generatedBy: string;
  income?: any[];
  expenses?: any[];
  customers?: any[];
  employees?: any[];
  printIncome?: any[];
  totalIncome?: number;
  totalExpenses?: number;
  netProfit?: number;
  totalCustomers?: number;
  totalEmployees?: number;
  totalSalaries?: number;
  totalPrintIncome?: number;
  expiredCustomers?: any[];
  activeCustomers?: any[];
  expiringSoon?: any[];
  summary?: any;
}

export function generatePDFReport(reportData: ReportData) {
  // Create new PDF document with RTL support
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Set Arabic font (this is a simplified approach - in production you'd use proper Arabic fonts)
  doc.setFont('courier', 'normal');
  
  let yPosition = 20;
  const margin = 20;
  const lineHeight = 8;

  // Helper function to add text with word wrapping
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const maxWidth = options.maxWidth || (pageWidth - 2 * margin);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    if (y + (lines.length * lineHeight) > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    
    doc.text(lines, x, y, { align: options.align || 'right', ...options });
    return y + (lines.length * lineHeight) + (options.spacing || 5);
  };

  // Helper function to add section header
  const addSectionHeader = (title: string, y: number) => {
    doc.setFontSize(14);
    doc.setFont('courier', 'bold');
    const newY = addText(title, pageWidth - margin, y, { align: 'right', spacing: 10 });
    doc.setFontSize(10);
    doc.setFont('courier', 'normal');
    return newY;
  };

  // Report Header
  doc.setFontSize(18);
  doc.setFont('courier', 'bold');
  yPosition = addText('IQR Control - نظام إدارة الأعمال', pageWidth - margin, yPosition, { align: 'right' });
  
  doc.setFontSize(16);
  const reportTypeNames = {
    financial: 'التقرير المالي',
    customers: 'تقرير العملاء',
    employees: 'تقرير الموظفين',
    prints: 'تقرير المطبوعات',
    comprehensive: 'التقرير الشامل'
  };
  
  yPosition = addText(reportTypeNames[reportData.type as keyof typeof reportTypeNames] || 'تقرير', pageWidth - margin, yPosition, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setFont('courier', 'normal');
  yPosition = addText(`فترة التقرير: ${reportData.period}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition = addText(`تاريخ الإنشاء: ${new Date(reportData.generatedAt).toLocaleDateString('ar-IQ')}`, pageWidth - margin, yPosition, { align: 'right' });
  
  // Add separator line
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Financial Section
  if (reportData.income || reportData.expenses) {
    yPosition = addSectionHeader('الملخص المالي', yPosition);
    
    if (reportData.totalIncome !== undefined) {
      yPosition = addText(`إجمالي الدخل: ${reportData.totalIncome.toLocaleString()} د.ع`, pageWidth - margin, yPosition);
    }
    if (reportData.totalExpenses !== undefined) {
      yPosition = addText(`إجمالي المصروفات: ${reportData.totalExpenses.toLocaleString()} د.ع`, pageWidth - margin, yPosition);
    }
    if (reportData.netProfit !== undefined) {
      const profitText = `صافي الربح: ${reportData.netProfit.toLocaleString()} د.ع`;
      yPosition = addText(profitText, pageWidth - margin, yPosition);
    }
    
    yPosition += 10;

    // Income Details
    if (reportData.income && reportData.income.length > 0) {
      yPosition = addSectionHeader('تفاصيل الدخل', yPosition);
      
      // Create income table
      const incomeRows = reportData.income.map((item: any) => [
        new Date(item.date).toLocaleDateString('ar-IQ'),
        item.type === 'subscription' ? 'اشتراك' : item.type === 'prints' ? 'مطبوعات' : 'أخرى',
        `${Number(item.amount).toLocaleString()} د.ع`,
        item.description || '-'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['التاريخ', 'النوع', 'المبلغ', 'الوصف']],
        body: incomeRows,
        styles: {
          fontSize: 8,
          font: 'courier',
          textColor: [0, 0, 0],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        theme: 'grid'
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Expenses Details
    if (reportData.expenses && reportData.expenses.length > 0) {
      yPosition = addSectionHeader('تفاصيل المصروفات', yPosition);
      
      const expenseRows = reportData.expenses.map((item: any) => [
        new Date(item.date).toLocaleDateString('ar-IQ'),
        `${Number(item.amount).toLocaleString()} د.ع`,
        item.reason || '-'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['التاريخ', 'المبلغ', 'السبب']],
        body: expenseRows,
        styles: {
          fontSize: 8,
          font: 'courier',
          textColor: [0, 0, 0],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        theme: 'grid'
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Customers Section
  if (reportData.customers) {
    yPosition = addSectionHeader('ملخص العملاء', yPosition);
    
    yPosition = addText(`إجمالي العملاء: ${reportData.totalCustomers}`, pageWidth - margin, yPosition);
    if (reportData.activeCustomers) {
      yPosition = addText(`العملاء النشطون: ${reportData.activeCustomers.length}`, pageWidth - margin, yPosition);
    }
    if (reportData.expiredCustomers) {
      yPosition = addText(`الاشتراكات المنتهية: ${reportData.expiredCustomers.length}`, pageWidth - margin, yPosition);
    }
    if (reportData.expiringSoon) {
      yPosition = addText(`الاشتراكات المنتهية قريباً: ${reportData.expiringSoon.length}`, pageWidth - margin, yPosition);
    }
    
    yPosition += 10;

    if (reportData.customers.length > 0) {
      const customerRows = reportData.customers.map((customer: any) => [
        customer.name,
        customer.subscriptionType === 'annual' ? 'سنوي' : customer.subscriptionType === 'semi-annual' ? 'نصف سنوي' : 'ربع سنوي',
        new Date(customer.joinDate).toLocaleDateString('ar-IQ'),
        new Date(customer.expiryDate).toLocaleDateString('ar-IQ'),
        customer.isActive ? 'نشط' : 'غير نشط'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['اسم العميل', 'نوع الاشتراك', 'تاريخ الانضمام', 'تاريخ الانتهاء', 'الحالة']],
        body: customerRows,
        styles: {
          fontSize: 8,
          font: 'courier',
          textColor: [0, 0, 0],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        theme: 'grid'
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Employees Section
  if (reportData.employees) {
    yPosition = addSectionHeader('ملخص الموظفين', yPosition);
    
    yPosition = addText(`إجمالي الموظفين: ${reportData.totalEmployees}`, pageWidth - margin, yPosition);
    if (reportData.totalSalaries !== undefined) {
      yPosition = addText(`إجمالي الرواتب: ${reportData.totalSalaries.toLocaleString()} د.ع`, pageWidth - margin, yPosition);
    }
    
    yPosition += 10;

    if (reportData.employees.length > 0) {
      const employeeRows = reportData.employees.map((employee: any) => [
        employee.name,
        employee.position || '-',
        `${Number(employee.salary || 0).toLocaleString()} د.ع`,
        new Date(employee.hireDate).toLocaleDateString('ar-IQ')
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['اسم الموظف', 'المنصب', 'الراتب', 'تاريخ التوظيف']],
        body: employeeRows,
        styles: {
          fontSize: 8,
          font: 'courier',
          textColor: [0, 0, 0],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        theme: 'grid'
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Print Income Section
  if (reportData.printIncome) {
    yPosition = addSectionHeader('تقرير المطبوعات', yPosition);
    
    if (reportData.totalPrintIncome !== undefined) {
      yPosition = addText(`إجمالي دخل المطبوعات: ${reportData.totalPrintIncome.toLocaleString()} د.ع`, pageWidth - margin, yPosition);
    }
    
    yPosition += 10;

    if (reportData.printIncome.length > 0) {
      const printRows = reportData.printIncome.map((item: any) => [
        new Date(item.date).toLocaleDateString('ar-IQ'),
        `${Number(item.amount).toLocaleString()} د.ع`,
        item.description || '-'
      ]);

      doc.autoTable({
        startY: yPosition,
        head: [['التاريخ', 'المبلغ', 'الوصف']],
        body: printRows,
        styles: {
          fontSize: 8,
          font: 'courier',
          textColor: [0, 0, 0],
          cellPadding: 2
        },
        headStyles: {
          fillColor: [100, 100, 100],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        theme: 'grid'
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`صفحة ${i} من ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`تم الإنشاء بواسطة ${reportData.generatedBy}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  // Generate filename
  const reportTypeName = reportTypeNames[reportData.type as keyof typeof reportTypeNames] || 'تقرير';
  const filename = `${reportTypeName}_${reportData.period.replace(/\s/g, '_')}.pdf`;

  // Save the PDF
  doc.save(filename);
}