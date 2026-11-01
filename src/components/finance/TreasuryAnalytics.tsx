import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Filter,
  Download,
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Wallet,
  PieChart as PieIcon,
  BarChart3,
  Layers
} from 'lucide-react';

interface DailyCashFlow {
  day: string;
  fullDate: string;
  cashIn: number;
  cashOut: number;
  netProfit: number;
  teacherShare: number;
  operatingExpenses: number;
}

// 30-Day Simulated Historical Cash Flow for October 2026
const MONTHLY_DATA: DailyCashFlow[] = [
  { day: '01', fullDate: '2026-10-01', cashIn: 6800, cashOut: 4200, netProfit: 2600, teacherShare: 3500, operatingExpenses: 700 },
  { day: '02', fullDate: '2026-10-02', cashIn: 5400, cashOut: 3600, netProfit: 1800, teacherShare: 3100, operatingExpenses: 500 },
  { day: '03', fullDate: '2026-10-03', cashIn: 7200, cashOut: 4600, netProfit: 2600, teacherShare: 3900, operatingExpenses: 700 },
  { day: '04', fullDate: '2026-10-04', cashIn: 4900, cashOut: 3200, netProfit: 1700, teacherShare: 2800, operatingExpenses: 400 },
  { day: '05', fullDate: '2026-10-05', cashIn: 8500, cashOut: 5300, netProfit: 3200, teacherShare: 4600, operatingExpenses: 700 },
  { day: '06', fullDate: '2026-10-06', cashIn: 3800, cashOut: 2400, netProfit: 1400, teacherShare: 2100, operatingExpenses: 300 },
  { day: '07', fullDate: '2026-10-07', cashIn: 6100, cashOut: 3900, netProfit: 2200, teacherShare: 3400, operatingExpenses: 500 },
  { day: '08', fullDate: '2026-10-08', cashIn: 9200, cashOut: 5800, netProfit: 3400, teacherShare: 5100, operatingExpenses: 700 },
  { day: '09', fullDate: '2026-10-09', cashIn: 4500, cashOut: 3000, netProfit: 1500, teacherShare: 2600, operatingExpenses: 400 },
  { day: '10', fullDate: '2026-10-10', cashIn: 7800, cashOut: 4900, netProfit: 2900, teacherShare: 4200, operatingExpenses: 700 },
  { day: '11', fullDate: '2026-10-11', cashIn: 6500, cashOut: 4100, netProfit: 2400, teacherShare: 3600, operatingExpenses: 500 },
  { day: '12', fullDate: '2026-10-12', cashIn: 8900, cashOut: 5600, netProfit: 3300, teacherShare: 4900, operatingExpenses: 700 },
  { day: '13', fullDate: '2026-10-13', cashIn: 5200, cashOut: 3400, netProfit: 1800, teacherShare: 2900, operatingExpenses: 500 },
  { day: '14', fullDate: '2026-10-14', cashIn: 7400, cashOut: 4700, netProfit: 2700, teacherShare: 4000, operatingExpenses: 700 },
  { day: '15', fullDate: '2026-10-15', cashIn: 11200, cashOut: 7200, netProfit: 4000, teacherShare: 6200, operatingExpenses: 1000 },
  { day: '16', fullDate: '2026-10-16', cashIn: 4800, cashOut: 3100, netProfit: 1700, teacherShare: 2700, operatingExpenses: 400 },
  { day: '17', fullDate: '2026-10-17', cashIn: 6900, cashOut: 4300, netProfit: 2600, teacherShare: 3800, operatingExpenses: 500 },
  { day: '18', fullDate: '2026-10-18', cashIn: 8300, cashOut: 5200, netProfit: 3100, teacherShare: 4500, operatingExpenses: 700 },
  { day: '19', fullDate: '2026-10-19', cashIn: 5600, cashOut: 3600, netProfit: 2000, teacherShare: 3100, operatingExpenses: 500 },
  { day: '20', fullDate: '2026-10-20', cashIn: 7700, cashOut: 4900, netProfit: 2800, teacherShare: 4200, operatingExpenses: 700 },
  { day: '21', fullDate: '2026-10-21', cashIn: 6400, cashOut: 4000, netProfit: 2400, teacherShare: 3500, operatingExpenses: 500 },
  { day: '22', fullDate: '2026-10-22', cashIn: 9500, cashOut: 6000, netProfit: 3500, teacherShare: 5200, operatingExpenses: 800 },
  { day: '23', fullDate: '2026-10-23', cashIn: 4200, cashOut: 2700, netProfit: 1500, teacherShare: 2300, operatingExpenses: 400 },
  { day: '24', fullDate: '2026-10-24', cashIn: 7100, cashOut: 4500, netProfit: 2600, teacherShare: 3900, operatingExpenses: 600 },
  { day: '25', fullDate: '2026-10-25', cashIn: 8800, cashOut: 5500, netProfit: 3300, teacherShare: 4800, operatingExpenses: 700 },
  { day: '26', fullDate: '2026-10-26', cashIn: 5900, cashOut: 3800, netProfit: 2100, teacherShare: 3200, operatingExpenses: 600 },
  { day: '27', fullDate: '2026-10-27', cashIn: 7600, cashOut: 4800, netProfit: 2800, teacherShare: 4100, operatingExpenses: 700 },
  { day: '28', fullDate: '2026-10-28', cashIn: 10400, cashOut: 6700, netProfit: 3700, teacherShare: 5700, operatingExpenses: 1000 },
  { day: '29', fullDate: '2026-10-29', cashIn: 6200, cashOut: 4000, netProfit: 2200, teacherShare: 3400, operatingExpenses: 600 },
  { day: '30', fullDate: '2026-10-30', cashIn: 8100, cashOut: 5100, netProfit: 3000, teacherShare: 4400, operatingExpenses: 700 },
  { day: '31', fullDate: '2026-10-31', cashIn: 9600, cashOut: 6100, netProfit: 3500, teacherShare: 5300, operatingExpenses: 800 }
];

export default function TreasuryAnalytics() {
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const printReportRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printReportRef,
    documentTitle: `تقرير_حركة_الخزنة_${timeRange}_يوم`,
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
        }
      }
    `
  });

  const dataSlice =
    timeRange === '7'
      ? MONTHLY_DATA.slice(-7)
      : timeRange === '14'
      ? MONTHLY_DATA.slice(-14)
      : MONTHLY_DATA;

  // Aggregate Key Financial Metrics
  const totalCashIn = dataSlice.reduce((acc, curr) => acc + curr.cashIn, 0);
  const totalCashOut = dataSlice.reduce((acc, curr) => acc + curr.cashOut, 0);
  const totalNetProfit = dataSlice.reduce((acc, curr) => acc + curr.netProfit, 0);
  const totalTeacherPayouts = dataSlice.reduce((acc, curr) => acc + curr.teacherShare, 0);
  const totalOperatingCosts = dataSlice.reduce((acc, curr) => acc + curr.operatingExpenses, 0);
  const profitMargin = Math.round((totalNetProfit / totalCashIn) * 100);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 font-['Cairo',sans-serif]">
          <p className="font-bold text-white border-b border-slate-800 pb-1">
            يوم {label} أكتوبر 2026
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 font-mono">
              <span style={{ color: entry.color }} className="font-sans font-semibold">
                {entry.name}:
              </span>
              <span className="font-bold text-white">
                {entry.value.toLocaleString()} ج.م
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleExportCSV = () => {
    const headers = 'اليوم,التاريخ,المقبوضات (Cash In),المدفوعات (Cash Out),صافي الربح,حصة المدرسين,المصروفات التشغيلية\n';
    const rows = dataSlice
      .map(
        d =>
          `${d.day},${d.fullDate},${d.cashIn},${d.cashOut},${d.netProfit},${d.teacherShare},${d.operatingExpenses}`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Treasury-Analytics-October-2026.csv`;
    link.click();
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
              <span>تحليلات الخزنة والربحية (TreasuryAnalytics & Recharts)</span>
            </div>
            <h2 className="text-2xl font-black text-white">
              تدفقات الخزنة النقدية ومنحنى الأرباح اليومية (Cash Flow & Net Profit)
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              رسوم بيانية تفاعلية متقدمة باستخدام <code className="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono">recharts</code> توضح حركة الإيرادات والمصروفات وصافي عوائد السنتر بدقة متناهية.
            </p>
          </div>

          {/* Action & Filter Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setTimeRange('7')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  timeRange === '7' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                آخر 7 أيام
              </button>
              <button
                onClick={() => setTimeRange('14')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  timeRange === '14' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                آخر 14 يوم
              </button>
              <button
                onClick={() => setTimeRange('30')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  timeRange === '30' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                شهر أكتوبر بالكامل
              </button>
            </div>

            <button
              onClick={() => handlePrint()}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
              title="تصدير للتقارير المالية المعتمدة وحفظها بصيغة PDF عبر react-to-print"
            >
              <Printer className="w-4 h-4" />
              <span>تصدير للتقارير (طباعة / PDF)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial Performance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Cash In */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              إجمالي المقبوضات (Cash In)
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              وارد الخزنة
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {totalCashIn.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">سداد مصروفات الطلاب للحصص والاشتراكات الشهرية</p>
        </div>

        {/* Total Cash Out */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-rose-400">
              <TrendingDown className="w-4 h-4" />
              إجمالي المدفوعات (Cash Out)
            </span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-bold">
              منصرف
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {totalCashOut.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">حصص المدرسين المسحوبة + المصروفات التشغيلية</p>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-cyan-400">
              <DollarSign className="w-4 h-4" />
              صافي أرباح السنتر
            </span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold font-mono">
              Net Profit
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {totalNetProfit.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-500">الفائض الصافي للسنتر بعد كافة الاستقطاعات</p>
        </div>

        {/* Profit Margin */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-purple-400">
              <Percent className="w-4 h-4" />
              هامش الربح التشغيلي
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
              كفاءة السنتر
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {profitMargin}%
          </div>
          <p className="text-[11px] text-slate-500">معدل تحويل الإيرادات إلى صافي ربح</p>
        </div>

      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Cash In vs Cash Out Flow (Area Chart / Bar Chart) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>مقارنة التدفقات النقدية (دخل / خرج الخزنة)</span>
              </h3>
              <p className="text-[11px] text-slate-400">متابعة دقيقة لحجم المقبوضات مقارنة بالنفقات اليومية</p>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  chartType === 'area' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                مساحي (Area)
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  chartType === 'bar' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                أعمدة (Bar)
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={dataSlice} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCashOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                    formatter={(value) => <span className="text-slate-300 font-sans">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="cashIn"
                    name="المقبوضات (Cash In)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCashIn)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cashOut"
                    name="المدفوعات (Cash Out)"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCashOut)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={dataSlice} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                    formatter={(value) => <span className="text-slate-300 font-sans">{value}</span>}
                  />
                  <Bar dataKey="cashIn" name="المقبوضات (Cash In)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cashOut" name="المدفوعات (Cash Out)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Net Profit Curve */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>منحنى صافي الأرباح اليومية (Daily Net Profit)</span>
              </h3>
              <p className="text-[11px] text-slate-400">تطور أرباح السنتر الصافية يوماً بيوم</p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-xl">
              +{totalNetProfit.toLocaleString()} ج.م
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataSlice} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNetProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  name="صافي ربح السنتر"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorNetProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Outflow Breakdown Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Outflow 1: Teacher Revenue Payouts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" />
              مستحقات المدرسين (Teacher Splits)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {Math.round((totalTeacherPayouts / totalCashOut) * 100)}% من المنصرف
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {totalTeacherPayouts.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-400">توزع وتودع تلقائياً في محافظ المعلمين مع كل سداد طالب</p>
        </div>

        {/* Outflow 2: Operational Expenses */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              المصروفات التشغيلية (OpEx)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {Math.round((totalOperatingCosts / totalCashOut) * 100)}% من المنصرف
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {totalOperatingCosts.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-400">فواتير الكهرباء، صيانة القاعات، الأدوات المكتبية والإنترنت</p>
        </div>

        {/* Outflow 3: Center Reserves */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              صافي الفائض المحتجز (Retained Cash)
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-bold text-emerald-400">
              +{profitMargin}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {totalNetProfit.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-[11px] text-slate-400">الفائض الصافي المحقق والمودع بالخزنة المركزية لتطوير السنتر</p>
        </div>

      </div>

      {/* Printable Section for Direct react-to-print Export */}
      <div ref={printReportRef} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        
        {/* Printable Official Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 print:text-black flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white print:text-black">
                سنتر الأوائل التعليمي الذكي • كشف حركة الخزنة والتدفقات النقدية
              </h3>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              بيان مالي رسمي بحركة الإيرادات، المصروفات، وأرباح السنتر وحصص المعلمين
            </p>
          </div>
          <div className="text-left text-xs text-slate-400 print:text-gray-600 font-mono">
            <div>الفترة: {timeRange === '7' ? 'آخر 7 أيام' : timeRange === '14' ? 'آخر 14 يوم' : 'شهر أكتوبر 2026 كاملاً'}</div>
            <div>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>

        {/* Printable Summary Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 print:border-gray-400 print:bg-gray-50 text-center">
            <span className="text-[11px] text-slate-400 print:text-gray-600 block">إجمالي المقبوضات</span>
            <span className="text-sm font-bold text-emerald-400 print:text-green-800 font-mono">+{totalCashIn.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 print:border-gray-400 print:bg-gray-50 text-center">
            <span className="text-[11px] text-slate-400 print:text-gray-600 block">إجمالي المصروفات</span>
            <span className="text-sm font-bold text-rose-400 print:text-red-800 font-mono">-{totalCashOut.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 print:border-gray-400 print:bg-gray-50 text-center">
            <span className="text-[11px] text-slate-400 print:text-gray-600 block">صافي أرباح السنتر</span>
            <span className="text-sm font-bold text-cyan-400 print:text-blue-800 font-mono">+{totalNetProfit.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 print:border-gray-400 print:bg-gray-50 text-center">
            <span className="text-[11px] text-slate-400 print:text-gray-600 block">حصص المدرسين</span>
            <span className="text-sm font-bold text-white print:text-black font-mono">{totalTeacherPayouts.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 print:border-gray-400 print:bg-gray-50 text-center">
            <span className="text-[11px] text-slate-400 print:text-gray-600 block">هامش الربحية</span>
            <span className="text-sm font-bold text-amber-400 print:text-amber-800 font-mono">{profitMargin}%</span>
          </div>
        </div>

        {/* Detailed Daily Breakdown Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 print:border-gray-400">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-black border-b border-slate-800 print:border-gray-400 font-bold">
              <tr>
                <th className="p-3">اليوم</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">الوارد (Cash In)</th>
                <th className="p-3">المنصرف (Cash Out)</th>
                <th className="p-3">صافي السنتر</th>
                <th className="p-3">حصة المعلم</th>
                <th className="p-3">المصروف التشغيلي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
              {dataSlice.map((row) => (
                <tr key={row.day} className="hover:bg-slate-950/40 print:hover:bg-transparent">
                  <td className="p-3 font-bold text-white print:text-black">{row.day}</td>
                  <td className="p-3 font-mono text-slate-400 print:text-gray-700">{row.fullDate}</td>
                  <td className="p-3 font-mono font-bold text-emerald-400 print:text-green-800">+{row.cashIn.toLocaleString()} ج.م</td>
                  <td className="p-3 font-mono text-rose-400 print:text-red-800">-{row.cashOut.toLocaleString()} ج.م</td>
                  <td className="p-3 font-mono font-bold text-cyan-400 print:text-blue-800">+{row.netProfit.toLocaleString()} ج.م</td>
                  <td className="p-3 font-mono text-slate-300 print:text-gray-800">{row.teacherShare.toLocaleString()} ج.م</td>
                  <td className="p-3 font-mono text-slate-400 print:text-gray-600">{row.operatingExpenses.toLocaleString()} ج.م</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950/90 print:bg-gray-100 font-bold border-t-2 border-slate-700 print:border-black text-xs">
              <tr>
                <td colSpan={2} className="p-3 text-white print:text-black">الإجمالي التراكمي للفترة:</td>
                <td className="p-3 font-mono text-emerald-400 print:text-green-800">+{totalCashIn.toLocaleString()} ج.م</td>
                <td className="p-3 font-mono text-rose-400 print:text-red-800">-{totalCashOut.toLocaleString()} ج.م</td>
                <td className="p-3 font-mono text-cyan-400 print:text-blue-800">+{totalNetProfit.toLocaleString()} ج.م</td>
                <td className="p-3 font-mono text-white print:text-black">{totalTeacherPayouts.toLocaleString()} ج.م</td>
                <td className="p-3 font-mono text-slate-300 print:text-gray-800">{totalOperatingCosts.toLocaleString()} ج.م</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Printable Official Signatures */}
        <div className="pt-6 border-t border-slate-800 print:border-gray-400 flex items-center justify-between text-xs text-slate-400 print:text-gray-700">
          <div>
            <span>* تقرير مالي صادر ومعتمد من منظومة EduCenter Smart ERP</span>
          </div>
          <div className="flex gap-16 print:flex">
            <div className="text-center">
              <span className="block mb-6 font-bold">توقيع المحاسب المالي</span>
              <div className="w-32 border-b border-slate-700 print:border-black" />
            </div>
            <div className="text-center">
              <span className="block mb-6 font-bold">اعتماد المدير العام</span>
              <div className="w-32 border-b border-slate-700 print:border-black" />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
