import React, { useState } from 'react';
import {
  CheckCircle2,
  Send,
  MessageSquare,
  Edit3,
  Trash2,
  Plus,
  ExternalLink,
  Search,
  X,
  FileSpreadsheet,
  Printer,
  Sliders,
} from 'lucide-react';
import {
  ERPDatabaseState,
  WhatsAppDraft,
  MessageTemplateKey,
  erpStore,
  buildWhatsAppLink,
} from '../../lib/erp-store';
import { exportToExcel, exportToPdfReport } from '../../lib/export-engine';

interface SmartSuggestionInboxProps {
  state?: ERPDatabaseState;
}

const TEMPLATE_META: {
  key: MessageTemplateKey;
  title: string;
  desc: string;
}[] = [
  {
    key: 'ABSENCE',
    title: 'قالب إشعار الغياب عن الحصة',
    desc: 'يستخدم تلقائياً عند تسجيل غياب طالب فردياً أو جماعياً',
  },
  {
    key: 'OVERDUE_PAYMENT',
    title: 'قالب تذكير المصروفات المتأخرة',
    desc: 'يستخدم عند فحص مديونيات الطلاب المتبقية',
  },
  {
    key: 'INSTALLMENT_REMAINING',
    title: 'قالب إيصال القسط الجزئي والمتبقي',
    desc: 'يستخدم عند سداد الطالب لجزء من الاشتراك وتبقي قسط',
  },
  {
    key: 'SESSION_CANCEL',
    title: 'قالب إلغاء أو تأجيل حصة',
    desc: 'يستخدم عند إشعار المجموعة بإلغاء حصة اليوم',
  },
  {
    key: 'SESSION_RESCHEDULE',
    title: 'قالب تغيير موعد حصة',
    desc: 'يستخدم عند تعديل موعد أو قاعة المجموعة',
  },
];

const SMART_VARIABLES: { token: string; label: string }[] = [
  { token: '{studentName}', label: 'اسم الطالب' },
  { token: '{parentName}', label: 'اسم ولي الأمر' },
  { token: '{groupName}', label: 'اسم المجموعة' },
  { token: '{subject}', label: 'المادة' },
  { token: '{teacherName}', label: 'اسم المدرس' },
  { token: '{amount}', label: 'المبلغ المسدد' },
  { token: '{remainingAmount}', label: 'المبلغ المتبقي' },
  { token: '{currency}', label: 'العملة' },
  { token: '{centerName}', label: 'اسم السنتر' },
];

export default function SmartSuggestionInbox({
  state: propState,
}: SmartSuggestionInboxProps) {
  const [internalState, setInternalState] = useState<ERPDatabaseState>(() =>
    erpStore.getState()
  );
  const state = propState || internalState;

  React.useEffect(() => {
    if (propState) return;
    return erpStore.subscribe(setInternalState);
  }, [propState]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PENDING' | 'APPROVED_SENT' | 'REJECTED'
  >('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [activeTemplateKey, setActiveTemplateKey] =
    useState<MessageTemplateKey>('ABSENCE');
  const [templateDraftText, setTemplateDraftText] = useState<string>(
    state.config.messageTemplates.ABSENCE
  );

  const [customForm, setCustomForm] = useState({
    studentId: state.students[0]?.id || '',
    title: 'تنبيه إداري لولي الأمر',
    draftMessage: '',
  });
  const [notice, setNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const pendingDrafts = state.suggestions.filter((s) => s.status === 'PENDING');
  const approvedDrafts = state.suggestions.filter(
    (s) => s.status === 'APPROVED_SENT'
  );

  const filteredSuggestions = state.suggestions.filter((sug) => {
    if (statusFilter !== 'ALL' && sug.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sug.studentName.toLowerCase().includes(q) ||
      sug.parentName.toLowerCase().includes(q) ||
      sug.title.toLowerCase().includes(q) ||
      sug.phone.includes(q)
    );
  });

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    const visiblePendingIds = filteredSuggestions
      .filter((s) => s.status === 'PENDING')
      .map((s) => s.id);
    if (
      visiblePendingIds.length > 0 &&
      visiblePendingIds.every((id) => selectedIds.includes(id))
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visiblePendingIds);
    }
  };

  const handleApproveSelected = () => {
    if (selectedIds.length === 0) return;
    erpStore.approveSuggestions(selectedIds);
    showToast(
      `تمت الموافقة واعتماد إرسال ${selectedIds.length} رسالة محددة بنجاح.`
    );
    setSelectedIds([]);
  };

  const handleRejectSelected = () => {
    if (selectedIds.length === 0) return;
    erpStore.rejectSuggestions(selectedIds);
    showToast(`تم استبعاد ${selectedIds.length} مقترح من قائمة الإرسال.`);
    setSelectedIds([]);
  };

  const handleGenerateOverdueReminders = () => {
    const { addedCount } = erpStore.generateOverduePaymentSuggestions();
    if (addedCount > 0) {
      showToast(
        `تم فحص مديونيات وأقساط الطلاب وتوليد ${addedCount} مسودة تذكير جديدة للمراجعة اليدوية.`
      );
    } else {
      showToast(
        'جميع الطلاب المتأخرين لديهم مسودات تذكير قيد المراجعة بالفعل.'
      );
    }
  };

  const handleSaveEditedMessage = (id: string) => {
    if (!editingMessageText.trim()) return;
    erpStore.updateSuggestionMessage(id, editingMessageText.trim());
    setEditingDraftId(null);
    showToast('تم حفظ تعديل نص الرسالة بنجاح.');
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateDraftText.trim()) return;
    erpStore.updateMessageTemplate(
      activeTemplateKey,
      templateDraftText.trim()
    );
    showToast(
      'تم حفظ قالب الرسالة الذكي بنجاح؛ سيتم تطبيقه على كافة الإشعارات القادمة.'
    );
  };

  const handleCreateCustomDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const st = state.students.find((s) => s.id === customForm.studentId);
    if (!st || !customForm.draftMessage.trim()) return;
    erpStore.addCustomSuggestion({
      triggerType: 'CUSTOM',
      title: customForm.title.trim() || 'إشعار خاص لولي الأمر',
      studentId: st.id,
      studentName: st.fullName,
      parentName: st.parentName,
      phone: st.parentPhone || st.phone,
      groupName: st.grade,
      draftMessage: customForm.draftMessage.trim(),
    });
    setShowCustomModal(false);
    setCustomForm({ ...customForm, draftMessage: '' });
    showToast(
      `تمت إضافة مسودة رسالة لولي أمر "${st.fullName}" في صندوق المراجعة.`
    );
  };

  const handleExportQueue = (format: 'EXCEL' | 'PDF') => {
    const cols = [
      { header: 'الحدث', key: 'title' },
      { header: 'الطالب', key: 'studentName' },
      { header: 'ولي الأمر', key: 'parentName' },
      { header: 'رقم الواتساب', key: 'phone' },
      { header: 'نص الرسالة', key: 'draftMessage' },
      { header: 'الحالة', key: 'status' },
    ];
    if (format === 'EXCEL') {
      exportToExcel('طابور_رسائل_الواتساب', cols, filteredSuggestions);
    } else {
      exportToPdfReport({
        title: 'بيان رسائل وإشعارات أولياء الأمور المعتمدة',
        subtitle: `${state.config.centerName}`,
        columns: cols,
        data: filteredSuggestions,
      });
    }
  };

  const getTriggerLabel = (type: WhatsAppDraft['triggerType']) => {
    switch (type) {
      case 'ABSENCE':
        return 'غياب حصة';
      case 'OVERDUE_PAYMENT':
        return 'تأخر مصروفات';
      case 'INSTALLMENT_REMAINING':
        return 'قسط متبقٍ';
      case 'SESSION_CANCEL':
        return 'إلغاء حصة';
      case 'SESSION_RESCHEDULE':
        return 'تعديل موعد';
      default:
        return 'تنبيه إداري';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            مركز الموافقات اليدوي للواتساب وقوالب الرسائل الذكية
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            ضمان 100% بعدم إرسال أي رسالة تلقائياً في الخلفية؛ راجع المسودات، عدل القوالب بالمتغيرات الذكية، واعتمد الإرسال يدوياً.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTemplateKey('ABSENCE');
              setTemplateDraftText(state.config.messageTemplates.ABSENCE);
              setShowTemplatesModal(true);
            }}
            className="px-3.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>تخصيص قوالب الرسائل الذكية</span>
          </button>

          <button
            onClick={handleGenerateOverdueReminders}
            className="px-3.5 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            توليد مسودات المتأخرين والأقساط
          </button>

          <button
            onClick={() => setShowCustomModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء مسودة رسالة جديدة</span>
          </button>

          <button
            onClick={() => handleExportQueue('EXCEL')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExportQueue('PDF')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {notice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-500 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Filter Bar & Bulk Selection Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none pl-3 border-l border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              checked={
                filteredSuggestions.filter((s) => s.status === 'PENDING')
                  .length > 0 &&
                filteredSuggestions
                  .filter((s) => s.status === 'PENDING')
                  .every((s) => selectedIds.includes(s.id))
              }
              onChange={toggleSelectAllFiltered}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span>تحديد الكل ({selectedIds.length} محدد)</span>
          </label>

          {/* Status Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                statusFilter === 'PENDING'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              بانتظار موافقة المدير ({pendingDrafts.length})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED_SENT')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                statusFilter === 'APPROVED_SENT'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              تم الاعتماد والإرسال ({approvedDrafts.length})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              الكل ({state.suggestions.length})
            </button>
          </div>
        </div>

        {/* Bulk Action Buttons or Search */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const targetIds =
                selectedIds.length > 0
                  ? selectedIds
                  : filteredSuggestions
                      .filter(
                        (s) =>
                          s.status === 'PENDING' && s.triggerType === 'ABSENCE'
                      )
                      .map((s) => s.id);
              if (targetIds.length === 0) {
                showToast('لا توجد إشعارات غياب معلقة حالياً؛ حدد أي رسالة للاعتماد.');
                return;
              }
              erpStore.approveSuggestions(targetIds);
              setSelectedIds([]);
              showToast(
                `تمت الموافقة واعتماد إرسال ${targetIds.length} إشعار غياب لأولياء الأمور بنجاح.`
              );
            }}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              موافقة وإرسال إشعارات الغياب للمحدد (
              {selectedIds.length > 0
                ? selectedIds.length
                : filteredSuggestions.filter(
                    (s) => s.status === 'PENDING' && s.triggerType === 'ABSENCE'
                  ).length}
              )
            </span>
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleRejectSelected}
              className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              رفض المحدد
            </button>
          )}

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الطالب أو ولي الأمر..."
              className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Suggestions Cards List */}
      {filteredSuggestions.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            لا توجد مسودات رسائل في هذا القسم حالياً
          </p>
          <p className="text-xs text-slate-500">
            عند تسجيل غياب طالب أو تحصيل قسط متبقٍ أو إلغاء حصة ستظهر المسودة هنا تلقائياً لمراجعتها.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuggestions.map((sug) => {
            const isSelected = selectedIds.includes(sug.id);
            const isEditing = editingDraftId === sug.id;

            return (
              <div
                key={sug.id}
                className={`p-5 rounded-xl border transition-colors ${
                  isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-950/25 border-blue-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {sug.status === 'PENDING' && (
                      <input
                        type="checkbox"
                        aria-label={`تحديد رسالة ولي أمر ${sug.studentName}`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(sug.id)}
                        className="mt-1 w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    )}
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {getTriggerLabel(sug.triggerType)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{sug.groupName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{sug.createdAt}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            sug.status === 'APPROVED_SENT'
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : sug.status === 'REJECTED'
                              ? 'text-rose-600 font-semibold'
                              : 'text-amber-600 dark:text-amber-400 font-semibold'
                          }
                        >
                          {sug.status === 'APPROVED_SENT'
                            ? 'تم الاعتماد والإرسال'
                            : sug.status === 'REJECTED'
                            ? 'مرفوضة'
                            : 'بانتظار موافقة المدير'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {sug.title} — الطالب: {sug.studentName}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
                        ولي الأمر: <strong>{sug.parentName}</strong> · رقم الواتساب:{' '}
                        <span className="font-mono">{sug.phone}</span>
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={buildWhatsAppLink(sug.phone, sug.draftMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (sug.status === 'PENDING') {
                          erpStore.approveSuggestions([sug.id]);
                        }
                      }}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>موافقة وإرسال واتساب</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => {
                        setEditingDraftId(sug.id);
                        setEditingMessageText(sug.draftMessage);
                      }}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل النص</span>
                    </button>

                    <button
                      onClick={() => {
                        erpStore.deleteSuggestion(sug.id);
                        showToast('تم حذف المسودة من الصندوق.');
                      }}
                      aria-label={`حذف مسودة ${sug.studentName}`}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Draft Message Content or Inline Editor */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editingMessageText}
                        onChange={(e) => setEditingMessageText(e.target.value)}
                        className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-blue-500 text-sm text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingDraftId(null)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          إلغاء
                        </button>
                        <button
                          onClick={() => handleSaveEditedMessage(sug.id)}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          حفظ نص الرسالة
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                      {sug.draftMessage}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Smart Message Templates Editor */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تخصيص قوالب رسائل الواتساب التلقائية بالمتغيرات الذكية
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  عدل صياغة الرسائل التي يجهزها النظام عند الغياب أو الأقساط أو تأجيل الحصص
                </p>
              </div>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختر نوع الحدث / القالب المراد تعديله
                </label>
                <select
                  value={activeTemplateKey}
                  onChange={(e) => {
                    const nextKey = e.target.value as MessageTemplateKey;
                    setActiveTemplateKey(nextKey);
                    setTemplateDraftText(
                      state.config.messageTemplates[nextKey] || ''
                    );
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                >
                  {TEMPLATE_META.map((tm) => (
                    <option key={tm.key} value={tm.key}>
                      {tm.title} — ({tm.desc})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    نص القالب (اضغط على المتغيرات لإدراجها في النص)
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SMART_VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() =>
                        setTemplateDraftText((prev) => `${prev} ${v.token}`)
                      }
                      className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-mono cursor-pointer"
                    >
                      + {v.label} {v.token}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={4}
                  required
                  value={templateDraftText}
                  onChange={(e) => setTemplateDraftText(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTemplatesModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  حفظ واعتماد القالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Custom WhatsApp Draft */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إنشاء مسودة رسالة جديدة لولي أمر
              </h3>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomDraft} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اختر الطالب
                </label>
                <select
                  value={customForm.studentId}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, studentId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                >
                  {state.students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} — ولي الأمر: {st.parentName} (
                      {st.parentPhone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الإشعار
                </label>
                <input
                  type="text"
                  required
                  value={customForm.title}
                  onChange={(e) =>
                    setCustomForm({ ...customForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نص الرسالة المقترحة
                </label>
                <textarea
                  rows={4}
                  required
                  value={customForm.draftMessage}
                  onChange={(e) =>
                    setCustomForm({
                      ...customForm,
                      draftMessage: e.target.value,
                    })
                  }
                  placeholder="اكتب نص الرسالة المراد مراجعتها وإرسالها لولي الأمر..."
                  className="w-full p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
                >
                  إضافة لصندوق المراجعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
