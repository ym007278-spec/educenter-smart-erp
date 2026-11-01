import React, { useState } from 'react';
import {
  Users,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Download,
  Printer,
  Plus,
  ArrowRight,
  TrendingDown,
  Building2,
  ShieldAlert,
  Search,
  Filter,
  Check,
  X,
  FileText,
  BadgeAlert,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export interface StaffMember {
  id: string;
  employeeCode: string;
  name: string;
  jobTitle: string;
  department: 'ADMIN' | 'RECEPTION' | 'SECURITY' | 'MAINTENANCE' | 'STUDENT_AFFAIRS';
  phone: string;
  baseSalary: number;
  expectedShiftStart: string; // e.g., "08:00"
  expectedShiftEnd: string;   // e.g., "16:00"
  latePenaltyPerMinute: number; // e.g. 2 EGP per minute
  accumulatedLateMinutes: number;
  bonusAmount: number;
  penaltiesAmount: number;
  status: 'PRESENT' | 'NOT_CLOCKED' | 'LEFT';
  lastClockIn?: string;
  lastClockOut?: string;
  payrollStatus: 'PENDING' | 'PAID';
  lastDisbursedAt?: string;
  disbursementReceiptId?: string;
}

export interface AttendanceClockLog {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  lateMinutes: number;
  penaltyApplied: number;
  note: string;
}

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'emp-01',
    employeeCode: 'EMP-2026-001',
    name: 'أحمد سعيد عبد الفتاح',
    jobTitle: 'مشرف أمن وبوابات السنتر',
    department: 'SECURITY',
    phone: '01011223344',
    baseSalary: 4500,
    expectedShiftStart: '08:00',
    expectedShiftEnd: '16:00',
    latePenaltyPerMinute: 2,
    accumulatedLateMinutes: 42,
    bonusAmount: 200,
    penaltiesAmount: 0,
    status: 'PRESENT',
    lastClockIn: '08:42',
    payrollStatus: 'PENDING'
  },
  {
    id: 'emp-02',
    employeeCode: 'EMP-2026-002',
    name: 'نور الهدى إبراهيم',
    jobTitle: 'مسؤولة الاستقبال والتحصيل',
    department: 'RECEPTION',
    phone: '01122334455',
    baseSalary: 5500,
    expectedShiftStart: '08:00',
    expectedShiftEnd: '16:00',
    latePenaltyPerMinute: 3,
    accumulatedLateMinutes: 15,
    bonusAmount: 350,
    penaltiesAmount: 0,
    status: 'PRESENT',
    lastClockIn: '08:15',
    payrollStatus: 'PENDING'
  },
  {
    id: 'emp-03',
    employeeCode: 'EMP-2026-003',
    name: 'محمد عبد الرحيم حمزة',
    jobTitle: 'أخصائي شؤون الطلاب وقيد الشعب',
    department: 'STUDENT_AFFAIRS',
    phone: '01233445566',
    baseSalary: 6000,
    expectedShiftStart: '08:00',
    expectedShiftEnd: '16:00',
    latePenaltyPerMinute: 3,
    accumulatedLateMinutes: 85,
    bonusAmount: 0,
    penaltiesAmount: 150,
    status: 'NOT_CLOCKED',
    payrollStatus: 'PENDING'
  },
  {
    id: 'emp-04',
    employeeCode: 'EMP-2026-004',
    name: 'حسني سليمان رضوان',
    jobTitle: 'فني صيانة ودعم فني وتشغيل',
    department: 'MAINTENANCE',
    phone: '01544556677',
    baseSalary: 4800,
    expectedShiftStart: '08:00',
    expectedShiftEnd: '16:00',
    latePenaltyPerMinute: 2,
    accumulatedLateMinutes: 0,
    bonusAmount: 300,
    penaltiesAmount: 0,
    status: 'PRESENT',
    lastClockIn: '07:55',
    payrollStatus: 'PAID',
    lastDisbursedAt: '2026-10-30 14:10',
    disbursementReceiptId: 'PAY-2026-10-004'
  }
];

export default function PayrollManagement() {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember>(INITIAL_STAFF[0]);
  const [treasuryBalance, setTreasuryBalance] = useState<number>(47500); // central treasury snapshot
  const [searchQuery, setSearchQuery] = useState('');
  
  // Disbursement Modal State
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [isProcessingDisbursement, setIsProcessingDisbursement] = useState(false);
  const [disbursementSuccessMessage, setDisbursementSuccessMessage] = useState<string | null>(null);

  // Manual Punch Clock In Modal
  const [isClockInModalOpen, setIsClockInModalOpen] = useState(false);
  const [clockInTimeInput, setClockInTimeInput] = useState<string>('08:35');

  // Adjustment Modal (Add Penalty / Bonus)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'BONUS' | 'PENALTY'>('BONUS');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(100);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');

  // Calculate Net Salary for a staff member
  const calculateNetSalary = (emp: StaffMember) => {
    const lateDeduction = emp.accumulatedLateMinutes * emp.latePenaltyPerMinute;
    return Math.max(0, emp.baseSalary + emp.bonusAmount - lateDeduction - emp.penaltiesAmount);
  };

  const filteredStaff = staffList.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle Punch Clock In
  const handlePunchClockIn = (e: React.FormEvent) => {
    e.preventDefault();
    const [inHours, inMinutes] = clockInTimeInput.split(':').map(Number);
    const [targetHours, targetMinutes] = selectedStaff.expectedShiftStart.split(':').map(Number);

    const actualTotalMinutes = inHours * 60 + inMinutes;
    const targetTotalMinutes = targetHours * 60 + targetMinutes;

    const diffMinutes = Math.max(0, actualTotalMinutes - targetTotalMinutes);

    const updated = staffList.map(emp => {
      if (emp.id === selectedStaff.id) {
        return {
          ...emp,
          status: 'PRESENT' as const,
          lastClockIn: clockInTimeInput,
          accumulatedLateMinutes: emp.accumulatedLateMinutes + diffMinutes
        };
      }
      return emp;
    });

    setStaffList(updated);
    const updatedSelected = updated.find(e => e.id === selectedStaff.id)!;
    setSelectedStaff(updatedSelected);
    setIsClockInModalOpen(false);
  };

  // Handle Adjustment (Bonus or Penalty)
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustmentAmount <= 0) return;

    const updated = staffList.map(emp => {
      if (emp.id === selectedStaff.id) {
        if (adjustmentType === 'BONUS') {
          return { ...emp, bonusAmount: emp.bonusAmount + adjustmentAmount };
        } else {
          return { ...emp, penaltiesAmount: emp.penaltiesAmount + adjustmentAmount };
        }
      }
      return emp;
    });

    setStaffList(updated);
    const updatedSelected = updated.find(e => e.id === selectedStaff.id)!;
    setSelectedStaff(updatedSelected);
    setIsAdjustmentModalOpen(false);
    setAdjustmentAmount(100);
    setAdjustmentReason('');
  };

  // Atomic Salary Disbursement from Central Treasury
  const handleDisburseSalary = () => {
    const netSalary = calculateNetSalary(selectedStaff);

    // Hardened Solvency Check (Zero Deficit)
    if (netSalary > treasuryBalance) {
      alert('خطأ أمني: رصيد الخزنة المركزية الحالي غير كافٍ لتغطية صافي هذا الراتب!');
      return;
    }

    setIsProcessingDisbursement(true);

    setTimeout(() => {
      const receiptId = `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      const nowStr = new Date().toLocaleString('ar-EG');

      // Update Treasury
      setTreasuryBalance(prev => prev - netSalary);

      // Update Employee record
      const updated = staffList.map(emp => {
        if (emp.id === selectedStaff.id) {
          return {
            ...emp,
            payrollStatus: 'PAID' as const,
            lastDisbursedAt: nowStr,
            disbursementReceiptId: receiptId
          };
        }
        return emp;
      });

      setStaffList(updated);
      const updatedSelected = updated.find(e => e.id === selectedStaff.id)!;
      setSelectedStaff(updatedSelected);

      setIsProcessingDisbursement(false);
      setIsDisburseModalOpen(false);
      setDisbursementSuccessMessage(`تم صرف مرتب ${selectedStaff.name} بقيمة ${netSalary} ج.م وخصمها من الخزنة أوتوماتيكياً برقم سند ${receiptId}.`);

      // Generate PDF Salary Voucher
      handlePrintSalaryVoucher(updatedSelected, netSalary, receiptId, nowStr);
    }, 1000);
  };

  // Generate Printable PDF Salary Voucher
  const handlePrintSalaryVoucher = (emp: StaffMember, net: number, receiptId: string, timestamp: string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('EduCenter Smart ERP - Salary Payment Voucher', 20, 20);
    doc.setFontSize(12);
    doc.text(`Voucher Ref: ${receiptId}`, 20, 32);
    doc.text(`Disbursement Time: ${timestamp}`, 20, 40);
    doc.text(`Beneficiary: ${emp.name} (${emp.employeeCode})`, 20, 48);
    doc.text(`Job Role: ${emp.jobTitle} - ${emp.department}`, 20, 56);

    doc.text('------------------------------------------------------------', 20, 66);
    doc.text(`Base Gross Salary: ${emp.baseSalary} EGP`, 20, 76);
    doc.text(`Bonuses & Allowances: +${emp.bonusAmount} EGP`, 20, 84);
    doc.text(`Late Delay Penalty (${emp.accumulatedLateMinutes} mins @ ${emp.latePenaltyPerMinute} EGP/min): -${emp.accumulatedLateMinutes * emp.latePenaltyPerMinute} EGP`, 20, 92);
    doc.text(`Administrative Penalties: -${emp.penaltiesAmount} EGP`, 20, 100);
    doc.text('------------------------------------------------------------', 20, 110);
    doc.text(`NET DISBURSED CASH AMOUNT: ${net} EGP`, 20, 120);
    doc.text('------------------------------------------------------------', 20, 130);
    doc.text('Treasury Account: Central Treasury (Cash Out)', 20, 140);
    doc.text('Authorized Finance Officer Signature: ___________________', 20, 155);
    doc.text('Employee Confirmation Signature: _______________________', 20, 170);

    doc.save(`Salary-Voucher-${receiptId}.pdf`);
  };

  const selectedNetSalary = calculateNetSalary(selectedStaff);
  const selectedLateDeduction = selectedStaff.accumulatedLateMinutes * selectedStaff.latePenaltyPerMinute;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">إدارة شؤون الموظفين والرواتب والجزاءات</h2>
                <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  أوتوميشن الخصومات والخزنة
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                تسجيل حضور الموظفين بالدقيقة • حساب التأخيرات والجزاءات آلياً • صرف الرواتب وخصمها من الخزنة مع سندات رسمية
              </p>
            </div>
          </div>

          {/* Central Treasury Solvency Indicator */}
          <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">رصيد الخزنة المتاح للصرف:</span>
              <span className="text-sm font-mono font-bold text-emerald-400">{treasuryBalance.toLocaleString('ar-EG')} ج.م</span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {disbursementSuccessMessage && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{disbursementSuccessMessage}</span>
            </div>
            <button onClick={() => setDisbursementSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Staff Directory (Right 4 cols) & Payroll Workspace (Left 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Staff Directory Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            
            {/* Search Box */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث عن موظف بالاسم أو الوظيفة..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Staff List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredStaff.map(emp => {
                const isSelected = selectedStaff.id === emp.id;
                const net = calculateNetSalary(emp);

                return (
                  <div
                    key={emp.id}
                    onClick={() => {
                      setSelectedStaff(emp);
                      setDisbursementSuccessMessage(null);
                    }}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/70 to-slate-800/80 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{emp.name}</span>
                          <span className="text-[10px] font-mono bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded">
                            {emp.employeeCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{emp.jobTitle}</p>
                        
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {emp.status === 'PRESENT' ? `حاضر (${emp.lastClockIn})` : 'لم يسجل دخول'}
                          </span>
                        </div>
                      </div>

                      <div className="text-left flex flex-col items-end shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            emp.payrollStatus === 'PAID'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {emp.payrollStatus === 'PAID' ? 'تم الصرف' : 'مستحق الصرف'}
                        </span>

                        <span className="text-xs font-mono font-bold text-emerald-400 mt-2">
                          {net.toLocaleString('ar-EG')} ج.م
                        </span>
                        <span className="text-[10px] text-slate-500">صافي المستحق</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Selected Staff Member Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Employee Profile Header & Shift Punch Clock */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {selectedStaff.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedStaff.name}</h3>
                    <span className="text-xs font-mono bg-slate-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-900/50">
                      {selectedStaff.employeeCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    الوظيفة: <strong className="text-slate-200">{selectedStaff.jobTitle}</strong> • الوردية المقررة: <code className="text-cyan-300 font-mono">{selectedStaff.expectedShiftStart} ص</code> حتى <code className="text-cyan-300 font-mono">{selectedStaff.expectedShiftEnd} م</code>
                  </p>
                </div>
              </div>

              {/* Action Buttons: Punch Clock & Adjustments */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsClockInModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تسجيل بصمة الدخول</span>
                </button>

                <button
                  onClick={() => setIsAdjustmentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>مكافأة / جزاء</span>
                </button>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">الراتب الأساسي:</span>
                <span className="text-base font-bold font-mono text-white">{selectedStaff.baseSalary.toLocaleString('ar-EG')} ج.م</span>
                <span className="text-[10px] text-slate-500 block">شهرياً</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">دقائق التأخير المسجلة:</span>
                <span className="text-base font-bold font-mono text-amber-400">{selectedStaff.accumulatedLateMinutes} دقيقة</span>
                <span className="text-[10px] text-rose-400 block">خصم: {selectedLateDeduction} ج.م</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">المكافآت المعتمدة:</span>
                <span className="text-base font-bold font-mono text-emerald-400">+{selectedStaff.bonusAmount} ج.م</span>
                <span className="text-[10px] text-slate-500 block">حوافز إضافية</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">الجزاءات الإدارية:</span>
                <span className="text-base font-bold font-mono text-rose-400">-{selectedStaff.penaltiesAmount} ج.م</span>
                <span className="text-[10px] text-slate-500 block">خصم مباشر</span>
              </div>
            </div>

            {/* Net Salary Calculation Banner */}
            <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-slate-950 via-cyan-950/20 to-slate-950 border border-cyan-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">صافي الراتب المستحق للصرف هذا الشهر:</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-emerald-400">
                    {selectedNetSalary.toLocaleString('ar-EG')} ج.م
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({selectedStaff.baseSalary} + {selectedStaff.bonusAmount} - {selectedLateDeduction} - {selectedStaff.penaltiesAmount})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedStaff.payrollStatus === 'PAID' ? (
                  <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تم الصرف ({selectedStaff.lastDisbursedAt})</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDisburseModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <DollarSign className="w-4 h-4 stroke-[3]" />
                    <span>اعتماد وصرف الراتب من الخزنة</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Operational Policy & Automation Rules */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>قواعد الأوتوميشن الصارمة لحضور الموظفين والرواتب</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                <span className="font-bold text-white block">1. احتساب التأخير بالدقيقة:</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  يبدأ احتساب التأخير فور تجاوز موعد بداية الوردية المقررة (08:00 ص) بمعدل دقيقة بدقيقة، ويتم تطبيق معادلة الخصم آلياً بنظام PostgreSQL Function <code className="text-cyan-400 font-mono">fn_calc_staff_late_minutes</code>.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                <span className="font-bold text-white block">2. الخصم الآلي والسيولة:</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  عند الضغط على صرف الراتب، يُفحص رصيد الخزنة المركزية لحظياً (ACID Check) لمنع حدوث أي عجز، ثم تُخصم القيمة فوراً وتسجل في سجل Cash Out مع توليد سند صرف رسمي موقع.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Clock In Modal */}
      {isClockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsClockInModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">تسجيل بصمة الدخول للموظف</h3>
                <p className="text-xs text-slate-400">توثيق دقيق بالدقيقة لحساب التأخيرات آلياً</p>
              </div>
            </div>

            <form onSubmit={handlePunchClockIn} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400">اسم الموظف:</span>
                  <span className="font-bold text-white">{selectedStaff.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">الموعد المقرر:</span>
                  <span className="font-mono text-cyan-400 font-bold">{selectedStaff.expectedShiftStart} صباحاً</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">وقت تسجيل الدخول الفعلي (بالدقيقة):</label>
                <input
                  type="time"
                  value={clockInTimeInput}
                  onChange={e => setClockInTimeInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClockInModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow"
                >
                  اعتماد وقت البصمة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment (Bonus / Penalty) Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-white mb-4">إضافة مكافأة أو جزاء للموظف</h3>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">نوع المعاملة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('BONUS')}
                    className={`p-2 rounded-lg font-bold border transition-all ${
                      adjustmentType === 'BONUS'
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    + مكافأة تميز وحافز
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustmentType('PENALTY')}
                    className={`p-2 rounded-lg font-bold border transition-all ${
                      adjustmentType === 'PENALTY'
                        ? 'bg-rose-600/30 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    - جزاء إداري
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">المبلغ (ج.م):</label>
                <input
                  type="number"
                  min="1"
                  value={adjustmentAmount}
                  onChange={e => setAdjustmentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">سبب المعاملة والبيان:</label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="مثال: التزام استثنائي في تنظيم امتحانات الشهادة الثانوية"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow"
                >
                  إضافة المعاملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Disbursement Confirmation Modal */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsDisburseModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">تأكيد صرف الراتب من الخزنة المركزية</h3>
                <p className="text-xs text-slate-400">سند صرف رسمي وتحديث لحظي لرصيد الخزنة</p>
              </div>
            </div>

            {/* Breakdown summary */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-xs mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">المستفيد:</span>
                <span className="font-bold text-white">{selectedStaff.name} ({selectedStaff.jobTitle})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">الراتب الأساسي:</span>
                <span className="font-mono text-white">{selectedStaff.baseSalary} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>المكافآت والحوافز:</span>
                <span className="font-mono">+{selectedStaff.bonusAmount} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-amber-400">
                <span>خصم التأخيرات ({selectedStaff.accumulatedLateMinutes} دقيقة):</span>
                <span className="font-mono">-{selectedLateDeduction} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-rose-400">
                <span>الجزاءات الإدارية:</span>
                <span className="font-mono">-{selectedStaff.penaltiesAmount} ج.م</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-bold text-sm">
                <span className="text-white">صافي المبلغ المخصوم من الخزنة:</span>
                <span className="font-mono text-emerald-400">{selectedNetSalary.toLocaleString('ar-EG')} ج.م</span>
              </div>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-800/40 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>سيتم توليد سند صرف راتب (PDF) جاهز للطباعة وتوقيع المستفيد فور تأكيد العملية.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessingDisbursement}
                onClick={handleDisburseSalary}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isProcessingDisbursement ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>جاري تسجيل السند والخصم من الخزنة...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>تأكيد الصرف وتوليد السند PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
