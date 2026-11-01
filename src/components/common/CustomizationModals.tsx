import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  CustomFieldDefinition,
  CustomFieldEntity,
  CustomFieldType,
  ERPDatabaseState,
  erpStore,
} from '../../lib/erp-store';

const ENTITY_NAMES_AR: Record<CustomFieldEntity, string> = {
  student: 'شاشة الطلاب',
  teacher: 'شاشة المدرسين',
  group: 'شاشة المجموعات الدراسية',
  expense: 'شاشة المصروفات والخزينة',
  staff: 'شاشة الموظفين',
};

const FIELD_TYPE_LABELS_AR: Record<CustomFieldType, string> = {
  text: 'نص حر (Text)',
  number: 'رقم (Number)',
  date: 'تاريخ (Date)',
  select: 'قائمة منسدلة (Dropdown)',
};

interface CustomFieldBuilderModalProps {
  entity: CustomFieldEntity;
  customFields: CustomFieldDefinition[];
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function CustomFieldBuilderModal({
  entity,
  customFields,
  onClose,
  onSuccess,
}: CustomFieldBuilderModalProps) {
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [optionsText, setOptionsText] = useState('');
  const [placeholder, setPlaceholder] = useState('');

  const entityFields = customFields.filter((f) => f.entity === entity);

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;

    const parsedOptions =
      fieldType === 'select'
        ? optionsText
            .split(/[،,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    erpStore.addCustomField({
      entity,
      label: label.trim(),
      type: fieldType,
      options:
        fieldType === 'select' && (!parsedOptions || parsedOptions.length === 0)
          ? ['خيار 1', 'خيار 2']
          : parsedOptions,
      placeholder: placeholder.trim() || undefined,
    });

    const addedName = label.trim();
    setLabel('');
    setOptionsText('');
    setPlaceholder('');
    if (onSuccess) {
      onSuccess(
        `تمت إضافة الحقل المخصص "${addedName}" إلى ${ENTITY_NAMES_AR[entity]} وظهر فوراً في الجداول والنماذج.`
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                محرك الحقول المخصصة — {ENTITY_NAMES_AR[entity]}
              </h3>
              <p className="text-xs text-slate-500">
                أضف أي حقل جديد بدون برمجة ليظهر فوراً في الجدول ونموذج الإدخال والتقارير
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleAddField}
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3.5"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              اسم الحقل الجديد
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: ولي أمر بديل، ملاحظات صحية، طريقة الدفع المفضلة..."
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نوع الحقل
              </label>
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as CustomFieldType)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="text">نص (Text)</option>
                <option value="number">رقم (Number)</option>
                <option value="date">تاريخ (Date)</option>
                <option value="select">قائمة منسدلة (Dropdown)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نص توضيحي (اختياري)
              </label>
              <input
                type="text"
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="يظهر داخل خانة الإدخال..."
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {fieldType === 'select' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                خيارات القائمة المنسدلة (افصل بينها بفاصلة ،)
              </label>
              <input
                type="text"
                required
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="مثال: نقدي، إنستا باي، فودافون كاش"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة الحقل وتفعيله فوراً في الجداول والنماذج</span>
          </button>
        </form>

        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            الحقول المخصصة الحالية في {ENTITY_NAMES_AR[entity]} ({entityFields.length})
          </div>
          {entityFields.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              لا توجد حقول مخصصة مضافة لهذا القسم بعد.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {entityFields.map((field) => (
                <div
                  key={field.id}
                  className="p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {field.label}
                    </span>
                    <span className="mr-2 text-slate-500">
                      ({FIELD_TYPE_LABELS_AR[field.type]})
                    </span>
                    {field.type === 'select' && field.options && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        الخيارات: {field.options.join(' · ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      erpStore.deleteCustomField(field.id);
                      if (onSuccess) {
                        onSuccess(`تم حذف الحقل المخصص "${field.label}".`);
                      }
                    }}
                    aria-label={`حذف الحقل ${field.label}`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="حذف الحقل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

interface DynamicCustomFieldsInputGridProps {
  entity: CustomFieldEntity;
  customFields: CustomFieldDefinition[];
  values?: Record<string, string>;
  onChange: (nextValues: Record<string, string>) => void;
}

export function DynamicCustomFieldsInputGrid({
  entity,
  customFields,
  values = {},
  onChange,
}: DynamicCustomFieldsInputGridProps) {
  const fields = customFields.filter((f) => f.entity === entity);
  if (fields.length === 0) return null;

  const handleFieldChange = (fieldId: string, val: string) => {
    onChange({
      ...values,
      [fieldId]: val,
    });
  };

  return (
    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>الحقول المخصصة الإضافية ({fields.length})</span>
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((field) => {
          const currentVal = values[field.id] ?? '';
          return (
            <div key={field.id}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={currentVal}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- اختر {field.label} --</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={currentVal}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder || `أدخل ${field.label}...`}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface CategoryManagerModalProps {
  state: ERPDatabaseState;
  initialTab?: 'grades' | 'subjects' | 'expenseCategories';
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export function CategoryManagerModal({
  state,
  initialTab = 'grades',
  onClose,
  onSuccess,
}: CategoryManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'grades' | 'subjects' | 'expenseCategories'>(
    initialTab
  );
  const [newItemValue, setNewItemValue] = useState('');
  const [editingItem, setEditingItem] = useState<{
    original: string;
    current: string;
  } | null>(null);

  const currentItems = state.config[activeTab] || [];

  const tabMeta = {
    grades: {
      title: 'المراحل الدراسية',
      placeholder: 'مثال: الصف الأول الإعدادي، الشهادة الثانوية الأزهرية...',
    },
    subjects: {
      title: 'المواد العلمية',
      placeholder: 'مثال: الجيولوجيا، اللغة الفرنسية، الفلسفة والمنطق...',
    },
    expenseCategories: {
      title: 'بنود وتصنيفات المصروفات',
      placeholder: 'مثال: فواتير الإنترنت، مكافآت الامتحانات، أدوات مكتبية...',
    },
  }[activeTab];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemValue.trim()) return;
    erpStore.addCategoryItem(activeTab, newItemValue.trim());
    const added = newItemValue.trim();
    setNewItemValue('');
    if (onSuccess) {
      onSuccess(`تمت إضافة "${added}" إلى ${tabMeta.title} وانعكست على النظام فوراً.`);
    }
  };

  const handleSaveRename = (original: string) => {
    if (!editingItem || !editingItem.current.trim()) return;
    erpStore.updateCategoryItem(activeTab, original, editingItem.current.trim());
    setEditingItem(null);
    if (onSuccess) {
      onSuccess(`تم تعديل المسمى وتحديث جميع السجلات المرتبطة به تلقائياً.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                إدارة وتعديل التصنيفات والأقسام بلا قيود
              </h3>
              <p className="text-xs text-slate-500">
                أضف أو عدل أو احذف أي مرحلة أو مادة أو بند مصروفات فـي أي ثانية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Type Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('grades');
              setEditingItem(null);
            }}
            className={`py-2 px-2 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'grades'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            المراحل ({state.config.grades.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('subjects');
              setEditingItem(null);
            }}
            className={`py-2 px-2 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            المواد ({state.config.subjects.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('expenseCategories');
              setEditingItem(null);
            }}
            className={`py-2 px-2 rounded-md font-semibold transition-colors cursor-pointer ${
              activeTab === 'expenseCategories'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            بنود المصروفات ({state.config.expenseCategories.length})
          </button>
        </div>

        {/* Add New Category Item */}
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            required
            value={newItemValue}
            onChange={(e) => setNewItemValue(e.target.value)}
            placeholder={tabMeta.placeholder}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فورية</span>
          </button>
        </form>

        {/* List of Items */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg max-h-64 overflow-y-auto">
          {currentItems.map((item) => {
            const isEditing = editingItem?.original === item;
            return (
              <div
                key={item}
                className="p-3 flex items-center justify-between gap-2 text-sm"
              >
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingItem.current}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          current: e.target.value,
                        })
                      }
                      className="flex-1 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-blue-500 text-xs text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRename(item)}
                      className="p-1.5 rounded bg-emerald-600 text-white cursor-pointer"
                      title="حفظ التعديل"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="p-1.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {item}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingItem({ original: item, current: item })
                        }
                        className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                        title="تعديل الاسم"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          erpStore.deleteCategoryItem(activeTab, item);
                          if (onSuccess) {
                            onSuccess(`تم حذف "${item}" من ${tabMeta.title}.`);
                          }
                        }}
                        disabled={currentItems.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
          >
            تم وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
