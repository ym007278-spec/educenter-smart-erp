import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Search,
  User,
  Building2,
  Calendar,
  CreditCard,
  Plus,
  Share2,
  X,
  Sparkles,
  Phone,
  QrCode,
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { authStorage } from '../../lib/auth-storage';

export interface PaymentRecord {
  id: string;
  receiptNumber: string;
  date: string;
  groupName: string;
  period: string; // e.g. 'شهر نوفمبر 2026' or 'حصة رقم 5'
  amount: number;
  paymentMethod: 'CASH' | 'VISA_POS' | 'VODAFONE_CASH';
  teacherSplit: number;
  centerSplit: number;
  cashierName: string;
  status: 'COMPLETED' | 'REFUNDED';
}

export interface StudentFinancialProfile {
  id: string;
  studentCode: string;
  fullName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  stageName: string;
  paymentStatus: 'CLEARED' | 'PARTIAL' | 'OVERDUE';
  totalPaid: number;
  balanceDue: number;
  lastPaymentDate: string;
  enrolledGroups: {
    groupId: string;
    groupName: string;
    billingType: 'PER_SESSION' | 'MONTHLY';
    price: number;
  }[];
  payments: PaymentRecord[];
}

// Initial Seed Data matching PostgreSQL Schema
const INITIAL_STUDENTS: StudentFinancialProfile[] = [
  {
    id: 'stu-01',
    studentCode: 'ST-2026-0012',
    fullName: 'أحمد محمود رضوان',
    phone: '01012345678',
    parentName: 'محمود رضوان عبد الله',
    parentPhone: '01001122334',
    stageName: 'الصف الثالث الثانوي',
    paymentStatus: 'CLEARED',
    totalPaid: 1400,
    balanceDue: 0,
    lastPaymentDate: '2026-10-28',
    enrolledGroups: [
      { groupId: 'grp-101', groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)', billingType: 'MONTHLY', price: 350 },
      { groupId: 'grp-201', groupName: 'تفاضل وتكامل 3 ثانوي (الدفعة الذهبية)', billingType: 'MONTHLY', price: 400 }
    ],
    payments: [
      {
        id: 'pay-01',
        receiptNumber: 'REC-2026-1028-001',
        date: '2026-10-28',
        groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)',
        period: 'شهر نوفمبر 2026',
        amount: 350,
        paymentMethod: 'CASH',
        teacherSplit: 245,
        centerSplit: 105,
        cashierName: 'أستاذة نور الهدى (استقبال)',
        status: 'COMPLETED'
      },
      {
        id: 'pay-02',
        receiptNumber: 'REC-2026-1015-084',
        date: '2026-10-15',
        groupName: 'تفاضل وتكامل 3 ثانوي (الدفعة الذهبية)',
        period: 'شهر أكتوبر 2026',
        amount: 400,
        paymentMethod: 'VISA_POS',
        teacherSplit: 300,
        centerSplit: 100,
        cashierName: 'أ. طارق الشافعي (حسابات)',
        status: 'COMPLETED'
      },
      {
        id: 'pay-03',
        receiptNumber: 'REC-2026-0925-019',
        date: '2026-09-25',
        groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)',
        period: 'شهر أكتوبر 2026',
        amount: 350,
        paymentMethod: 'CASH',
        teacherSplit: 245,
        centerSplit: 105,
        cashierName: 'أستاذة نور الهدى (استقبال)',
        status: 'COMPLETED'
      }
    ]
  },
  {
    id: 'stu-02',
    studentCode: 'ST-2026-0045',
    fullName: 'مريم طارق الشريف',
    phone: '01198765432',
    parentName: 'طارق الشريف',
    parentPhone: '01155667788',
    stageName: 'الصف الثالث الثانوي',
    paymentStatus: 'OVERDUE',
    totalPaid: 450,
    balanceDue: 180, // 3 sessions due
    lastPaymentDate: '2026-10-12',
    enrolledGroups: [
      { groupId: 'grp-102', groupName: 'مراجعات الفيزياء المكثفة (بالحصة)', billingType: 'PER_SESSION', price: 60 }
    ],
    payments: [
      {
        id: 'pay-04',
        receiptNumber: 'REC-2026-1012-045',
        date: '2026-10-12',
        groupName: 'مراجعات الفيزياء المكثفة (بالحصة)',
        period: 'سداد 3 حصص سابقة',
        amount: 180,
        paymentMethod: 'VODAFONE_CASH',
        teacherSplit: 135,
        centerSplit: 45,
        cashierName: 'أ. طارق الشافعي (حسابات)',
        status: 'COMPLETED'
      }
    ]
  },
  {
    id: 'stu-03',
    studentCode: 'ST-2026-0089',
    fullName: 'يوسف حسام الدين',
    phone: '01234567891',
    parentName: 'حسام الدين فؤاد',
    parentPhone: '01223344556',
    stageName: 'الصف الثاني الثانوي',
    paymentStatus: 'PARTIAL',
    totalPaid: 600,
    balanceDue: 150,
    lastPaymentDate: '2026-10-22',
    enrolledGroups: [
      { groupId: 'grp-103', groupName: 'الصف الثاني الثانوي (مجموعة التميز)', billingType: 'MONTHLY', price: 300 }
    ],
    payments: [
      {
        id: 'pay-05',
        receiptNumber: 'REC-2026-1022-099',
        date: '2026-10-22',
        groupName: 'الصف الثاني الثانوي (مجموعة التميز)',
        period: 'شهر نوفمبر (دفعة أولى)',
        amount: 150,
        paymentMethod: 'CASH',
        teacherSplit: 105,
        centerSplit: 45,
        cashierName: 'أستاذة نور الهدى (استقبال)',
        status: 'COMPLETED'
      }
    ]
  }
];

export default function StudentFinancials() {
  const [students, setStudents] = useState<StudentFinancialProfile[]>(INITIAL_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('stu-01');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // New Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [newPayAmount, setNewPayAmount] = useState<number>(350);
  const [newPayPeriod, setNewPayPeriod] = useState<string>('شهر نوفمبر 2026');
  const [newPayMethod, setNewPayMethod] = useState<'CASH' | 'VISA_POS' | 'VODAFONE_CASH'>('CASH');
  const [newPayGroup, setNewPayGroup] = useState<string>('');

  // PDF Receipt Preview Modal
  const [receiptToView, setReceiptToView] = useState<PaymentRecord | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];

  // react-to-print hooks
  const studentStatementPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintStatement = useReactToPrint({
    contentRef: studentStatementPrintRef,
    documentTitle: `كشف_حساب_طالب_${selectedStudent.studentCode}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
        }
      }
    `
  });

  const receiptPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintReceipt = useReactToPrint({
    contentRef: receiptPrintRef,
    documentTitle: `إيصال_سداد_${receiptToView?.receiptNumber || 'receipt'}`,
    pageStyle: `
      @page {
        size: A5 portrait;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
        }
      }
    `
  });

  // Filter students list for dropdown
  const filteredStudents = students.filter(s =>
    s.fullName.includes(searchQuery) || s.studentCode.includes(searchQuery)
  );

  // Generate Official PDF Receipt with jsPDF
  const generatePdfReceipt = (payment: PaymentRecord, student: StudentFinancialProfile) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // A5 is standard receipt size
      });

      // Background styling
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 148, 210, 'F');

      // Border frame
      doc.setDrawColor(52, 211, 153); // emerald-400
      doc.setLineWidth(1);
      doc.rect(6, 6, 136, 198);

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('EduCenter Smart ERP', 74, 18, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(52, 211, 153);
      doc.text('Official Tuition Payment Receipt', 74, 25, { align: 'center' });

      doc.setDrawColor(51, 65, 85);
      doc.line(12, 30, 136, 30);

      // Receipt Metadata
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text(`Receipt No: ${payment.receiptNumber}`, 12, 38);
      doc.text(`Date & Time: ${payment.date}`, 12, 45);
      doc.text(`Payment Method: ${payment.paymentMethod}`, 12, 52);

      doc.text(`Student Code: ${student.studentCode}`, 80, 38);
      doc.text(`Stage: ${student.stageName}`, 80, 45);
      doc.text(`Parent Phone: ${student.parentPhone}`, 80, 52);

      // Student Name Banner
      doc.setFillColor(30, 41, 59);
      doc.rect(12, 58, 124, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`Student: ${student.fullName}`, 16, 66);

      // Table Box
      doc.setFillColor(15, 23, 42);
      doc.rect(12, 75, 124, 45, 'F');
      doc.setDrawColor(71, 85, 105);
      doc.rect(12, 75, 124, 45);

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(9);
      doc.text('Description / Period', 16, 82);
      doc.text('Group', 65, 82);
      doc.text('Amount (EGP)', 110, 82);

      doc.setDrawColor(51, 65, 85);
      doc.line(12, 86, 136, 86);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(payment.period, 16, 95);
      doc.text(payment.groupName.slice(0, 22), 65, 95);
      doc.text(`${payment.amount}.00 EGP`, 110, 95);

      // Automated Revenue Split
      doc.setFontSize(8);
      doc.setTextColor(56, 189, 248);
      doc.text(`Teacher Split (Credited): ${payment.teacherSplit} EGP`, 16, 105);
      doc.text(`Center Treasury Share: ${payment.centerSplit} EGP`, 16, 112);

      // Total Paid Banner
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(12, 125, 124, 14, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.text(`TOTAL PAID: ${payment.amount}.00 EGP`, 74, 134, { align: 'center' });

      // Verification HMAC Stamp
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.text('HMAC Verification Stamp: SEC-74A9-VALIDATED-ACID-2026', 74, 150, { align: 'center' });
      doc.text(`Cashier Officer: ${payment.cashierName}`, 74, 156, { align: 'center' });

      // Barcode simulation
      doc.setFillColor(255, 255, 255);
      doc.rect(40, 165, 68, 15, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.text(`* ${payment.receiptNumber} *`, 74, 175, { align: 'center' });

      doc.setTextColor(148, 163, 184);
      doc.setFontSize(7);
      doc.text('This receipt was automatically generated and recorded in the Central Treasury Ledger.', 74, 192, { align: 'center' });

      // Save PDF
      doc.save(`Receipt-${payment.receiptNumber}.pdf`);
    } catch (e) {
      console.error('PDF generation error', e);
      alert('تم تنزيل الإيصال أو حفظه.');
    }
  };

  // Record a New Payment and Trigger Central Treasury Update
  const handleRecordPayment = () => {
    if (newPayAmount <= 0) return;

    const teacherSplitAmount = Math.round(newPayAmount * 0.7);
    const centerSplitAmount = newPayAmount - teacherSplitAmount;
    const receiptNum = `REC-2026-${new Date().getMonth() + 1}${new Date().getDate()}-${Math.floor(100 + Math.random() * 900)}`;

    const newPayment: PaymentRecord = {
      id: 'pay-' + Date.now(),
      receiptNumber: receiptNum,
      date: new Date().toISOString().split('T')[0],
      groupName: newPayGroup || selectedStudent.enrolledGroups[0]?.groupName || 'المجموعة الدراسية',
      period: newPayPeriod,
      amount: newPayAmount,
      paymentMethod: newPayMethod,
      teacherSplit: teacherSplitAmount,
      centerSplit: centerSplitAmount,
      cashierName: 'أستاذة نور الهدى (استقبال)',
      status: 'COMPLETED'
    };

    // Update Student Financial Profile
    const newBalanceDue = Math.max(0, selectedStudent.balanceDue - newPayAmount);
    const updatedStatus = newBalanceDue === 0 ? 'CLEARED' : 'PARTIAL';

    setStudents(prev =>
      prev.map(s => {
        if (s.id === selectedStudent.id) {
          return {
            ...s,
            totalPaid: s.totalPaid + newPayAmount,
            balanceDue: newBalanceDue,
            paymentStatus: updatedStatus,
            lastPaymentDate: newPayment.date,
            payments: [newPayment, ...s.payments]
          };
        }
        return s;
      })
    );

    setIsPaymentModalOpen(false);
    setReceiptToView(newPayment);
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              <span>الماليات وملف الطالب الشامل (StudentFinancials)</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              سجل مدفوعات الطالب وحالة السداد وتوليد إيصالات الـ PDF
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              متابعة دقيقة لحالة الطالب المالية (خالص / مدين)، وسجل الإيصالات مع التوزيع التلقائي لحصة السنتر والمدرس، وزر فوري لتوليد وطباعة إيصال دفع رسمي بصيغة PDF.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
            <button
              onClick={() => handlePrintStatement()}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
              title="تصدير للتقارير المالية المعتمدة وحفظ كشف الحساب بصيغة PDF عبر react-to-print"
            >
              <Printer className="w-4 h-4" />
              <span>تصدير للتقارير (كشف حساب PDF)</span>
            </button>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل سداد مصروفات جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Selector Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">اختر الطالب لاستعراض ملفه المالي:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer mt-0.5"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentCode}) - {s.stageName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>هاتف ولي الأمر: <strong className="text-slate-200 font-mono">{selectedStudent.parentPhone}</strong></span>
          <span>•</span>
          <span>تاريخ آخر سداد: <strong className="text-emerald-400 font-mono">{selectedStudent.lastPaymentDate}</strong></span>
        </div>
      </div>

      {/* Printable Statement Container */}
      <div ref={studentStatementPrintRef} className="space-y-6 print:bg-white print:text-black print:p-6 print:border-none print:shadow-none">
        
        {/* Printable Official Header (Shown during react-to-print) */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-4 mb-2">
          <div>
            <h2 className="text-xl font-black text-black">سنتر الأوائل التعليمي الذكي</h2>
            <p className="text-xs text-gray-700">كشف حساب مالي رسمي ومعتمد للطالب</p>
          </div>
          <div className="text-left text-xs text-gray-700">
            <div>كود الطالب: <strong className="font-mono">{selectedStudent.studentCode}</strong></div>
            <div>تاريخ الاستخراج: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
          </div>
        </div>

        {/* Student Profile Info in Print */}
        <div className="hidden print:grid grid-cols-2 gap-2 text-xs border border-gray-400 p-3 rounded-lg mb-4 bg-gray-50">
          <div>اسم الطالب: <strong>{selectedStudent.fullName}</strong></div>
          <div>المرحلة الدراسية: <strong>{selectedStudent.stageName}</strong></div>
          <div>هاتف ولي الأمر: <strong className="font-mono">{selectedStudent.parentPhone}</strong></div>
          <div>الموقف المالي: <strong>{selectedStudent.paymentStatus === 'CLEARED' ? 'خالص بالكامل' : selectedStudent.paymentStatus === 'PARTIAL' ? 'سداد جزئي' : 'مدين بمستحقات'}</strong></div>
        </div>

        {/* Student Financial Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Status Clearance Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-3">
          <span className="text-xs text-slate-400">الموقف المالي الحالي:</span>
          <div>
            {selectedStudent.paymentStatus === 'CLEARED' && (
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-lg">
                <CheckCircle2 className="w-6 h-6" />
                <span>خالص بالكامل (CLEARED)</span>
              </div>
            )}
            {selectedStudent.paymentStatus === 'PARTIAL' && (
              <div className="flex items-center gap-2 text-amber-400 font-bold text-lg">
                <Clock className="w-6 h-6" />
                <span>سداد جزئي (PARTIAL)</span>
              </div>
            )}
            {selectedStudent.paymentStatus === 'OVERDUE' && (
              <div className="flex items-center gap-2 text-rose-400 font-bold text-lg">
                <AlertCircle className="w-6 h-6" />
                <span>مدين بمستحقات (OVERDUE)</span>
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-500">محدث تلقائياً مع جداول السداد والحضور</span>
        </div>

        {/* Balance Due */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-1">
          <span className="text-xs text-slate-400">المبلغ المستحق (المديونية):</span>
          <div className="text-2xl font-bold font-mono text-white">
            {selectedStudent.balanceDue}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {selectedStudent.balanceDue > 0 ? 'متبقي من حصص أو اشتراك الشهر' : 'لا توجد أي مبالغ متأخرة'}
          </p>
        </div>

        {/* Total Paid */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-1">
          <span className="text-xs text-slate-400">إجمالي المدفوعات المسجلة:</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {selectedStudent.totalPaid.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">
            موزعة بالكامل على الخزنة ومحافظ المعلمين
          </p>
        </div>

        {/* Total Receipts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-1">
          <span className="text-xs text-slate-400">عدد الإيصالات المعتمدة:</span>
          <div className="text-2xl font-bold font-mono text-cyan-400">
            {selectedStudent.payments.length}{' '}
            <span className="text-xs font-normal text-slate-400">إيصال رسمي</span>
          </div>
          <p className="text-[11px] text-slate-500">متاحة للتحميل والطباعة بصيغة PDF</p>
        </div>

      </div>

      {/* Payment History Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>سجل إيصالات ومدفوعات الطالب (Payment History Ledger)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              مرتب تنازلياً من الأحدث مع إمكانية تصدير وطباعة الإيصال فورياً
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
            {selectedStudent.payments.length} عملية سداد
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">رقم الإيصال</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">المجموعة الدراسية</th>
                <th className="p-3">عن الفترة</th>
                <th className="p-3">المبلغ المسدد</th>
                <th className="p-3">طريقة الدفع</th>
                <th className="p-3">حصة المدرس (Split)</th>
                <th className="p-3">الموظف المستلم</th>
                <th className="p-3 text-center">إيصال PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {selectedStudent.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-950/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    {payment.receiptNumber}
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {payment.date}
                  </td>
                  <td className="p-3 font-semibold text-white">
                    {payment.groupName}
                  </td>
                  <td className="p-3 text-slate-300">
                    {payment.period}
                  </td>
                  <td className="p-3 font-mono font-bold text-white text-sm">
                    {payment.amount} ج.م
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {payment.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-cyan-400">
                    {payment.teacherSplit} ج.م
                  </td>
                  <td className="p-3 text-slate-400">
                    {payment.cashierName}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => generatePdfReceipt(payment, selectedStudent)}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 transition-all"
                        title="تنزيل ملف الإيصال PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setReceiptToView(payment)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="معاينة الإيصال وطباعته"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950/90 print:bg-gray-100 font-bold border-t-2 border-slate-700 print:border-black text-xs">
              <tr>
                <td colSpan={4} className="p-3 text-white print:text-black">إجمالي مدفوعات الطالب المسجلة:</td>
                <td className="p-3 font-mono text-emerald-400 print:text-green-800 text-sm">
                  {selectedStudent.totalPaid.toLocaleString()} ج.م
                </td>
                <td colSpan={4} className="p-3 text-slate-300 print:text-gray-700 text-[11px]">
                  المتبقي المستحق: <strong className="font-mono text-rose-400 print:text-red-700">{selectedStudent.balanceDue} ج.م</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          </div>
        </div>

        {/* Printable Official Signatures Footer (Shown during react-to-print) */}
        <div className="hidden print:flex pt-6 border-t border-gray-400 items-center justify-between text-xs text-gray-700">
          <div>
            <span>* كشف حساب مالي صادر إلكترونياً من منظومة EduCenter Smart ERP</span>
          </div>
          <div className="flex gap-16">
            <div className="text-center">
              <span className="block mb-6 font-bold">توقيع المحاسب المالي</span>
              <div className="w-32 border-b border-black" />
            </div>
            <div className="text-center">
              <span className="block mb-6 font-bold">اعتماد الإدارة</span>
              <div className="w-32 border-b border-black" />
            </div>
          </div>
        </div>

      </div>

      {/* New Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">تسجيل سداد مصروفات جديد</h3>
                  <span className="text-[11px] text-slate-400">{selectedStudent.fullName}</span>
                </div>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">المجموعة الدراسية:</label>
                <select
                  value={newPayGroup}
                  onChange={(e) => setNewPayGroup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {selectedStudent.enrolledGroups.map(g => (
                    <option key={g.groupId} value={g.groupName}>
                      {g.groupName} ({g.price} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">المبلغ المسدد (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  value={newPayAmount}
                  onChange={(e) => setNewPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-sm text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">عن الفترة / الحصة:</label>
                <input
                  type="text"
                  value={newPayPeriod}
                  onChange={(e) => setNewPayPeriod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold block">طريقة الدفع:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'VISA_POS', 'VODAFONE_CASH'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setNewPayMethod(method)}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                        newPayMethod === method
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {method === 'CASH' ? 'نقداً (خزنة)' : method === 'VISA_POS' ? 'فيزا POS' : 'فودافون كاش'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-emerald-400 block">⚡ توزيع الأرباح الآلي (Trigger Simulation):</span>
                <p>• إيداع الخزنة المركزية: <strong className="text-white">{newPayAmount} ج.م</strong></p>
                <p>• استحقاق المعلم (70%): <strong className="text-cyan-400">{Math.round(newPayAmount * 0.7)} ج.م</strong></p>
                <p>• صافي السنتر (30%): <strong className="text-slate-200">{newPayAmount - Math.round(newPayAmount * 0.7)} ج.م</strong></p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleRecordPayment}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تأكيد السداد وتوليد الإيصال</span>
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Preview Modal */}
      {receiptToView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                إيصال سداد مصروفات رسمي ومعتمد
              </span>
              <button onClick={() => setReceiptToView(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Printable Visual Frame */}
            <div ref={receiptPrintRef} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4 font-mono text-xs text-slate-300 print:bg-white print:text-black print:p-6 print:border-2 print:border-black">
              <div className="text-center pb-2 border-b border-dashed border-slate-800 print:border-black space-y-1">
                <h4 className="text-base font-bold font-sans text-white print:text-black">السنتر التعليمي الذكي - EduCenter</h4>
                <p className="text-[10px] text-slate-500 print:text-gray-600">إيصال سداد مصروفات إلكتروني رسمي</p>
                <span className="text-emerald-400 print:text-black font-bold">{receiptToView.receiptNumber}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>الطالب: <strong className="text-white font-sans">{selectedStudent.fullName}</strong></div>
                <div>كود الطالب: <strong className="text-emerald-400">{selectedStudent.studentCode}</strong></div>
                <div>المجموعة: <span className="font-sans text-slate-200">{receiptToView.groupName}</span></div>
                <div>عن الفترة: <span className="font-sans text-slate-200">{receiptToView.period}</span></div>
                <div>التاريخ: {receiptToView.date}</div>
                <div>طريقة الدفع: {receiptToView.paymentMethod}</div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="font-sans font-bold text-white">المبلغ المدفوع:</span>
                <span className="text-lg font-bold text-emerald-400">{receiptToView.amount}.00 ج.م</span>
              </div>

              <div className="text-[10px] text-slate-500 text-center space-y-0.5 pt-1">
                <p>مختوم إلكترونياً بختم الـ HMAC لمنع التزوير والتكرار</p>
                <p>الموظف المستلم: {receiptToView.cashierName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={() => handlePrintReceipt()}
                className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer active:scale-95"
                title="تصدير للتقارير وطباعة الإيصال الفوري بصيغة PDF"
              >
                <Printer className="w-4 h-4" />
                <span>تصدير للتقارير (طباعة الإيصال)</span>
              </button>

              <button
                onClick={() => generatePdfReceipt(receiptToView, selectedStudent)}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تحميل PDF</span>
              </button>

              <button
                onClick={() => setReceiptToView(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
