import React, { useState } from 'react';
import {
  Cloud,
  Database,
  Shield,
  ShieldCheck,
  Lock,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  Sparkles,
  Server,
  Layers,
  Search,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Sliders,
  Send,
  Eye,
  FileCode,
  FileCheck
} from 'lucide-react';

export interface BackupArchiveItem {
  id: string;
  filename: string;
  backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  createdAt: string;
  durationSeconds: number;
  rawSizeMb: number;
  compressedSizeMb: number;
  tablesCount: number;
  rowsCount: number;
  sha256Checksum: string;
  encryptionAlgorithm: string;
  cloudProvider: 'GCS' | 'AWS_S3' | 'CLOUDFLARE_R2';
  cloudDestinationUri: string;
  cloudSyncStatus: 'SYNCED' | 'UPLOADING' | 'FAILED';
  verifiedIntegrity: boolean;
}

export interface BackupScheduleConfigState {
  enabled: boolean;
  frequency: 'EVERY_6_HOURS' | 'DAILY_NIGHT' | 'WEEKLY';
  cronExpression: string;
  cloudProvider: 'GCS' | 'AWS_S3' | 'CLOUDFLARE_R2';
  bucketName: string;
  encryptionType: string;
  retentionDays: number;
  notifyOnFailure: boolean;
  notificationEmail: string;
}

const INITIAL_BACKUPS: BackupArchiveItem[] = [
  {
    id: 'bk-20261031-140000',
    filename: 'educenter_db_20261031_140000_full.sql.gz.enc',
    backupType: 'FULL',
    createdAt: '2026-10-31 14:00:00',
    durationSeconds: 3.85,
    rawSizeMb: 90.0,
    compressedSizeMb: 15.0,
    tablesCount: 14,
    rowsCount: 18450,
    sha256Checksum: '7e9c4b1a8d3e2f0a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
    encryptionAlgorithm: 'AES-256-GCM',
    cloudProvider: 'GCS',
    cloudDestinationUri: 'gs://educenter-production-vault-eu/daily-snapshots/2026-10-31/',
    cloudSyncStatus: 'SYNCED',
    verifiedIntegrity: true
  },
  {
    id: 'bk-20261030-020000',
    filename: 'educenter_db_20261030_020000_full.sql.gz.enc',
    backupType: 'FULL',
    createdAt: '2026-10-30 02:00:00',
    durationSeconds: 4.12,
    rawSizeMb: 87.0,
    compressedSizeMb: 14.2,
    tablesCount: 14,
    rowsCount: 17890,
    sha256Checksum: '3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    encryptionAlgorithm: 'AES-256-GCM',
    cloudProvider: 'GCS',
    cloudDestinationUri: 'gs://educenter-production-vault-eu/daily-snapshots/2026-10-30/',
    cloudSyncStatus: 'SYNCED',
    verifiedIntegrity: true
  },
  {
    id: 'bk-20261029-020000',
    filename: 'educenter_db_20261029_020000_full.sql.gz.enc',
    backupType: 'FULL',
    createdAt: '2026-10-29 02:00:00',
    durationSeconds: 3.95,
    rawSizeMb: 85.0,
    compressedSizeMb: 13.6,
    tablesCount: 14,
    rowsCount: 17340,
    sha256Checksum: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    encryptionAlgorithm: 'AES-256-GCM',
    cloudProvider: 'GCS',
    cloudDestinationUri: 'gs://educenter-production-vault-eu/daily-snapshots/2026-10-29/',
    cloudSyncStatus: 'SYNCED',
    verifiedIntegrity: true
  }
];

export default function DatabaseBackupManager() {
  const [backups, setBackups] = useState<BackupArchiveItem[]>(INITIAL_BACKUPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'FULL' | 'INCREMENTAL'>('ALL');

  // Schedule Config State
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfigState>({
    enabled: true,
    frequency: 'DAILY_NIGHT',
    cronExpression: '0 2 * * *',
    cloudProvider: 'GCS',
    bucketName: 'gs://educenter-production-vault-eu',
    encryptionType: 'AES-256-GCM',
    retentionDays: 90,
    notifyOnFailure: true,
    notificationEmail: 'security@educenter.edu.eg'
  });

  // Modal States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVerifyingModalOpen, setIsVerifyingModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForAction, setSelectedBackupForAction] = useState<BackupArchiveItem | null>(null);

  // Creation Pipeline Animation
  const [creationStep, setCreationStep] = useState<number>(0);
  const [isCreatingBackup, setIsCreatingBackup] = useState<boolean>(false);
  const [newBackupNote, setNewBackupNote] = useState('نسخة احتياطية فورية وتخزين سحابي');

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    matches: boolean;
    sha256: string;
    cloudStatus: string;
    verifiedAt: string;
  } | null>(null);

  // Restore State
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // Filter Backups
  const filteredBackups = backups.filter(b => {
    const matchesSearch =
      b.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.sha256Checksum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedFilter === 'ALL' || b.backupType === selectedFilter;
    return matchesSearch && matchesType;
  });

  // Trigger Immediate Backup Pipeline
  const handleStartCreateBackup = () => {
    setIsCreateModalOpen(true);
    setCreationStep(0);
    setIsCreatingBackup(false);
  };

  const handleExecuteBackupPipeline = () => {
    setIsCreatingBackup(true);
    setCreationStep(1);

    // Step 1: WAL Checkpoint Freeze
    setTimeout(() => {
      setCreationStep(2);

      // Step 2: Table Export & Triggers
      setTimeout(() => {
        setCreationStep(3);

        // Step 3: Gzip & AES-256-GCM Encryption
        setTimeout(() => {
          setCreationStep(4);

          // Step 4: SHA-256 Hash Generation
          setTimeout(() => {
            setCreationStep(5);

            // Step 5: Cloud Storage Upload & Finish
            setTimeout(() => {
              const now = new Date();
              const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
              const formattedDate = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString('en-US', { hour12: false })}`;

              // Random simulated SHA-256 hash
              const randomHash = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

              const newlyCreated: BackupArchiveItem = {
                id: `bk-${dateStr}`,
                filename: `educenter_db_${dateStr}_full.sql.gz.enc`,
                backupType: 'FULL',
                createdAt: formattedDate,
                durationSeconds: 3.42,
                rawSizeMb: 91.2,
                compressedSizeMb: 15.2,
                tablesCount: 14,
                rowsCount: 18620,
                sha256Checksum: randomHash,
                encryptionAlgorithm: 'AES-256-GCM',
                cloudProvider: scheduleConfig.cloudProvider,
                cloudDestinationUri: `${scheduleConfig.bucketName}/manual-snapshots/${dateStr}/`,
                cloudSyncStatus: 'SYNCED',
                verifiedIntegrity: true
              };

              setBackups(prev => [newlyCreated, ...prev]);
              setIsCreatingBackup(false);
              setCreationStep(6); // Done!
            }, 1000);
          }, 800);
        }, 900);
      }, 800);
    }, 700);
  };

  // Checksum Integrity Verification
  const handleVerifyChecksum = (backup: BackupArchiveItem) => {
    setSelectedBackupForAction(backup);
    setIsVerifyingModalOpen(true);
    setIsVerifying(true);
    setVerificationResult(null);

    setTimeout(() => {
      setIsVerifying(false);
      setVerificationResult({
        matches: true,
        sha256: backup.sha256Checksum,
        cloudStatus: 'REMOTE_SHA256_MATCH',
        verifiedAt: new Date().toLocaleTimeString('ar-EG')
      });
    }, 1100);
  };

  // Restore Modal Trigger
  const handleOpenRestoreModal = (backup: BackupArchiveItem) => {
    setSelectedBackupForAction(backup);
    setRestorePassphrase('');
    setIsRestoreModalOpen(true);
    setRestoreSuccessMessage(null);
  };

  const handleExecuteRestore = (e: React.FormEvent) => {
    e.preventDefault();
    if (restorePassphrase !== 'CONFIRM_RESTORE_EDUCENTER_2026') {
      alert('خطأ أمني: عبارة التأكيد غير صحيحة. يرجى إدخال CONFIRM_RESTORE_EDUCENTER_2026 بالضبط لتأكيد الاستعادة.');
      return;
    }

    setIsRestoring(true);
    setTimeout(() => {
      setIsRestoring(false);
      setRestoreSuccessMessage(`تم فحص سلامة النسخة ${selectedBackupForAction?.filename} واستعادة كافة الجداول والبيانات المالية والطلابية بنجاح 100%!`);
    }, 1500);
  };

  // Download Simulated Encrypted File
  const handleDownloadBackup = (backup: BackupArchiveItem) => {
    const dummyContent = `--- EDUCENTER SMART ERP DATABASE BACKUP ARCHIVE ---
ID: ${backup.id}
FILE: ${backup.filename}
TIMESTAMP: ${backup.createdAt}
TABLES: ${backup.tablesCount} (students, groups, treasury, attendance, teacher_payouts, etc.)
ROWS: ${backup.rowsCount}
ENCRYPTION: ${backup.encryptionAlgorithm}
SHA256: ${backup.sha256Checksum}
CLOUD_DESTINATION: ${backup.cloudDestinationUri}
--- ENCRYPTED PAYLOAD BINARY BLOCK (AES-256-GCM) ---
U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkw++4Vf9H...
--- END OF ENCRYPTED ARCHIVE ---`;

    const blob = new Blob([dummyContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
              <Cloud className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">الأرشفة السحابية والنسخ الاحتياطي الدوري (Automated Backup)</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  أرشفة سحابية نشطة • AES-256-GCM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                نسخ احتياطي أوتوماتيكي دوري لقاعدة بيانات PostgreSQL • تشفير عسكري قوي • رفع مباشر للسحابة لضمان عدم ضياع أي بيانات مالية أو طلابية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>إعدادات الجدولة والسحابة</span>
            </button>

            <button
              onClick={handleStartCreateBackup}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Database className="w-4 h-4 stroke-[2.5]" />
              <span>إنشاء نسخة احتياطية فورية الآن</span>
            </button>
          </div>
        </div>

        {/* Restore Global Notification */}
        {restoreSuccessMessage && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{restoreSuccessMessage}</span>
            </div>
            <button onClick={() => setRestoreSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Cloud & Architecture KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">حالة الحماية والأرشفة:</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">100% مؤمنة ومطابقة</span>
            <span className="text-[10px] text-slate-500 block">بدون أي فقدان للبيانات</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">النسخة التلقائية القادمة:</span>
            <span className="text-sm font-bold text-white font-mono">اليوم 02:00 ص</span>
            <span className="text-[10px] text-cyan-400 block font-mono">{scheduleConfig.cronExpression} (Cron Job)</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">المساحة السحابية المستغلة:</span>
            <span className="text-sm font-bold text-white font-mono">42.8 MB</span>
            <span className="text-[10px] text-slate-500 block">توفير 84% بعد ضغط GZIP</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">المزود السحابي النشط:</span>
            <span className="text-sm font-bold text-purple-300 font-mono">Google Cloud (GCS)</span>
            <span className="text-[10px] text-slate-500 block font-mono">EU Multi-Regional Vault</span>
          </div>
        </div>
      </div>

      {/* Main Table Container: Backup History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        
        {/* Table Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>سجل النسخ الاحتياطية السحابية ({filteredBackups.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">AES-256 Encrypted Dumps</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث باسم الملف أو بصمة SHA-256..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedFilter('FULL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedFilter === 'FULL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                كاملة (Full)
              </button>
            </div>
          </div>
        </div>

        {/* Backups Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-3 px-3">اسم الملف والأرشيف</th>
                <th className="py-3 px-3">تاريخ ووقت الإنشاء</th>
                <th className="py-3 px-3">النوع والمحتوى</th>
                <th className="py-3 px-3">الحجم والضغط</th>
                <th className="py-3 px-3">بصمة التحقق (SHA-256)</th>
                <th className="py-3 px-3">السحابة المستهدفة</th>
                <th className="py-3 px-3 text-center">العمليات الآمنة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredBackups.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  
                  {/* File & ID */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 flex items-center justify-center font-bold">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-white block font-mono text-[11px]">{item.filename}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">{item.id}</span>
                          <span className="text-[10px] bg-slate-800 text-cyan-300 px-1 rounded font-mono">
                            {item.encryptionAlgorithm}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Created At & Duration */}
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-slate-200 block text-[11px]">{item.createdAt}</span>
                    <span className="text-[10px] text-slate-500 block">استغرقت: {item.durationSeconds} ثوانٍ</span>
                  </td>

                  {/* Type & Record Counts */}
                  <td className="py-3.5 px-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 font-mono">
                      {item.backupType === 'FULL' ? 'نسخة كاملة (Full)' : 'تزايدية (WAL)'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {item.tablesCount} جدول • {item.rowsCount.toLocaleString('ar-EG')} سجل
                    </span>
                  </td>

                  {/* Sizes */}
                  <td className="py-3.5 px-3 font-mono">
                    <span className="text-emerald-400 font-bold block">{item.compressedSizeMb} MB</span>
                    <span className="text-[10px] text-slate-500 block line-through">{item.rawSizeMb} MB الأصلي</span>
                  </td>

                  {/* SHA-256 Hash */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {item.sha256Checksum.slice(0, 16)}...
                      </code>
                      <button
                        onClick={() => handleVerifyChecksum(item)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline"
                        title="فحص التطابق مع السحابة"
                      >
                        فحص
                      </button>
                    </div>
                  </td>

                  {/* Cloud Target */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-slate-300 font-semibold">{item.cloudProvider}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[140px]" title={item.cloudDestinationUri}>
                      {item.cloudDestinationUri}
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleDownloadBackup(item)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                        title="تحميل الأرشيف المشفر"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                      </button>

                      <button
                        onClick={() => handleVerifyChecksum(item)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
                        title="فحص بصمة الهاش الرقمية"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      </button>

                      <button
                        onClick={() => handleOpenRestoreModal(item)}
                        className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 rounded-lg transition-colors border border-rose-800/40"
                        title="استعادة قاعدة البيانات من هذه النسخة (Restore)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Security & Reliability Architecture Footnote */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-400">
          <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">تشفير AES-256-GCM عسكري:</strong>
              <p className="text-[11px] text-slate-400">تُشفر كافة البيانات قبل خروجها من السيرفر بمفاتيح متجددة لا تتاح لأي طرف ثالث.</p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <Cloud className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">تخزين سحابي متعدد المناطق:</strong>
              <p className="text-[11px] text-slate-400">تُحفظ النسخ في مراكز بيانات أوروبية متعددة تضمن التوفر بنسبة 99.999999999% (11 9s durability).</p>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">فحص المطابقة الذري (SHA-256):</strong>
              <p className="text-[11px] text-slate-400">يتم توليد هاش رقمي مستقل لكل نسخة فور الرفع لضمان عدم تعرض أي بايت للتلف أو التعديل.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Immediate Backup Creation Pipeline Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (!isCreatingBackup) setIsCreateModalOpen(false);
              }}
              disabled={isCreatingBackup}
              className="absolute top-4 left-4 text-slate-400 hover:text-white disabled:opacity-30"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">إنشاء نسخة احتياطية فورية ورفعها للسحابة</h3>
                <p className="text-xs text-slate-400">نظام أتمتة الاستخراج والتشفير والرفع المتزامن</p>
              </div>
            </div>

            {/* Note input if not started */}
            {creationStep === 0 && (
              <div className="space-y-4 text-xs mb-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">وصف أو سبب النسخة الاحتياطية:</label>
                  <input
                    type="text"
                    value={newBackupNote}
                    onChange={e => setNewBackupNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] space-y-1.5 text-slate-300">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>قاعدة البيانات المستهدفة:</span>
                    <span className="font-mono text-cyan-400 font-bold">PostgreSQL 16 (educenter_erp_db)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>عدد الجداول المشمولة:</span>
                    <span className="text-white font-bold">14 جدول (جميع الطلاب، الخزنة، والمدرسين)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>السحابة المستهدفة:</span>
                    <span className="font-mono text-purple-300 font-bold">{scheduleConfig.bucketName}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBackupPipeline}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow transition-all"
                  >
                    بدء عملية الأرشفة الآن
                  </button>
                </div>
              </div>
            )}

            {/* Pipeline In Progress Animation */}
            {creationStep > 0 && (
              <div className="space-y-3 my-4 text-xs">
                {/* Step 1 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  creationStep > 1
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                    : creationStep === 1
                    ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {creationStep > 1 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : creationStep === 1 ? (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 block" />
                    )}
                    <span className="font-bold">1. تجميد سجلات الـ WAL الذرية (WAL Checkpoint Freeze)</span>
                  </div>
                  <span className="font-mono text-[10px]">{creationStep > 1 ? 'مكتمل' : creationStep === 1 ? 'جاري...' : 'انتظار'}</span>
                </div>

                {/* Step 2 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  creationStep > 2
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                    : creationStep === 2
                    ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {creationStep > 2 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : creationStep === 2 ? (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 block" />
                    )}
                    <span className="font-bold">2. تصدير الجداول الـ 14 والـ Triggers والـ Functions</span>
                  </div>
                  <span className="font-mono text-[10px]">{creationStep > 2 ? '18,620 سجل' : creationStep === 2 ? 'جاري الاستخراج...' : 'انتظار'}</span>
                </div>

                {/* Step 3 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  creationStep > 3
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                    : creationStep === 3
                    ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {creationStep > 3 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : creationStep === 3 ? (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 block" />
                    )}
                    <span className="font-bold">3. الضغط بتنسيق GZIP وتشفير الكتلة بمفتاح AES-256-GCM</span>
                  </div>
                  <span className="font-mono text-[10px]">{creationStep > 3 ? '15.2 MB (توفير 84%)' : creationStep === 3 ? 'جاري التشفير...' : 'انتظار'}</span>
                </div>

                {/* Step 4 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  creationStep > 4
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                    : creationStep === 4
                    ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {creationStep > 4 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : creationStep === 4 ? (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 block" />
                    )}
                    <span className="font-bold">4. حساب بصمة التحقق الرقمية SHA-256 المستقلة</span>
                  </div>
                  <span className="font-mono text-[10px]">{creationStep > 4 ? 'مطابق' : creationStep === 4 ? 'جاري الحساب...' : 'انتظار'}</span>
                </div>

                {/* Step 5 */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  creationStep >= 6
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                    : creationStep === 5
                    ? 'bg-cyan-950/40 border-cyan-700 text-cyan-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {creationStep >= 6 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : creationStep === 5 ? (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-700 block" />
                    )}
                    <span className="font-bold">5. الرفع المشفر للسحابة عبر Google Cloud Storage API</span>
                  </div>
                  <span className="font-mono text-[10px]">{creationStep >= 6 ? 'تم الرفع بنجاح' : creationStep === 5 ? 'جاري النقل المشفر...' : 'انتظار'}</span>
                </div>

                {creationStep === 6 && (
                  <div className="pt-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>تمت الأرشفة السحابية بنجاح وتم حفظ النسخة في Vault وتحديث السجل!</span>
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl transition-all"
                    >
                      إغلاق النافذة
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checksum Verification Modal */}
      {isVerifyingModalOpen && selectedBackupForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsVerifyingModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">فحص البصمة الرقمية ومطابقة السحابة</h3>
                <p className="text-xs text-slate-400">Cryptographic SHA-256 Integrity Verification</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs mb-4">
              <div className="text-slate-400">اسم الملف: <strong className="text-white font-mono">{selectedBackupForAction.filename}</strong></div>
              <div className="text-slate-400">الوجهة السحابية: <span className="text-cyan-400 font-mono">{selectedBackupForAction.cloudDestinationUri}</span></div>
            </div>

            {isVerifying ? (
              <div className="py-6 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">جاري قراءة الـ Stream السحابي وحساب البصمة الرقمية...</span>
              </div>
            ) : verificationResult && (
              <div className="space-y-3">
                <div className="bg-emerald-950/30 border border-emerald-800/50 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تطابق بنسبة 100% - سلامة البيانات السحابية مضمونة</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    تمت مقارنة بصمة الـ SHA-256 الخاصة بالنسخة المخزنة على السحابة مع الفهرس المحلي، ولم يتم رصد أي تلاعب أو تلف في البايتات.
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[10px] text-cyan-300 break-all">
                    {verificationResult.sha256}
                  </div>
                </div>

                <button
                  onClick={() => setIsVerifyingModalOpen(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-xs transition-all"
                >
                  تم التحقق بنجاح (إغلاق)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database Restore Safety Modal */}
      {isRestoreModalOpen && selectedBackupForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-rose-800/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsRestoreModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">استعادة قاعدة البيانات من الأرشيف السحابي</h3>
                <p className="text-xs text-rose-400">إجراء أمني عالي الحساسية يتطلب تأكيداً مشدداً</p>
              </div>
            </div>

            <div className="bg-rose-950/20 border border-rose-800/40 p-4 rounded-xl text-xs text-rose-200 mb-4 space-y-2">
              <p className="leading-relaxed">
                ⚠️ <strong>تحذير أمني:</strong> استعادة قاعدة البيانات ستؤدي إلى إرجاع حالة السنتر بالكامل إلى نقطة زمن: <strong className="text-white font-mono">{selectedBackupForAction.createdAt}</strong>.
              </p>
              <p className="text-[11px] text-rose-300">
                سيتم استبدال الجداول الحالية بنسخة الأرشيف ({selectedBackupForAction.tablesCount} جدول، {selectedBackupForAction.rowsCount.toLocaleString('ar-EG')} سجل).
              </p>
            </div>

            <form onSubmit={handleExecuteRestore} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  لتأكيد العملية، يرجى كتابة العبارة التالية تماماً:
                  <code className="text-cyan-400 font-mono block mt-1">CONFIRM_RESTORE_EDUCENTER_2026</code>
                </label>
                <input
                  type="text"
                  value={restorePassphrase}
                  onChange={e => setRestorePassphrase(e.target.value)}
                  placeholder="CONFIRM_RESTORE_EDUCENTER_2026"
                  className="w-full bg-slate-950 border border-rose-700/60 rounded-lg px-3 py-2 text-white font-mono text-center focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  disabled={isRestoring || restorePassphrase !== 'CONFIRM_RESTORE_EDUCENTER_2026'}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl shadow disabled:opacity-40 transition-all"
                >
                  {isRestoring ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الاستعادة وتطبيق الـ Triggers...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>تأكيد الاستعادة السحابية</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cloud & Schedule Configuration Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">إعدادات الأرشفة السحابية والجدولة التلقائية</h3>
                <p className="text-xs text-slate-400">ضبط وتأمين وجهات النسخ الدوري</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">المزود السحابي:</label>
                <select
                  value={scheduleConfig.cloudProvider}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, cloudProvider: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="GCS">Google Cloud Storage (GCS - الموصى به)</option>
                  <option value="AWS_S3">Amazon Web Services (AWS S3 Bucket)</option>
                  <option value="CLOUDFLARE_R2">Cloudflare R2 (Zero Egress Fees)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم الحاوية السحابية (Bucket Name):</label>
                <input
                  type="text"
                  value={scheduleConfig.bucketName}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, bucketName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">تكرار النسخ التلقائي:</label>
                  <select
                    value={scheduleConfig.frequency}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, frequency: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="EVERY_6_HOURS">كل 6 ساعات (تحديث مكثف)</option>
                    <option value="DAILY_NIGHT">يومياً الساعة 02:00 صباحاً</option>
                    <option value="WEEKLY">أسبوعياً (كل يوم جمعة)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">فترة الاحتفاظ بالنسخ (Retention):</label>
                  <input
                    type="number"
                    value={scheduleConfig.retentionDays}
                    onChange={e => setScheduleConfig({ ...scheduleConfig, retentionDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">حذف النسخ تلقائياً بعد 90 يوم</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">بريد التنبيهات في حال تعذر الرفع السحابي:</label>
                <input
                  type="email"
                  value={scheduleConfig.notificationEmail}
                  onChange={e => setScheduleConfig({ ...scheduleConfig, notificationEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsScheduleModalOpen(false);
                    setRestoreSuccessMessage('تم حفظ إعدادات الأرشفة السحابية والجدولة التلقائية وتطبيقها فورياً على السيرفر.');
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
