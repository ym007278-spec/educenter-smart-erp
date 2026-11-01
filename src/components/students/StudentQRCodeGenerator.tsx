import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  User,
  Users,
  Search,
  CheckCircle2,
  Copy,
  RefreshCw,
  Sparkles,
  Building2,
  FileCheck,
  Eye,
  EyeOff,
  Filter,
  Check,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Award,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  deriveStudentSecretKey,
  generateStudentEncryptedQr,
  verifyQrPayload,
  DEFAULT_HMAC_SECRET,
  QrVerificationResult
} from '../../lib/qr-security';

export interface StudentProfile {
  id: string;
  studentCode: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  stageName: string;
  groupName: string;
  billingType: 'PER_SESSION' | 'MONTHLY';
  chargeAmount: number;
  avatarColor: string;
}

export const ENROLLED_STUDENTS: StudentProfile[] = [
  {
    id: 'stu-01',
    studentCode: 'ST-2026-0012',
    fullName: 'أحمد محمود رضوان',
    phone: '01012345678',
    parentPhone: '01099887766',
    stageName: 'الصف الثالث الثانوي',
    groupName: 'أوائل الفيزياء العامة',
    billingType: 'MONTHLY',
    chargeAmount: 350,
    avatarColor: 'from-blue-600 to-cyan-500'
  },
  {
    id: 'stu-02',
    studentCode: 'ST-2026-0045',
    fullName: 'مريم طارق الشريف',
    phone: '01198765432',
    parentPhone: '01122334455',
    stageName: 'الصف الثالث الثانوي',
    groupName: 'مراجعات الفيزياء المكثفة (بالحصة)',
    billingType: 'PER_SESSION',
    chargeAmount: 60,
    avatarColor: 'from-purple-600 to-pink-500'
  },
  {
    id: 'stu-03',
    studentCode: 'ST-2026-0089',
    fullName: 'يوسف حسام الدين العوضي',
    phone: '01234567891',
    parentPhone: '01255667788',
    stageName: 'الصف الثالث الثانوي',
    groupName: 'كيمياء عضوية متقدمة',
    billingType: 'MONTHLY',
    chargeAmount: 350,
    avatarColor: 'from-emerald-600 to-teal-500'
  },
  {
    id: 'stu-04',
    studentCode: 'ST-2026-0104',
    fullName: 'نور الهدى إبراهيم',
    phone: '01511223344',
    parentPhone: '01566778899',
    stageName: 'الصف الثاني الثانوي',
    groupName: 'لغة إنجليزية - قواعد متقدمة',
    billingType: 'PER_SESSION',
    chargeAmount: 50,
    avatarColor: 'from-amber-600 to-orange-500'
  },
  {
    id: 'stu-05',
    studentCode: 'ST-2026-0142',
    fullName: 'عمر خالد الصاوي',
    phone: '01044556677',
    parentPhone: '01088990011',
    stageName: 'الصف الثالث الثانوي',
    groupName: 'رياضيات بحتة وتفاضل',
    billingType: 'MONTHLY',
    chargeAmount: 380,
    avatarColor: 'from-rose-600 to-red-500'
  }
];

export default function StudentQRCodeGenerator() {
  const [students, setStudents] = useState<StudentProfile[]>(ENROLLED_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile>(ENROLLED_STUDENTS[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Custom salt/key state
  const [customSalt, setCustomSalt] = useState<string>('educenter_std_salt_2026');
  const [studentSecretKey, setStudentSecretKey] = useState<string>('');
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  // QR generation state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  // Verification test simulator
  const [testResult, setTestResult] = useState<QrVerificationResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  // Card element ref for printing/downloading
  const cardRef = useRef<HTMLDivElement>(null);

  // Compute unique secret key and generate QR whenever selected student or salt changes
  useEffect(() => {
    let isCancelled = false;

    const generateKeysAndQR = async () => {
      setIsGenerating(true);
      try {
        // 1. Derive unique cryptographically strong secret key per student
        const derivedKey = await deriveStudentSecretKey(
          selectedStudent.id,
          selectedStudent.studentCode,
          DEFAULT_HMAC_SECRET,
          customSalt
        );

        if (isCancelled) return;
        setStudentSecretKey(derivedKey);

        // 2. Generate signed/encrypted payload using student's unique secret
        const { payload } = await generateStudentEncryptedQr(
          selectedStudent.id,
          selectedStudent.studentCode,
          derivedKey
        );

        if (isCancelled) return;
        setQrPayload(payload);

        // 3. Render high-res QR Data URL (Error correction Level H for durability)
        const url = await QRCode.toDataURL(payload, {
          width: 512,
          margin: 1,
          color: {
            dark: '#0f172a', // Deep slate for sharp contrast
            light: '#ffffff'
          },
          errorCorrectionLevel: 'H'
        });

        if (isCancelled) return;
        setQrDataUrl(url);
        setTestResult(null); // Reset test on student change
      } catch (err) {
        console.error('Error generating QR:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    };

    generateKeysAndQR();

    return () => {
      isCancelled = true;
    };
  }, [selectedStudent, customSalt]);

  // Copy Secret Key to Clipboard
  const handleCopyKey = () => {
    if (!studentSecretKey) return;
    navigator.clipboard.writeText(studentSecretKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Test Verification Simulator
  const handleTestVerification = async () => {
    if (!qrPayload || !studentSecretKey) return;
    setIsTesting(true);
    try {
      const result = await verifyQrPayload(qrPayload, { secret: studentSecretKey });
      setTestResult(result);
    } catch {
      setTestResult({
        isValid: false,
        error: 'فشل فحص التوقيع الرقمي'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Download QR as PNG Image
  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${selectedStudent.studentCode}-${selectedStudent.fullName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Complete ID Card Badge as PDF using jsPDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54] // Standard CR80 ID Card dimensions (Credit Card size)
      });

      // Background Navy
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 85.6, 54, 'F');

      // Top Header Stripe
      doc.setFillColor(6, 182, 212); // cyan-500
      doc.rect(0, 0, 85.6, 6, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text('EDUCENTER SMART ERP - STUDENT ID CARD', 42.8, 4.2, { align: 'center' });

      // Add QR Code Image
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 50, 10, 30, 30);
      }

      // Student Details (Text in English / Latin + Arabic code)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(selectedStudent.fullName, 6, 15);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Code: ${selectedStudent.studentCode}`, 6, 21);
      doc.text(`Stage: ${selectedStudent.stageName}`, 6, 26);
      doc.text(`Group: ${selectedStudent.groupName}`, 6, 31);
      doc.text(`Parent: ${selectedStudent.parentPhone}`, 6, 36);

      // Bottom Security Footer
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 46, 85.6, 8, 'F');

      doc.setFontSize(5);
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.text('SECURED WITH UNIQUE HMAC-SHA256 ENCRYPTION', 42.8, 51, { align: 'center' });

      doc.save(`ID-Card-${selectedStudent.studentCode}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  // Direct Print
  const handlePrint = () => {
    window.print();
  };

  // Filtered Students List
  const filteredStudents = students.filter(s =>
    s.fullName.includes(searchQuery) ||
    s.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.groupName.includes(searchQuery)
  );

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-3.5 py-1 rounded-full">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>مُولِّد كروت الـ QR المشفرة بمفتاح فريد لكل طالب</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              توليد وطباعة بطاقات حضور الطلاب (StudentQRCodeGenerator)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              توليد باركود QR فريد ومؤمن لكل طالب مشتق من مفتاح تشفير خاص به (<code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono">Unique Student Secret Key</code>) 
              لمنع التزوير تماماً، مع إمكانية تصدير وطباعة بطاقات الهوية المعتمدة (CR80 ID Card) بصيغتي PNG و PDF.
            </p>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-950/80 border border-slate-800 p-2.5 rounded-2xl">
            <button
              onClick={handleDownloadPNG}
              disabled={!qrDataUrl}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>تحميل PNG</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={!qrDataUrl}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              <span>تصدير PDF كارت</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="طباعة البطاقة مباشرة"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Student Selector on Left, Card Designer & Security Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Student Selector & Directory (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>قائمة الطلاب المقيدين ({students.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">اختر طالباً للتوليد</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو كود الطالب..."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 rounded-xl pr-9 pl-3 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Students List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 pr-1">
              {filteredStudents.map((std) => {
                const isSelected = selectedStudent.id === std.id;
                return (
                  <div
                    key={std.id}
                    onClick={() => setSelectedStudent(std)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-200 shadow'
                        : 'bg-slate-950/60 hover:bg-slate-950 border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${std.avatarColor} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow`}>
                        {std.fullName.charAt(0)}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-white block leading-snug">{std.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{std.studentCode} • {std.stageName}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Salt & Key Derivation Control */}
          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>ملح التشفير الخاص بالسنتر (Custom Salt):</span>
              </span>
            </div>
            <input
              type="text"
              value={customSalt}
              onChange={(e) => setCustomSalt(e.target.value)}
              placeholder="educenter_std_salt_2026"
              className="w-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-slate-500 block leading-tight">
              يضمن اشتقاق مفاتيح تشفير فريدة وغير قابلة للتنبؤ لكل طالب على حدة.
            </span>
          </div>
        </div>

        {/* Right Column: ID Card Preview, QR Code, and Cryptographic Secret Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Printable Student ID Card Badge Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>معاينة كارت الطالب المعتمد (Student ID Card Badge Preview)</span>
              </span>
              <span className="text-[10px] bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-full font-mono">
                Standard CR80 Size (85.6mm × 54mm)
              </span>
            </div>

            {/* The Badge Container */}
            <div className="flex justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden">
              <div
                ref={cardRef}
                className="w-full max-w-md aspect-[1.586/1] bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between text-white select-none"
              >
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                
                {/* Card Top Stripe */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-slate-950 shadow">
                      <Building2 className="w-4 h-4 font-bold" />
                    </div>
                    <div>
                      <span className="text-xs font-black tracking-tight block leading-none">EduCenter Smart ERP</span>
                      <span className="text-[9px] text-cyan-400 font-semibold block mt-0.5">كارت الحضور الذكي المعتمد</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                      VERIFIED BADGE
                    </span>
                  </div>
                </div>

                {/* Card Middle: Student Info on Right, QR on Left */}
                <div className="grid grid-cols-12 gap-3 items-center py-2 relative z-10">
                  
                  {/* Student Details (7 cols) */}
                  <div className="col-span-7 space-y-1.5 text-right">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400">اسم الطالب:</span>
                      <h3 className="text-sm font-black text-white">{selectedStudent.fullName}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">كود الطالب:</span>
                        <span className="font-mono font-bold text-cyan-300">{selectedStudent.studentCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">المرحلة:</span>
                        <span className="font-semibold text-slate-200 truncate block">{selectedStudent.stageName}</span>
                      </div>
                    </div>

                    <div className="text-[10px]">
                      <span className="text-slate-400 block text-[9px]">المجموعة:</span>
                      <span className="text-slate-300 truncate block">{selectedStudent.groupName}</span>
                    </div>
                  </div>

                  {/* QR Code Canvas Frame (5 cols) */}
                  <div className="col-span-5 flex flex-col items-center justify-center">
                    <div className="p-2 bg-white rounded-2xl shadow-lg border-2 border-cyan-400/50 relative group">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR Code for ${selectedStudent.fullName}`}
                          className="w-24 h-24 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                          <QrCode className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 mt-1">امسح الكود لتسجيل الحضور</span>
                  </div>

                </div>

                {/* Card Footer: Security Watermark */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] relative z-10 text-slate-400">
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    <span>HMAC-SHA256 ENCRYPTED</span>
                  </span>
                  <span className="font-mono text-slate-500">ID: {selectedStudent.id}</span>
                </div>
              </div>
            </div>

            {/* Quick Export Actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                يمكن طباعة هذا الكارت وتغليفه بكارنيه بلاستيكي للطالب لمسحه عند بوابة السنتر.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>تنزيل كصورة</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>تنزيل PDF للمطبعة</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cryptographic Key Panel & Anti-Spoofing Payload */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">مفتاح التشفير الفريد للطالب (Unique Secret Key)</h4>
                  <span className="text-[10px] text-slate-400">خوارزمية HMAC-SHA256 بطول 256 بت مستخرجة للطالب حصراً</span>
                </div>
              </div>

              <button
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showSecretKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}</span>
              </button>
            </div>

            {/* Secret Key Display Box */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="font-mono text-xs overflow-x-auto select-all scrollbar-none flex-1">
                {showSecretKey ? (
                  <span className="text-cyan-300 break-all">{studentSecretKey}</span>
                ) : (
                  <span className="text-slate-500 tracking-widest">
                    {studentSecretKey.substring(0, 12)}••••••••••••••••••••••••••••••••••••••••••••••••••••{studentSecretKey.slice(-8)}
                  </span>
                )}
              </div>

              <button
                onClick={handleCopyKey}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                title="نسخ مفتاح التشفير"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'تم النسخ!' : 'نسخ المفتاح'}</span>
              </button>
            </div>

            {/* Encrypted Raw Payload Breakdown */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400">حزمة البيانات المشفرة داخل الـ QR (Raw QR Payload):</span>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-purple-300 break-all select-all">
                {qrPayload || 'جاري التوليد...'}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                <span>الصيغة: <code className="text-slate-400 font-mono">student_id:student_code:hmac_signature</code></span>
                <span>•</span>
                <span>المطابقة: معتمدة مع خادم FastAPI وتريجرز PostgreSQL</span>
              </div>
            </div>

            {/* Test Verification Simulator */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>اختبار صحة الكارت والتوقيع الرقمي فورياً:</span>
              </div>

              <button
                onClick={handleTestVerification}
                disabled={isTesting}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'جاري الفحص...' : 'فحص ومصادقة الكارت الآن'}
              </button>
            </div>

            {/* Test Result Toast */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-in fade-in ${
                  testResult.isValid
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>
                    {testResult.isValid
                      ? `تمت مصادقة كارت الطالب (${selectedStudent.fullName}) بنجاح! التوقيع الرقمي مطابق 100% ومستخرج بمفتاحه السري.`
                      : testResult.error}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {testResult.isValid ? 'HMAC VALID ✓' : 'HMAC INVALID ✗'}
                </span>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
