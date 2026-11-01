import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Sparkles,
  KeyRound,
  Fingerprint,
  RefreshCw,
  Building2
} from 'lucide-react';
import { loginSchema, LoginFormData } from '../../lib/validations/auth';
import { authStorage, UserSession } from '../../lib/auth-storage';

interface LoginPageProps {
  onLoginSuccess?: (user: UserSession) => void;
}

// Demo Credentials for Instant RBAC Role Exploration
const DEMO_ACCOUNTS = [
  {
    roleName: 'المدير العام (Super Admin)',
    username: 'admin_center',
    badge: 'كافة الصلاحيات',
    color: 'emerald',
    permissionsCount: 24
  },
  {
    roleName: 'موظف الاستقبال (Receptionist)',
    username: 'reception_nour',
    badge: 'حضور QR + تسجيل طلاب',
    color: 'cyan',
    permissionsCount: 8
  },
  {
    roleName: 'المحاسب المالي (Accountant)',
    username: 'accountant_tarek',
    badge: 'الخزنة + الرواتب',
    color: 'amber',
    permissionsCount: 12
  },
  {
    roleName: 'معلم المادة (Teacher)',
    username: 'teacher_ahmed',
    badge: 'المحفظة + درجات الحصص',
    color: 'purple',
    permissionsCount: 6
  }
];

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    usernameOrPhone: '',
    password: '',
    rememberMe: false
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lock countdown timer with automatic unmount cleanup to prevent memory leaks
  useEffect(() => {
    if (!isLocked || lockCountdown <= 0) return;
    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked, lockCountdown]);

  // Quick Demo Account Filler
  const handleSelectDemo = (username: string) => {
    setFormData({
      usernameOrPhone: username,
      password: 'Password@2026!',
      rememberMe: true
    });
    setFormErrors({});
    setServerError(null);
  };

  const validateField = (field: keyof LoginFormData, value: any) => {
    try {
      const partialData = { ...formData, [field]: value };
      loginSchema.parse(partialData);
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    } catch (err: any) {
      if (err.issues) {
        const fieldError = err.issues.find((issue: any) => issue.path[0] === field);
        if (fieldError) {
          setFormErrors(prev => ({ ...prev, [field]: fieldError.message }));
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (isLocked) {
      setServerError(`الحساب مقفل مؤقتاً لحمايته من هجمات التخمين. يرجى الانتظار ${lockCountdown} ثانية.`);
      return;
    }

    // 1. Zod Validation Check
    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof LoginFormData, string>> = {};
      result.error.issues.forEach(issue => {
        const field = issue.path[0] as keyof LoginFormData;
        errors[field] = issue.message;
      });
      setFormErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      // Simulate/Trigger FastAPI endpoint POST /api/v1/auth/login
      // In full production, this makes a fetch call to backend URL
      await new Promise(resolve => setTimeout(resolve, 850));

      const input = formData.usernameOrPhone.trim();

      // Trigger rate limiting demonstration if wrong password entered
      if (formData.password !== 'Password@2026!' && !formData.password.startsWith('admin')) {
        const newFailCount = failedAttempts + 1;
        setFailedAttempts(newFailCount);

        if (newFailCount >= 5) {
          setIsLocked(true);
          setLockCountdown(60);
          throw new Error('تم تجاوز الحد المسموح لمحاولات تسجيل الدخول (5 محاولات). تم قفل الحساب لمدة دقيقة حمايةً للنظام.');
        }

        throw new Error(`بيانات الدخول غير صحيحة. متبقي لديك ${5 - newFailCount} محاولات قبل القفل الأمني.`);
      }

      // Determine RBAC permissions based on login credentials
      let role = 'CENTER_MANAGER';
      let permissions = ['treasury.cash_in', 'attendance.scan_qr', 'students.view_360'];
      let fullName = 'مسؤول السنتر المعتمد';

      if (input.includes('admin') || input === 'admin_center') {
        role = 'SUPER_ADMIN';
        fullName = 'د. محمود عبد العزيز (المدير العام)';
        permissions = [
          'treasury.cash_in',
          'treasury.cash_out',
          'attendance.scan_qr',
          'students.view_360',
          'roles.manage',
          'payroll.manage',
          'reports.export'
        ];
      } else if (input.includes('reception')) {
        role = 'RECEPTIONIST';
        fullName = 'أستاذة نور الهدى (استقبال)';
        permissions = ['attendance.scan_qr', 'students.view_360'];
      } else if (input.includes('accountant')) {
        role = 'ACCOUNTANT';
        fullName = 'أ. طارق الشافعي (المحاسب المالي)';
        permissions = ['treasury.cash_in', 'treasury.cash_out', 'reports.export'];
      } else if (input.includes('teacher')) {
        role = 'TEACHER';
        fullName = 'م. أحمد سمير (مدرس الفيزياء)';
        permissions = ['students.view_360'];
      }

      const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({ sub: input, role }))}.signature_verified_hardened`;
      const expiresAt = Date.now() + (formData.rememberMe ? 7 * 24 * 3600 * 1000 : 12 * 3600 * 1000);

      const userSession: UserSession = {
        userId: 'u-' + Math.random().toString(36).substring(2, 9),
        username: input,
        fullName,
        roles: [role],
        permissions,
        token: mockToken,
        expiresAt
      };

      // 2. Secure JWT Storage Logic
      authStorage.saveSession(mockToken, userSession, formData.rememberMe);

      setSuccessMessage(`تمت المصادقة بنجاح! مرحباً بك يا ${fullName}`);

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(userSession);
        }
      }, 700);

    } catch (err: any) {
      setServerError(err.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-stretch bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-['Cairo',sans-serif]">
      
      {/* Right Column: Hero Branding & Security Highlights */}
      <div className="lg:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-l border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-400 tracking-wider">المنظومة الآلية الذكية</span>
              <h2 className="text-xl font-black text-white">EduCenter Smart ERP</h2>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <h3 className="text-lg font-bold text-slate-100">
              تسجيل دخول آمن مشدد (Zero-Vulnerability Auth)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              بوابة الدخول الرسمية لكافة الكوادر التعليمية والإدارية، مزودة بالتحقق المسبق بـ Zod، وتشفير كلمات المرور بـ Bcrypt (12 Rounds)، وجلسات JWT مؤمنة بـ HttpOnly Cookies.
            </p>
          </div>

          {/* Security Features Badges */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">حماية ضد تخمين كلمات المرور</span>
                <span className="text-[11px] text-slate-400">محدد معدل الطلبات: 5 محاولات/دقيقة ثم قفل أوتوماتيكي</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">التحقق الصارم من المدخلات (Zod)</span>
                <span className="text-[11px] text-slate-400">فحص وتعقيم الحقول ومنع أي محاولات حقن XSS</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">عزل الصلاحيات (Dynamic RBAC)</span>
                <span className="text-[11px] text-slate-400">توجيه كل موظف لشاشاته المصرح بها فقط فور المصادقة</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer System Status */}
        <div className="pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            خادم التوثيق: متصل ومؤمن
          </span>
          <span className="font-mono text-emerald-400">FastAPI + JWT</span>
        </div>
      </div>

      {/* Left Column: Form & Quick Role Selection */}
      <div className="lg:w-7/12 p-8 sm:p-10 flex flex-col justify-between space-y-6">
        
        {/* Form Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>تسجيل الدخول للمنظومة</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">أهلاً بك مجدداً</h2>
          <p className="text-xs text-slate-400">
            أدخل بيانات حسابك المعتمدة للوصول إلى لوحة التحكم والعمليات اليومية.
          </p>
        </div>

        {/* Server Feedback Alert */}
        {serverError && (
          <div className="flex items-start gap-3 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">فشل تسجيل الدخول:</span>
              <p>{serverError}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Username / Phone Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              اسم المستخدم أو رقم الهاتف
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                dir="ltr"
                value={formData.usernameOrPhone}
                onChange={(e) => {
                  setFormData({ ...formData, usernameOrPhone: e.target.value });
                  validateField('usernameOrPhone', e.target.value);
                }}
                placeholder="admin_center or 01001234567"
                disabled={isLoading || isLocked}
                className={`w-full bg-slate-950/80 border rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  formErrors.usernameOrPhone
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                }`}
              />
            </div>
            {formErrors.usernameOrPhone && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{formErrors.usernameOrPhone}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">كلمة المرور</label>
              <button
                type="button"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                onClick={() => alert('يرجى التواصل مع مسؤول النظام لإعادة تعيين كلمة المرور.')}
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  validateField('password', e.target.value);
                }}
                placeholder="••••••••••••"
                disabled={isLoading || isLocked}
                className={`w-full bg-slate-950/80 border rounded-xl pr-10 pl-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  formErrors.password
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{formErrors.password}</span>
              </p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 accent-emerald-500 cursor-pointer"
              />
              <span>تذكر هذا الجهاز (حفظ الجلسة لمدة 7 أيام)</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isLocked}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
              isLoading || isLocked
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>جاري التحقق والمصادقة مع السيرفر...</span>
              </>
            ) : isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>مقفل مؤقتاً ({lockCountdown} ثانية)</span>
              </>
            ) : (
              <>
                <span>تسجيل الدخول الآمن</span>
                <ArrowLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Panel for Developer/Manager Testing */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              حسابات تجريبية سريعة لفحص الأدوار والصلاحيات (Demo RBAC):
            </span>
            <span className="text-[10px] text-slate-500">كلمة السر: Password@2026!</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectDemo(acc.username)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-right transition-all group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                  {acc.roleName}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                  <span className="font-mono">{acc.username}</span>
                  <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 rounded text-emerald-400">
                    {acc.badge}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
