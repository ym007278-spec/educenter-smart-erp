import React, { useState } from 'react';
import {
  User,
  Search,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Award,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Phone,
  Download,
  Share2,
  TrendingUp,
  BookOpen,
  Filter,
  Check,
  X,
  Printer,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export interface ExamRecord {
  id: string;
  examName: string;
  subject: string;
  date: string;
  score: number;
  maxScore: number;
  gradeLabel: 'ممتاز' | 'جيد جداً' | 'جيد' | 'يحتاج تحسين';
  rankInGroup: string;
}

export interface AttendanceRecord {
  id: string;
  sessionDate: string;
  checkInTime: string; // Exact minute: e.g. "16:02"
  groupName: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  delayMinutes: number;
  verifiedBy: 'HMAC_QR_SCAN' | 'MANUAL_OVERRIDE';
  whatsappAlertSent: boolean;
  whatsappMessageId?: string;
}

export interface TeacherNote {
  id: string;
  teacherName: string;
  subject: string;
  date: string;
  noteText: string;
  category: 'ACADEMIC' | 'BEHAVIORAL' | 'ACHIEVEMENT';
}

export interface Student360Data {
  id: string;
  studentCode: string;
  fullName: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  stageName: string;
  nationalId: string;
  registrationDate: string;
  paymentStatus: 'CLEARED' | 'PARTIAL' | 'OVERDUE';
  totalPaid: number;
  balanceDue: number;
  attendanceRate: number; // percentage
  enrolledGroups: {
    groupId: string;
    groupName: string;
    teacherName: string;
    billingType: 'PER_SESSION' | 'MONTHLY';
    price: number;
  }[];
  exams: ExamRecord[];
  attendance: AttendanceRecord[];
  notes: TeacherNote[];
}

const INITIAL_STUDENTS_360: Student360Data[] = [
  {
    id: 'stu-01',
    studentCode: 'ST-2026-0012',
    fullName: 'أحمد محمود رضوان',
    phone: '01012345678',
    parentName: 'محمود رضوان عبد الله',
    parentPhone: '01001122334',
    stageName: 'الصف الثالث الثانوي (علمي علوم)',
    nationalId: '30509150102345',
    registrationDate: '2026-09-01',
    paymentStatus: 'CLEARED',
    totalPaid: 1400,
    balanceDue: 0,
    attendanceRate: 95,
    enrolledGroups: [
      {
        groupId: 'grp-101',
        groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)',
        teacherName: 'د. طارق شاكر',
        billingType: 'MONTHLY',
        price: 350
      },
      {
        groupId: 'grp-201',
        groupName: 'تفاضل وتكامل 3 ثانوي (الدفعة الذهبية)',
        teacherName: 'أ. حسام الباز',
        billingType: 'MONTHLY',
        price: 400
      }
    ],
    exams: [
      {
        id: 'ex-01',
        examName: 'اختبار الفيزياء الشامل (الكهربية والتيار المتردد)',
        subject: 'فيزياء',
        date: '2026-10-25',
        score: 48,
        maxScore: 50,
        gradeLabel: 'ممتاز',
        rankInGroup: 'الثاني على المجموعة (من 45 طالب)'
      },
      {
        id: 'ex-02',
        examName: 'كويز التفاضل (مشتقات الدوال المثلثية)',
        subject: 'رياضيات',
        date: '2026-10-18',
        score: 20,
        maxScore: 20,
        gradeLabel: 'ممتاز',
        rankInGroup: 'الأول مكرر'
      },
      {
        id: 'ex-03',
        examName: 'امتحان نصف الفصل الأول (الميكانيكا الحيوية)',
        subject: 'فيزياء',
        date: '2026-10-05',
        score: 44,
        maxScore: 50,
        gradeLabel: 'جيد جداً',
        rankInGroup: 'الخامس على المجموعة'
      }
    ],
    attendance: [
      {
        id: 'att-101',
        sessionDate: '2026-10-28',
        checkInTime: '16:02',
        groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)',
        status: 'PRESENT',
        delayMinutes: 0,
        verifiedBy: 'HMAC_QR_SCAN',
        whatsappAlertSent: false
      },
      {
        id: 'att-102',
        sessionDate: '2026-10-24',
        checkInTime: '18:14',
        groupName: 'تفاضل وتكامل 3 ثانوي (الدفعة الذهبية)',
        status: 'LATE',
        delayMinutes: 14,
        verifiedBy: 'HMAC_QR_SCAN',
        whatsappAlertSent: false
      },
      {
        id: 'att-103',
        sessionDate: '2026-10-21',
        checkInTime: '16:00',
        groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)',
        status: 'PRESENT',
        delayMinutes: 0,
        verifiedBy: 'HMAC_QR_SCAN',
        whatsappAlertSent: false
      },
      {
        id: 'att-104',
        sessionDate: '2026-10-14',
        checkInTime: '-',
        groupName: 'الصف الثالث الثانوي (أوائل الفيزياء)',
        status: 'ABSENT',
        delayMinutes: 0,
        verifiedBy: 'MANUAL_OVERRIDE',
        whatsappAlertSent: true,
        whatsappMessageId: 'wamid.HBgLMjAyNjEwMTQxNjAwMDA='
      }
    ],
    notes: [
      {
        id: 'note-01',
        teacherName: 'د. طارق شاكر (مدرس الفيزياء)',
        subject: 'فيزياء',
        date: '2026-10-26',
        noteText: 'أحمد من أنجب الطلاب تركيزاً وسرعة بديهة في التعامل مع دوائر كيرشوف المعقدة. استمر على هذا الأداء.',
        category: 'ACADEMIC'
      },
      {
        id: 'note-02',
        teacherName: 'أ. حسام الباز (مدرس الرياضيات)',
        subject: 'رياضيات',
        date: '2026-10-19',
        noteText: 'ملتزم بحل كافة الواجبات ومتميز في التفكير الإبداعي. أنصح فقط بمراجعة خطوات الحل بهدوء لتفادي السرعة.',
        category: 'ACHIEVEMENT'
      }
    ]
  },
  {
    id: 'stu-02',
    studentCode: 'ST-2026-0045',
    fullName: 'مريم شريف عبد العزيز',
    phone: '01123456789',
    parentName: 'شريف عبد العزيز المنياوي',
    parentPhone: '01199887766',
    stageName: 'الصف الأول الثانوي',
    nationalId: '30704110103456',
    registrationDate: '2026-09-10',
    paymentStatus: 'PARTIAL',
    totalPaid: 250,
    balanceDue: 250,
    attendanceRate: 88,
    enrolledGroups: [
      {
        groupId: 'grp-301',
        groupName: 'لغة إنجليزية 1 ثانوي (Grammar Master)',
        teacherName: 'أ. ريمون فايز',
        billingType: 'PER_SESSION',
        price: 70
      }
    ],
    exams: [
      {
        id: 'ex-201',
        examName: 'مراجعة الأزمنة المركبة (English Tenses)',
        subject: 'لغة إنجليزية',
        date: '2026-10-22',
        score: 38,
        maxScore: 40,
        gradeLabel: 'ممتاز',
        rankInGroup: 'الرابعة على المجموعة'
      }
    ],
    attendance: [
      {
        id: 'att-201',
        sessionDate: '2026-10-27',
        checkInTime: '14:31',
        groupName: 'لغة إنجليزية 1 ثانوي (Grammar Master)',
        status: 'PRESENT',
        delayMinutes: 1,
        verifiedBy: 'HMAC_QR_SCAN',
        whatsappAlertSent: false
      },
      {
        id: 'att-202',
        sessionDate: '2026-10-20',
        checkInTime: '-',
        groupName: 'لغة إنجليزية 1 ثانوي (Grammar Master)',
        status: 'ABSENT',
        delayMinutes: 0,
        verifiedBy: 'MANUAL_OVERRIDE',
        whatsappAlertSent: true,
        whatsappMessageId: 'wamid.HBgLMjAyNjEwMjAxNDMwMDA='
      }
    ],
    notes: [
      {
        id: 'note-201',
        teacherName: 'أ. ريمون فايز (معلم الإنجليزية)',
        subject: 'لغة إنجليزية',
        date: '2026-10-23',
        noteText: 'مريم متفوقة في مهارات الاستماع والكتابة، نرجو تسوية باقي مصروفات شهر أكتوبر.',
        category: 'ACADEMIC'
      }
    ]
  },
  {
    id: 'stu-03',
    studentCode: 'ST-2026-0089',
    fullName: 'عمر خالد الدسوقي',
    phone: '01234567890',
    parentName: 'خالد الدسوقي إبراهيم',
    parentPhone: '01223344556',
    stageName: 'الصف الثالث الإعدادي',
    nationalId: '30901220104567',
    registrationDate: '2026-09-15',
    paymentStatus: 'OVERDUE',
    totalPaid: 150,
    balanceDue: 450,
    attendanceRate: 75,
    enrolledGroups: [
      {
        groupId: 'grp-401',
        groupName: 'علوم 3 إعدادي (المتفوقين)',
        teacherName: 'أ. عماد حمدي',
        billingType: 'MONTHLY',
        price: 300
      }
    ],
    exams: [
      {
        id: 'ex-301',
        examName: 'اختبار الحركة في اتجاه واحد والسرعة المنتظمة',
        subject: 'علوم',
        date: '2026-10-12',
        score: 18,
        maxScore: 30,
        gradeLabel: 'جيد',
        rankInGroup: 'المركز 18'
      }
    ],
    attendance: [
      {
        id: 'att-301',
        sessionDate: '2026-10-26',
        checkInTime: '17:45',
        groupName: 'علوم 3 إعدادي (المتفوقين)',
        status: 'LATE',
        delayMinutes: 45,
        verifiedBy: 'HMAC_QR_SCAN',
        whatsappAlertSent: false
      },
      {
        id: 'att-302',
        sessionDate: '2026-10-19',
        checkInTime: '-',
        groupName: 'علوم 3 إعدادي (المتفوقين)',
        status: 'ABSENT',
        delayMinutes: 0,
        verifiedBy: 'MANUAL_OVERRIDE',
        whatsappAlertSent: true,
        whatsappMessageId: 'wamid.HBgLMjAyNjEwMTkxNzAwMDA='
      }
    ],
    notes: [
      {
        id: 'note-301',
        teacherName: 'أخصائي شؤون الطلاب',
        subject: 'إشراف أكاديمي',
        date: '2026-10-27',
        noteText: 'لوحظ تكرار التأخير والغياب، تم التواصل هاتفياً مع ولي الأمر للتنسيق.',
        category: 'BEHAVIORAL'
      }
    ]
  }
];

export default function Student360View() {
  const [students, setStudents] = useState<Student360Data[]>(INITIAL_STUDENTS_360);
  const [selectedStudent, setSelectedStudent] = useState<Student360Data>(INITIAL_STUDENTS_360[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FINANCIALS' | 'ATTENDANCE' | 'EXAMS' | 'NOTES'>('OVERVIEW');

  // WhatsApp Dispatch Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappSentSuccess, setWhatsappSentSuccess] = useState<boolean>(false);
  const [whatsappResponsePayload, setWhatsappResponsePayload] = useState<{
    messageId: string;
    timestamp: string;
    recipient: string;
    status: string;
  } | null>(null);

  // New Note Modal
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [newNoteData, setNewNoteData] = useState({
    teacherName: 'د. طارق شاكر (مدرس الفيزياء)',
    subject: 'فيزياء',
    noteText: '',
    category: 'ACADEMIC' as 'ACADEMIC' | 'BEHAVIORAL' | 'ACHIEVEMENT'
  });

  // Filter students by name, code, phone
  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.phone.includes(searchQuery) ||
    s.parentPhone.includes(searchQuery)
  );

  const handleSelectStudent = (student: Student360Data) => {
    setSelectedStudent(student);
    setWhatsappSentSuccess(false);
    setWhatsappResponsePayload(null);
  };

  // WhatsApp Message Composer Template
  const generateWhatsAppMessageTemplate = (student: Student360Data) => {
    const latestExam = student.exams[0];
    const examSnippet = latestExam
      ? `• آخر نتيجة: ${latestExam.score}/${latestExam.maxScore} في ${latestExam.examName} (${latestExam.gradeLabel})`
      : '• لا توجد اختبارات مسجلة مؤخراً';

    const financeSnippet = student.paymentStatus === 'CLEARED'
      ? '• المصروفات: مسدد بالكامل (لا توجد مستحقات مطلوبة) ✅'
      : `• المصروفات: متبقي مبلغ ${student.balanceDue} ج.م (يرجى المراجعة والتسوية) ⚠️`;

    const latestNote = student.notes[0];
    const noteSnippet = latestNote
      ? `• ملاحظة المعلم (${latestNote.subject}): "${latestNote.noteText}"`
      : '';

    return `*تقرير المتابعة الأكاديمي والمالي - EduCenter ERP* 📚
عزيزي ولي أمر الطالب: *${student.fullName}*
كود الطالب: ${student.studentCode} | المرحلة: ${student.stageName}

نحيطكم علماً بملخص المتابعة الشاملة لنجلكم:
• نسبة الحضور الإجمالية: *${student.attendanceRate}%*
${examSnippet}
${financeSnippet}
${noteSnippet}

مع تحيات إدارة السنتر التعليمي المتطور.
للاستفسار المباشر: 01000000000`;
  };

  // Simulate Triggering Meta WhatsApp Cloud API Endpoint
  const handleSendWhatsAppReport = () => {
    setIsSendingWhatsApp(true);
    setWhatsappSentSuccess(false);

    setTimeout(() => {
      const generatedMsgId = `wamid.HBgL${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const payload = {
        messageId: generatedMsgId,
        timestamp: new Date().toLocaleString('ar-EG'),
        recipient: selectedStudent.parentPhone,
        status: 'DELIVERED_TO_WHATSAPP_SERVERS'
      };

      setWhatsappResponsePayload(payload);
      setIsSendingWhatsApp(false);
      setWhatsappSentSuccess(true);
    }, 1200);
  };

  // Add new teacher note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteData.noteText.trim()) return;

    const newNote: TeacherNote = {
      id: `note-${Date.now()}`,
      teacherName: newNoteData.teacherName,
      subject: newNoteData.subject,
      date: new Date().toISOString().split('T')[0],
      noteText: newNoteData.noteText.trim(),
      category: newNoteData.category
    };

    const updatedStudents = students.map(s => {
      if (s.id === selectedStudent.id) {
        return {
          ...s,
          notes: [newNote, ...s.notes]
        };
      }
      return s;
    });

    setStudents(updatedStudents);
    setSelectedStudent(prev => ({
      ...prev,
      notes: [newNote, ...prev.notes]
    }));

    setIsAddNoteModalOpen(false);
    setNewNoteData({
      teacherName: 'د. طارق شاكر (مدرس الفيزياء)',
      subject: 'فيزياء',
      noteText: '',
      category: 'ACADEMIC'
    });
  };

  // Download Comprehensive PDF Report using jsPDF
  const handleDownloadPDFReport = (student: Student360Data) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('EduCenter Smart ERP - Student 360 Full Archive', 20, 20);
    doc.setFontSize(12);
    doc.text(`Student Code: ${student.studentCode}`, 20, 32);
    doc.text(`Student Name: ${student.fullName}`, 20, 40);
    doc.text(`Stage: ${student.stageName}`, 20, 48);
    doc.text(`Parent: ${student.parentName} (${student.parentPhone})`, 20, 56);
    doc.text(`Attendance Rate: ${student.attendanceRate}%`, 20, 64);
    doc.text(`Payment Clearance: ${student.paymentStatus} (Paid: ${student.totalPaid} EGP / Due: ${student.balanceDue} EGP)`, 20, 72);

    doc.text('------------------------------------------------------------', 20, 80);
    doc.text('Recent Exam Performance:', 20, 88);
    let yPos = 96;
    student.exams.forEach((ex, idx) => {
      doc.text(`${idx + 1}. ${ex.examName} (${ex.subject}) - Score: ${ex.score}/${ex.maxScore} [${ex.gradeLabel}]`, 25, yPos);
      yPos += 8;
    });

    doc.text('------------------------------------------------------------', 20, yPos + 4);
    doc.text('Authorized Academic System Stamp - Zero Error Security Protocol', 20, yPos + 14);

    doc.save(`Student-360-Archive-${student.studentCode}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <User className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">ملف متابعة الطالب الشامل (Student 360 Profile)</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  أرشيف تفاعلي كامل
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                السجل المالي • الحضور والغياب بالدقيقة • درجات الاختبارات • ملاحظات المعلمين • وزر إرسال تقارير الواتساب
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadPDFReport(selectedStudent)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تحميل الأرشيف PDF</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>إرسال تقرير الواتساب لولي الأمر</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Student Selector (Right 4 cols) & 360 Full Workspace (Left 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Selector Sidebar (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الكود، أو هاتف ولي الأمر..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Students List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredStudents.map(student => {
                const isSelected = selectedStudent.id === student.id;
                return (
                  <div
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-950/70 to-slate-800/80 border-emerald-500/50 shadow-md shadow-emerald-950/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{student.fullName}</span>
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                            {student.studentCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{student.stageName}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {student.parentPhone}
                          </span>
                        </div>
                      </div>

                      <div className="text-left flex flex-col items-end shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            student.paymentStatus === 'CLEARED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : student.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {student.paymentStatus === 'CLEARED' ? 'خالص' : student.paymentStatus === 'PARTIAL' ? 'سداد جزئي' : 'متأخر'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 mt-1.5">
                          حضور: {student.attendanceRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Student 360 Full Archive Workspace (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Student Header Card with Quick Stats & HMAC QR Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xl shadow-md">
                  {selectedStudent.fullName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{selectedStudent.fullName}</h3>
                    <span className="text-xs font-mono bg-slate-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50">
                      {selectedStudent.studentCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedStudent.stageName} • ولي الأمر: <strong className="text-slate-300">{selectedStudent.parentName}</strong> ({selectedStudent.parentPhone})
                  </p>
                </div>
              </div>

              {/* HMAC Card Badge */}
              <div className="bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2.5">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="text-[10px] text-slate-500 block">كود HMAC المشفر:</span>
                  <span className="font-mono text-emerald-400 font-bold text-[11px]">HMAC-SHA256 VERIFIED</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">نسبة الحضور:</span>
                <span className="text-base font-bold font-mono text-emerald-400">{selectedStudent.attendanceRate}%</span>
                <span className="text-[10px] text-slate-500 block">من إجمالي الحصص</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">المبلغ المسدد:</span>
                <span className="text-base font-bold font-mono text-white">{selectedStudent.totalPaid} ج.م</span>
                <span className="text-[10px] text-emerald-400 block">إيصالات معتمدة</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">المتبقي المطلوب:</span>
                <span className={`text-base font-bold font-mono ${selectedStudent.balanceDue > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {selectedStudent.balanceDue} ج.م
                </span>
                <span className="text-[10px] text-slate-500 block">حالة الخزنة</span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                <span className="text-[10px] text-slate-400 block">المجموعات المسجلة:</span>
                <span className="text-base font-bold font-mono text-cyan-400">{selectedStudent.enrolledGroups.length} مجموعات</span>
                <span className="text-[10px] text-slate-500 block">دراسة منتظمة</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-800 mt-5 pt-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'OVERVIEW'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>المجموعات والشعب</span>
              </button>

              <button
                onClick={() => setActiveTab('ATTENDANCE')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'ATTENDANCE'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>سجل الحضور والغياب ({selectedStudent.attendance.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('EXAMS')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'EXAMS'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>درجات الامتحانات ({selectedStudent.exams.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('NOTES')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'NOTES'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>ملاحظات المعلمين ({selectedStudent.notes.length})</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Enrolled Groups Overview */}
          {activeTab === 'OVERVIEW' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>المجموعات الدراسية المشترك بها الطالب</span>
              </h4>

              <div className="space-y-3">
                {selectedStudent.enrolledGroups.map((grp, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <h5 className="font-bold text-sm text-white">{grp.groupName}</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        المحاضر: <span className="text-slate-300 font-semibold">{grp.teacherName}</span>
                      </p>
                    </div>

                    <div className="text-left flex items-center gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 block">نظام المحاسبة:</span>
                        <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                          {grp.billingType === 'MONTHLY' ? 'اشتراك شهري' : 'سداد بالحصة'}
                        </span>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-slate-500 block">قيمة الاشتراك:</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">{grp.price} ج.م</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Attendance Ledger with minute timestamps & WhatsApp alerts */}
          {activeTab === 'ATTENDANCE' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>سجل الحضور والغياب المفصل بالدقيقة</span>
                </h4>
                <span className="text-xs text-slate-400">
                  توثيق آلي عبر ماسح QR والـ HMAC Guard
                </span>
              </div>

              <div className="divide-y divide-slate-800 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                {selectedStudent.attendance.map(att => (
                  <div key={att.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          att.status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : att.status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {att.status === 'PRESENT' ? '✓' : att.status === 'LATE' ? '⏱' : '✕'}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{att.groupName}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              att.status === 'PRESENT'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                : att.status === 'LATE'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                                : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                            }`}
                          >
                            {att.status === 'PRESENT' ? 'حاضر في الموعد' : att.status === 'LATE' ? `تأخير ${att.delayMinutes} دقيقة` : 'غائب'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          تاريخ الحصة: <span className="text-slate-300 font-mono">{att.sessionDate}</span> • وقت التسجيل بالدقيقة: <span className="text-emerald-400 font-mono font-bold">{att.checkInTime}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-left flex flex-col items-end">
                      {att.whatsappAlertSent && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>تم إرسال إشعار غياب للواتساب</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono mt-1">
                        {att.verifiedBy === 'HMAC_QR_SCAN' ? 'توثيق QR مشفر' : 'تسجيل إشرافي'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Exam Scores & Rankings */}
          {activeTab === 'EXAMS' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>نتائج الاختبارات والتقييم الدوري</span>
                </h4>
                <span className="text-xs text-slate-400">
                  سجل الدرجات والترتيب بين طلاب المجموعة
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {selectedStudent.exams.map(exam => {
                  const percentage = Math.round((exam.score / exam.maxScore) * 100);
                  return (
                    <div key={exam.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-sm text-white">{exam.examName}</h5>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                              مادة {exam.subject}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            تاريخ الاختبار: <span className="font-mono text-slate-300">{exam.date}</span> • الترتيب: <strong className="text-cyan-400">{exam.rankInGroup}</strong>
                          </p>
                        </div>

                        <div className="text-left flex flex-col items-end shrink-0">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold font-mono text-emerald-400">{exam.score}</span>
                            <span className="text-xs text-slate-500 font-mono">/ {exam.maxScore}</span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/40 px-2 py-0.5 rounded mt-1">
                            {exam.gradeLabel} ({percentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percentage >= 90 ? 'bg-emerald-500' : percentage >= 75 ? 'bg-cyan-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: Teacher Notes & Observations */}
          {activeTab === 'NOTES' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>ملاحظات المعلمين والإشراف الأكاديمي</span>
                </h4>
                <button
                  onClick={() => setIsAddNoteModalOpen(true)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  + إضافة ملاحظة جديدة
                </button>
              </div>

              <div className="space-y-3">
                {selectedStudent.notes.map(note => (
                  <div key={note.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{note.teacherName}</span>
                        <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded">
                          {note.category === 'ACADEMIC' ? 'تقييم أكاديمي' : note.category === 'ACHIEVEMENT' ? 'إنجاز وتفوق' : 'ملاحظة سلوكية'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">{note.date}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                      "{note.noteText}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* WhatsApp Dispatch Modal */}
      {isWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsWhatsAppModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">إرسال تقرير الواتساب لولي الأمر</h3>
                <p className="text-xs text-slate-400">
                  عبر WhatsApp Business Cloud API المباشرة
                </p>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl mb-4 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400">ولي الأمر المستلم:</span>
                <span className="font-bold text-white">{selectedStudent.parentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">رقم الواتساب المسجل:</span>
                <span className="font-mono text-emerald-400 font-bold">{selectedStudent.parentPhone}</span>
              </div>
            </div>

            {/* Message Preview */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                معاينة نص الرسالة المؤتمتة:
              </label>
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 text-xs text-slate-200 whitespace-pre-line font-sans leading-relaxed max-h-56 overflow-y-auto">
                {generateWhatsAppMessageTemplate(selectedStudent)}
              </div>
            </div>

            {/* If sent successfully */}
            {whatsappSentSuccess && whatsappResponsePayload && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم إرسال التقرير بنجاح عبر سيرفرات WhatsApp API!</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  معرف الرسالة: {whatsappResponsePayload.messageId}
                </div>
                <div className="text-[11px] text-slate-400">
                  الوقت: {whatsappResponsePayload.timestamp}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                إغلاق
              </button>
              <button
                type="button"
                disabled={isSendingWhatsApp}
                onClick={handleSendWhatsAppReport}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSendingWhatsApp ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>جاري الإرسال عبر API...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 stroke-[2.5]" />
                    <span>تأكيد الإرسال للواتساب</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher Note Modal */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddNoteModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-white mb-4">إضافة ملاحظة أكاديمية للطالب</h3>

            <form onSubmit={handleAddNote} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">اسم المعلم / التخصص:</label>
                <input
                  type="text"
                  value={newNoteData.teacherName}
                  onChange={e => setNewNoteData({ ...newNoteData, teacherName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">تصنيف الملاحظة:</label>
                <select
                  value={newNoteData.category}
                  onChange={e => setNewNoteData({ ...newNoteData, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="ACADEMIC">تقييم أكاديمي</option>
                  <option value="ACHIEVEMENT">إنجاز وتفوق</option>
                  <option value="BEHAVIORAL">ملاحظة سلوكية ومتابعة</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">نص الملاحظة:</label>
                <textarea
                  rows={4}
                  value={newNoteData.noteText}
                  onChange={e => setNewNoteData({ ...newNoteData, noteText: e.target.value })}
                  placeholder="اكتب التقييم الأكاديمي أو التوجيه للطالب وولي أمره..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow"
                >
                  حفظ الملاحظة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
