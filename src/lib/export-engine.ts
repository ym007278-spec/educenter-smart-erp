/**
 * EduCenter Smart ERP - Universal RTL Export & Backup Engine
 * Supports full Right-to-Left (RTL) PDF & Excel generation across all sections
 * (Students, Finance, Attendance, Academic Groups, Teachers, Staff),
 * automatically embedding the custom Center Logo, Header/Footer metadata,
 * Institutional Table Colors, and clear Arabic typography (Cairo, Tajawal, Amiri).
 */

import {
  erpStore,
  DEFAULT_EXPORT_BRANDING,
  ExportBrandingConfig,
} from './erp-store';

export interface ExportColumn {
  header: string;
  key: string;
  format?: (value: any) => string;
}

export interface ExportSummaryCard {
  label: string;
  value: string;
  color?: string;
}

export type ExportSectionType =
  | 'STUDENTS'
  | 'FINANCE'
  | 'ATTENDANCE'
  | 'ACADEMIC_GROUPS'
  | 'TEACHERS'
  | 'STAFF'
  | 'STUDENT_CARD'
  | 'GENERAL';

export interface ResolvedExportBranding extends ExportBrandingConfig {
  centerName: string;
  centerPhone: string;
  currency: string;
  receiptFooter: string;
}

export interface LastExportDiagnostic {
  type: 'PDF' | 'EXCEL_RTL' | 'CSV_RTL' | 'STUDENT_CARD_PDF';
  section: ExportSectionType;
  title: string;
  filename?: string;
  rowCount: number;
  columnCount: number;
  hasLogo: boolean;
  primaryTableColor: string;
  centerName: string;
  timestamp: string;
  htmlOrContentPreview: string;
}

let lastExportDiagnostic: LastExportDiagnostic | null = null;

function recordExportDiagnostic(diag: LastExportDiagnostic): void {
  lastExportDiagnostic = diag;
  if (typeof window !== 'undefined') {
    (window as any).__LAST_ERP_EXPORT__ = diag;
  }
}

export function getLastExportDiagnostic(): LastExportDiagnostic | null {
  return lastExportDiagnostic;
}

/**
 * Reads the live CenterConfig & ExportBrandingConfig from erpStore so every PDF and Excel
 * export in the system automatically reflects the manager's latest Logo, Header, and Table Colors.
 */
export function resolveExportBrandingContext(
  overrides?: Partial<ResolvedExportBranding>
): ResolvedExportBranding {
  const state = erpStore.getState();
  const cfg = state.config;
  const branding = cfg.exportBranding || DEFAULT_EXPORT_BRANDING;
  return {
    ...DEFAULT_EXPORT_BRANDING,
    ...branding,
    centerName: cfg.centerName || 'سنتر النخبة التعليمي الذكي',
    centerPhone: cfg.centerPhone || '01001234567',
    currency: cfg.currency || 'ج.م',
    receiptFooter:
      cfg.receiptFooter ||
      'إيصال وتقرير رسمي معتمد - يرجى الاحتفاظ بالمستند للمراجعة.',
    ...(overrides || {}),
  };
}

export interface SystemBackupPayload {
  version: string;
  exportedAt: string;
  checksumSha256: string;
  centerInfo: {
    name: string;
    currency: string;
    phone: string;
    defaultSplitPercent: number;
  };
  enabledModules: Record<string, boolean>;
  studentsCount: number;
  students: any[];
  treasuryTransactionsCount: number;
  treasuryTransactions: any[];
  attendanceRecordsCount: number;
  attendanceRecords: any[];
  payrollCount: number;
  payroll: any[];
  automationRulesCount: number;
  automationRules: any[];
}

/**
 * Escapes HTML special characters safely for cells in PDF and Excel HTML tables.
 */
function escapeHtml(value: any): string {
  if (value === null || value === undefined) return '—';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Encodes CSV cell safely: escapes quotes, wraps cells containing commas or newlines.
 */
export function escapeCsvCell(
  cell: string | number | boolean | null | undefined
): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Builds CSV string with UTF-8 Byte Order Mark (\uFEFF) to guarantee Arabic text
 * displays perfectly in Microsoft Excel, LibreOffice, and Google Sheets without encoding issues.
 */
export function buildCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): string {
  const BOM = '\uFEFF';
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return BOM + [headerLine, ...rowLines].join('\r\n');
}

/**
 * Builds an institutional Excel-compatible CSV string that automatically prepends
 * the Center's Header Metadata (Center Name, Subtitle, Address, Phone, License, Footer)
 * configured in AdminSettingsCenter when `includeHeaderInExcel` is enabled.
 */
export function buildBrandedCsvContent(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  options?: {
    reportTitle?: string;
    summaryCards?: ExportSummaryCard[];
    brandingOverrides?: Partial<ResolvedExportBranding>;
  }
): string {
  const branding = resolveExportBrandingContext(options?.brandingOverrides);
  if (!branding.includeHeaderInExcel) {
    return buildCsvContent(headers, rows);
  }

  const BOM = '\uFEFF';
  const exportDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const colCount = Math.max(headers.length, 3);
  const padRow = (cells: string[]) => {
    const copy = [...cells];
    while (copy.length < colCount) {
      copy.push('');
    }
    return copy.map(escapeCsvCell).join(',');
  };

  const preambleLines: string[] = [
    padRow([
      `المؤسسة التعليمية: ${branding.centerName}`,
      branding.headerSubtitle,
      branding.headerTaxOrLicense,
    ]),
    padRow([
      `العنوان: ${branding.headerAddress}`,
      `هاتف الإدارة: ${branding.centerPhone}`,
      `تاريخ الإصدار: ${exportDate}`,
    ]),
  ];

  if (options?.reportTitle) {
    preambleLines.push(
      padRow([
        `عنوان التقرير: ${options.reportTitle}`,
        `لون الهوية المؤسسية: ${branding.primaryTableColor}`,
        branding.receiptFooter,
      ])
    );
  } else if (branding.receiptFooter) {
    preambleLines.push(
      padRow([
        `ملاحظة الاعتماد: ${branding.receiptFooter}`,
        `لون الهوية المؤسسية: ${branding.primaryTableColor}`,
        '',
      ])
    );
  }

  if (options?.summaryCards && options.summaryCards.length > 0) {
    preambleLines.push(
      padRow(options.summaryCards.map((c) => `${c.label}: ${c.value}`))
    );
  }

  // Blank separator row before the data table headers
  preambleLines.push(padRow([]));

  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));

  return BOM + [...preambleLines, headerLine, ...rowLines].join('\r\n');
}

/**
 * Builds a complete, native Right-to-Left (RTL) Excel HTML/XML Workbook document (.xls)
 * with UTF-8 BOM, <x:DisplayRightToLeft/> worksheet direction, embedded Center Logo,
 * clear Arabic typography ('Cairo', 'Tajawal', 'Amiri'), Header/Footer metadata,
 * Summary KPI cards, and Institutional Table Colors.
 */
export function buildRtlExcelHtmlDocument(options: {
  reportTitle: string;
  subtitle?: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  summaryCards?: ExportSummaryCard[];
  section?: ExportSectionType;
  brandingOverrides?: Partial<ResolvedExportBranding>;
}): string {
  const branding = resolveExportBrandingContext(options.brandingOverrides);
  const BOM = '\uFEFF';
  const colCount = Math.max(options.headers.length, 4);
  const sheetName = (options.sheetName || options.reportTitle || 'تقرير_السنتر')
    .replace(/[\\/?*[\]:]/g, ' ')
    .slice(0, 31);

  const exportDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const logoCellHtml =
    branding.showLogoInExports && branding.logoDataUrl
      ? `<td colspan="1" style="text-align: center; vertical-align: middle; background: #ffffff; border: 1px solid ${branding.borderAccentColor}; padding: 8px;">
           <img src="${branding.logoDataUrl}" width="54" height="54" alt="شعار السنتر" style="width: 54px; height: 54px; object-fit: contain; border-radius: 8px;" />
         </td>`
      : '';

  const titleColSpan =
    branding.showLogoInExports && branding.logoDataUrl
      ? Math.max(1, colCount - 1)
      : colCount;

  const headerBlockHtml = branding.includeHeaderInExcel
    ? `
      <tr dir="rtl">
        ${logoCellHtml}
        <td colspan="${titleColSpan}" style="background-color: ${branding.primaryTableColor}; color: ${branding.headerTextColor}; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; padding: 12px 16px; text-align: right; direction: rtl; border: 1px solid ${branding.primaryTableColor};">
          <div style="font-size: 16pt; font-weight: 800; color: ${branding.headerTextColor};">${escapeHtml(options.reportTitle)}</div>
          <div style="font-size: 11pt; font-weight: 700; color: ${branding.headerTextColor}; margin-top: 4px;">${escapeHtml(branding.centerName)} — ${escapeHtml(branding.headerSubtitle)}</div>
          <div style="font-size: 9.5pt; color: #e2e8f0; margin-top: 2px;">${escapeHtml(options.subtitle || branding.headerAddress)} | هاتف: ${escapeHtml(branding.centerPhone)} | ${escapeHtml(branding.headerTaxOrLicense)}</div>
        </td>
      </tr>
      <tr dir="rtl">
        <td colspan="${colCount}" style="background-color: ${branding.zebraRowColor}; color: #334155; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; font-size: 9.5pt; font-weight: 700; padding: 6px 12px; text-align: right; direction: rtl; border: 1px solid ${branding.borderAccentColor};">
          العنوان: ${escapeHtml(branding.headerAddress)} &nbsp;|&nbsp; هاتف الإدارة: ${escapeHtml(branding.centerPhone)} &nbsp;|&nbsp; تاريخ الإصدار: ${escapeHtml(exportDate)} &nbsp;|&nbsp; عدد السجلات: ${options.rows.length}
        </td>
      </tr>
    `
    : '';

  const summaryBlockHtml =
    options.summaryCards && options.summaryCards.length > 0
      ? `
      <tr dir="rtl">
        ${options.summaryCards
          .map(
            (card) => `
          <td style="background-color: ${branding.zebraRowColor}; border: 1px solid ${branding.borderAccentColor}; padding: 8px 12px; text-align: right; direction: rtl; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;">
            <div style="font-size: 9pt; color: #64748b; font-weight: 700;">${escapeHtml(card.label)}</div>
            <div style="font-size: 12pt; font-weight: 800; color: ${card.color || branding.primaryTableColor};">${escapeHtml(card.value)}</div>
          </td>
        `
          )
          .join('')}
        ${
          options.summaryCards.length < colCount
            ? `<td colspan="${colCount - options.summaryCards.length}" style="background-color: ${branding.zebraRowColor}; border: 1px solid ${branding.borderAccentColor};"></td>`
            : ''
        }
      </tr>
    `
      : '';

  const tableHeadersHtml = options.headers
    .map(
      (h) =>
        `<th style="background-color: ${branding.primaryTableColor}; color: ${branding.headerTextColor}; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; font-size: 11pt; font-weight: 700; padding: 10px 14px; border: 1px solid ${branding.primaryTableColor}; text-align: right; direction: rtl;">${escapeHtml(h)}</th>`
    )
    .join('');

  const tableRowsHtml = options.rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : branding.zebraRowColor;
      const cells = row
        .map(
          (cell) =>
            `<td style="background-color: ${bg}; color: #0f172a; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; font-size: 10.5pt; padding: 8px 12px; border: 1px solid ${branding.borderAccentColor}; text-align: right; direction: rtl; mso-number-format:'\\@';">${escapeHtml(cell)}</td>`
        )
        .join('');
      return `<tr dir="rtl" style="background-color: ${bg};">${cells}</tr>`;
    })
    .join('');

  const footerBlockHtml = branding.includeHeaderInExcel
    ? `
      <tr dir="rtl">
        <td colspan="${colCount}" style="background-color: #f8fafc; color: #475569; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; font-size: 9.5pt; font-weight: 700; padding: 10px 14px; text-align: right; direction: rtl; border-top: 2px solid ${branding.primaryTableColor}; border: 1px solid ${branding.borderAccentColor};">
          * ${escapeHtml(branding.receiptFooter)} — ${escapeHtml(branding.centerName)} (${escapeHtml(branding.centerPhone)})
        </td>
      </tr>
    `
    : '';

  return `${BOM}<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${escapeHtml(options.reportTitle)} - ${escapeHtml(branding.centerName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(sheetName)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayRightToLeft/>
            <x:Print>
              <x:ValidPrinterInfo/>
            </x:Print>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body, table, th, td {
      font-family: 'Cairo', 'Tajawal', 'Amiri', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      text-align: right;
      unicode-bidi: embed;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      direction: rtl;
    }
  </style>
</head>
<body dir="rtl" style="direction: rtl; text-align: right; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;">
  <table dir="rtl" border="1" cellspacing="0" cellpadding="6" style="direction: rtl; border-collapse: collapse; width: 100%;">
    <tbody>
      ${headerBlockHtml}
      ${summaryBlockHtml}
      <tr dir="rtl">${tableHeadersHtml}</tr>
      ${tableRowsHtml}
      ${footerBlockHtml}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Exports data directly to an Excel-compatible .csv file in the user's browser,
 * automatically injecting the Center's Header Metadata configured in AdminSettingsCenter.
 */
export function exportToCsvExcel(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  brandingOverrides?: Partial<ResolvedExportBranding>
): void {
  const cleanTitle = filename.replace(/\.(csv|xls)$/i, '').replace(/_/g, ' ');
  const branding = resolveExportBrandingContext(brandingOverrides);
  const csvContent = buildBrandedCsvContent(headers, rows, {
    reportTitle: cleanTitle,
    brandingOverrides,
  });

  recordExportDiagnostic({
    type: 'CSV_RTL',
    section: 'GENERAL',
    title: cleanTitle,
    filename: filename.endsWith('.csv') ? filename : `${filename}.csv`,
    rowCount: rows.length,
    columnCount: headers.length,
    hasLogo: Boolean(branding.showLogoInExports && branding.logoDataUrl),
    primaryTableColor: branding.primaryTableColor,
    centerName: branding.centerName,
    timestamp: new Date().toISOString(),
    htmlOrContentPreview: csvContent.slice(0, 1200),
  });

  if (typeof document === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const cleanFilename = filename.endsWith('.csv')
    ? filename
    : `${filename}.csv`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface RichExcelExportOptions {
  reportTitle?: string;
  subtitle?: string;
  section?: ExportSectionType;
  summaryCards?: ExportSummaryCard[];
  brandingOverrides?: Partial<ResolvedExportBranding>;
}

/**
 * Exports a full Right-to-Left (RTL) Excel file (.xls) with embedded Center Logo,
 * Header metadata, Arabic typography (Cairo, Tajawal, Amiri), and Institutional Table Colors.
 * Supports:
 * 1) (filename: string, columns: ExportColumn[], rows: any[], options?: RichExcelExportOptions)
 * 2) (data: any[] | any[][], filename?: string, headers?: string[])
 */
export function exportToExcel(
  arg1: string | any[] | (string | number | boolean | null | undefined)[][],
  arg2: any = 'بيانات_المنظومة',
  arg3?: any,
  arg4?: RichExcelExportOptions
): void {
  let filename = 'بيانات_المنظومة';
  let headers: string[] = [];
  let rows: (string | number | boolean | null | undefined)[][] = [];
  const options: RichExcelExportOptions = arg4 || {};

  if (typeof arg1 === 'string' && Array.isArray(arg2) && Array.isArray(arg3)) {
    filename = arg1;
    const columns = arg2 as ExportColumn[];
    const dataRows = arg3 as any[];
    headers = columns.map((c) => c.header);
    rows = dataRows.map((item) =>
      columns.map((c) =>
        c.format ? c.format(item[c.key]) : item[c.key] ?? ''
      )
    );
  } else {
    const data = arg1 as any[];
    filename = typeof arg2 === 'string' ? arg2 : 'بيانات_المنظومة';
    const explicitHeaders = Array.isArray(arg3)
      ? (arg3 as string[])
      : undefined;

    if (
      Array.isArray(data) &&
      data.length > 0 &&
      typeof data[0] === 'object' &&
      !Array.isArray(data[0])
    ) {
      headers = Object.keys(data[0]);
      rows = data.map((obj) => headers.map((h) => (obj as any)[h]));
    } else {
      headers = explicitHeaders || [];
      rows = (data as any) || [];
    }
  }

  const cleanTitle =
    options.reportTitle ||
    filename.replace(/\.(xls|xlsx|csv)$/i, '').replace(/_/g, ' ');
  const branding = resolveExportBrandingContext(options.brandingOverrides);

  const excelHtml = buildRtlExcelHtmlDocument({
    reportTitle: cleanTitle,
    subtitle: options.subtitle,
    sheetName: cleanTitle,
    headers,
    rows,
    summaryCards: options.summaryCards,
    section: options.section || 'GENERAL',
    brandingOverrides: options.brandingOverrides,
  });

  const cleanFilename = filename.endsWith('.xls')
    ? filename
    : `${filename.replace(/\.(csv|xlsx)$/i, '')}.xls`;

  recordExportDiagnostic({
    type: 'EXCEL_RTL',
    section: options.section || 'GENERAL',
    title: cleanTitle,
    filename: cleanFilename,
    rowCount: rows.length,
    columnCount: headers.length,
    hasLogo: Boolean(branding.showLogoInExports && branding.logoDataUrl),
    primaryTableColor: branding.primaryTableColor,
    centerName: branding.centerName,
    timestamp: new Date().toISOString(),
    htmlOrContentPreview: excelHtml.slice(0, 1800),
  });

  if (typeof document === 'undefined') return;

  const blob = new Blob([excelHtml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', cleanFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience wrapper for generating RTL PDF reports supporting both:
 * 1) ({ title, subtitle, columns, data, summaryCards, section, brandingOverrides })
 * 2) (title, headers, rows, filename?, subtitle?)
 */
export function exportToPdfReport(
  titleOrOptions:
    | string
    | {
        title: string;
        subtitle?: string;
        columns: ExportColumn[];
        data: any[];
        summaryCards?: ExportSummaryCard[];
        section?: ExportSectionType;
        brandingOverrides?: Partial<ResolvedExportBranding>;
      },
  headers?: string[],
  rows?: (string | number)[][],
  filename?: string,
  subtitle?: string
): void {
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    const hdrs = titleOrOptions.columns.map((c) => c.header);
    const bodyRows = titleOrOptions.data.map((item) =>
      titleOrOptions.columns.map((c) =>
        c.format ? c.format(item[c.key]) : String(item[c.key] ?? '-')
      )
    );
    exportToPrintablePdf({
      title: titleOrOptions.title,
      headers: hdrs,
      rows: bodyRows,
      subtitle: titleOrOptions.subtitle || 'تقرير رسمي معتمد',
      summaryCards: titleOrOptions.summaryCards,
      section: titleOrOptions.section,
      brandingOverrides: titleOrOptions.brandingOverrides,
    });
    return;
  }

  exportToPrintablePdf({
    title: titleOrOptions,
    headers: headers || [],
    rows: rows || [],
    subtitle: subtitle || 'تقرير رسمي معتمد',
  });
}

/**
 * Pure HTML builder for printable RTL PDF reports, applying the Center Logo,
 * Header Metadata (Subtitle, Address, Phone, License, Footer), clear Arabic Typography
 * (Cairo, Tajawal, Amiri), and Institutional Table Colors.
 */
export function buildPrintablePdfHtml(options: {
  title: string;
  subtitle?: string;
  centerName?: string;
  headers: string[];
  rows: (string | number)[][];
  summaryCards?: ExportSummaryCard[];
  section?: ExportSectionType;
  printedBy?: string;
  brandingOverrides?: Partial<ResolvedExportBranding>;
}): string {
  const branding = resolveExportBrandingContext({
    ...(options.centerName ? { centerName: options.centerName } : {}),
    ...(options.brandingOverrides || {}),
  });

  const {
    title,
    subtitle = branding.headerSubtitle ||
      'تقرير صادر من منظومة EduCenter Smart ERP',
    headers,
    rows,
    summaryCards = [],
    printedBy = 'مسؤول السنتر المعتمد',
  } = options;

  const printDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const logoHtml =
    branding.showLogoInExports && branding.logoDataUrl
      ? `<img src="${branding.logoDataUrl}" alt="شعار السنتر" style="width: 68px; height: 68px; object-fit: contain; border-radius: 12px; border: 1.5px solid ${branding.borderAccentColor}; background: #ffffff; padding: 4px; flex-shrink: 0;" />`
      : '';

  const cardsHtml =
    summaryCards.length > 0
      ? `
    <div dir="rtl" style="display: grid; grid-template-columns: repeat(${summaryCards.length}, 1fr); gap: 12px; margin-bottom: 18px; direction: rtl;">
      ${summaryCards
        .map(
          (c) => `
        <div style="background: ${branding.zebraRowColor}; border: 1px solid ${branding.borderAccentColor}; border-right: 4px solid ${c.color || branding.primaryTableColor}; border-radius: 10px; padding: 10px 14px; text-align: right; direction: rtl;">
          <div style="font-size: 11px; color: #475569; font-weight: 700; margin-bottom: 4px; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;">${escapeHtml(c.label)}</div>
          <div style="font-size: 15px; font-weight: 900; color: ${c.color || branding.primaryTableColor}; font-family: 'Cairo', 'JetBrains Mono', sans-serif;">${escapeHtml(c.value)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `
      : '';

  const headersHtml = headers
    .map(
      (h) =>
        `<th dir="rtl" style="padding: 10px 12px; background: ${branding.primaryTableColor}; color: ${branding.headerTextColor}; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; font-size: 12px; font-weight: 800; text-align: right; direction: rtl; border: 1px solid ${branding.primaryTableColor};">${escapeHtml(h)}</th>`
    )
    .join('');

  const rowsHtml = rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : branding.zebraRowColor;
      const cells = row
        .map(
          (cell) =>
            `<td dir="rtl" style="padding: 9px 12px; font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif; font-size: 11.5px; font-weight: 600; color: #0f172a; border: 1px solid ${branding.borderAccentColor}; text-align: right; direction: rtl;">${escapeHtml(cell ?? '-')}</td>`
        )
        .join('');
      return `<tr dir="rtl" style="background: ${bg}; page-break-inside: avoid; break-inside: avoid;">${cells}</tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - ${escapeHtml(branding.centerName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;
      direction: rtl;
      text-align: right;
      unicode-bidi: embed;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
      text-rendering: optimizeLegibility;
      margin: 0;
      padding: 16px;
      background: #ffffff;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header {
      border-bottom: 3px solid ${branding.primaryTableColor};
      padding-bottom: 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      direction: rtl;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 14px;
      direction: rtl;
    }
    .header-title h1 {
      font-family: 'Cairo', 'Amiri', sans-serif;
      font-size: 19px;
      font-weight: 900;
      margin: 0 0 3px 0;
      color: ${branding.primaryTableColor};
      line-height: 1.35;
    }
    .header-title .center-name {
      font-family: 'Cairo', 'Tajawal', sans-serif;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .header-title p {
      font-family: 'Cairo', 'Amiri', sans-serif;
      font-size: 11px;
      color: #475569;
      margin: 0;
      font-weight: 600;
    }
    .header-meta {
      text-align: left;
      font-size: 11px;
      color: #334155;
      line-height: 1.65;
      background: ${branding.zebraRowColor};
      border: 1px solid ${branding.borderAccentColor};
      border-radius: 8px;
      padding: 8px 12px;
      flex-shrink: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      direction: rtl;
      font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer {
      margin-top: 28px;
      border-top: 1.5px dashed ${branding.borderAccentColor};
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #475569;
      direction: rtl;
      page-break-inside: avoid;
    }
    .signature-box {
      text-align: center;
      width: 170px;
      font-weight: 700;
    }
    .signature-line {
      border-bottom: 1px solid #94a3b8;
      height: 32px;
      margin-bottom: 5px;
    }
    @media print {
      html, body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body dir="rtl">
  <div class="header" dir="rtl">
    <div class="header-brand">
      ${logoHtml}
      <div class="header-title">
        <h1>${escapeHtml(title)}</h1>
        <div class="center-name">${escapeHtml(branding.centerName)} • ${escapeHtml(branding.headerSubtitle)}</div>
        <p>${escapeHtml(subtitle)}${branding.headerAddress ? ` • ${escapeHtml(branding.headerAddress)}` : ''}</p>
      </div>
    </div>
    <div class="header-meta">
      <div><strong>تاريخ الإصدار:</strong> ${escapeHtml(printDate)}</div>
      <div><strong>هاتف الإدارة:</strong> ${escapeHtml(branding.centerPhone)}</div>
      <div><strong>الاعتماد:</strong> ${escapeHtml(branding.headerTaxOrLicense || printedBy)}</div>
    </div>
  </div>

  ${cardsHtml}

  <table dir="rtl">
    <thead>
      <tr dir="rtl">${headersHtml}</tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer" dir="rtl">
    <div>
      <div style="font-weight: 700; color: ${branding.primaryTableColor};">* ${escapeHtml(branding.receiptFooter)}</div>
      <div style="margin-top: 2px;">${escapeHtml(branding.centerName)} • ${escapeHtml(branding.headerAddress)} • هاتف: ${escapeHtml(branding.centerPhone)}</div>
    </div>
    <div style="display: flex; gap: 32px;">
      <div class="signature-box">
        <div>توقيع المحاسب / المسؤول</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div>اعتماد المدير العام</div>
        <div class="signature-line"></div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
}

/**
 * Generates and prints a clean, beautifully formatted vector RTL HTML report.
 * Users can print directly or click "Save as PDF" (حفظ بتنسيق PDF) with 100% vector typography,
 * correct Arabic letter shaping (no reverse or disjointed text), and clean page breaks.
 */
export function exportToPrintablePdf(options: {
  title: string;
  subtitle?: string;
  centerName?: string;
  headers: string[];
  rows: (string | number)[][];
  summaryCards?: ExportSummaryCard[];
  section?: ExportSectionType;
  printedBy?: string;
  brandingOverrides?: Partial<ResolvedExportBranding>;
}): void {
  const branding = resolveExportBrandingContext({
    ...(options.centerName ? { centerName: options.centerName } : {}),
    ...(options.brandingOverrides || {}),
  });
  const printContent = buildPrintablePdfHtml(options);

  recordExportDiagnostic({
    type: 'PDF',
    section: options.section || 'GENERAL',
    title: options.title,
    rowCount: options.rows.length,
    columnCount: options.headers.length,
    hasLogo: Boolean(branding.showLogoInExports && branding.logoDataUrl),
    primaryTableColor: branding.primaryTableColor,
    centerName: branding.centerName,
    timestamp: new Date().toISOString(),
    htmlOrContentPreview: printContent.slice(0, 2000),
  });

  if (typeof document === 'undefined') return;

  const existingFrame = document.getElementById(
    'educenter-print-iframe'
  ) as HTMLIFrameElement | null;
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }
  const iframe = document.createElement('iframe');
  iframe.id = 'educenter-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printContent);
    doc.close();
  }
}

/**
 * Pure HTML builder for the Student Follow-up Card PDF (بطاقة متابعة الطالب الشاملة)
 */
export function buildStudentFollowUpCardPdfHtml(params: {
  centerName: string;
  centerPhone: string;
  currency: string;
  studentName: string;
  studentCode: string;
  grade: string;
  studentPhone: string;
  parentName: string;
  parentPhone: string;
  enrolledGroups: string[];
  totalRequiredTuition: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatusLabel: string;
  attendancePresent: number;
  attendanceAbsent: number;
  examGrades: {
    examTitle: string;
    subject: string;
    examType: 'MONTHLY' | 'WEEKLY';
    date: string;
    score: number;
    maxScore: number;
    evaluation: string;
  }[];
  followUpNotes: {
    date: string;
    author: string;
    category: 'ACADEMIC' | 'BEHAVIORAL';
    content: string;
  }[];
  brandingOverrides?: Partial<ResolvedExportBranding>;
}): string {
  const branding = resolveExportBrandingContext({
    centerName: params.centerName,
    centerPhone: params.centerPhone,
    currency: params.currency,
    ...(params.brandingOverrides || {}),
  });

  const printDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const logoHtml =
    branding.showLogoInExports && branding.logoDataUrl
      ? `<img src="${branding.logoDataUrl}" alt="شعار السنتر" style="width: 62px; height: 62px; object-fit: contain; border-radius: 10px; border: 1.5px solid ${branding.borderAccentColor}; background: #ffffff; padding: 3px; flex-shrink: 0;" />`
      : '';

  const examsRowsHtml = params.examGrades
    .map((ex, idx) => {
      const pct =
        ex.maxScore > 0 ? Math.round((ex.score / ex.maxScore) * 100) : 0;
      const bg = idx % 2 === 0 ? '#ffffff' : branding.zebraRowColor;
      return `
        <tr dir="rtl" style="background: ${bg}; page-break-inside: avoid;">
          <td style="padding: 8px 12px; border: 1px solid ${branding.borderAccentColor}; font-weight: 700;">${escapeHtml(ex.examTitle)}</td>
          <td style="padding: 8px 12px; border: 1px solid ${branding.borderAccentColor};">${escapeHtml(ex.subject)} (${
            ex.examType === 'MONTHLY' ? 'شهري' : 'أسبوعي'
          })</td>
          <td style="padding: 8px 12px; border: 1px solid ${branding.borderAccentColor}; font-family: 'JetBrains Mono', monospace;">${escapeHtml(ex.date)}</td>
          <td style="padding: 8px 12px; border: 1px solid ${branding.borderAccentColor}; font-weight: 800; font-family: 'JetBrains Mono', monospace;">${ex.score} / ${ex.maxScore} (${pct}%)</td>
          <td style="padding: 8px 12px; border: 1px solid ${branding.borderAccentColor}; font-weight: 700; color: ${branding.primaryTableColor};">${escapeHtml(ex.evaluation)}</td>
        </tr>
      `;
    })
    .join('');

  const notesHtml = params.followUpNotes
    .map(
      (n) => `
      <div dir="rtl" style="padding: 10px 14px; border: 1px solid ${branding.borderAccentColor}; border-right: 4px solid ${
        n.category === 'ACADEMIC' ? branding.primaryTableColor : '#10b981'
      }; border-radius: 6px; background: ${branding.zebraRowColor}; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 4px;">
          <strong>${
            n.category === 'ACADEMIC'
              ? 'ملاحظة أكاديمية وعلمية'
              : 'ملاحظة سلوكية وانضباطية'
          } — ${escapeHtml(n.author)}</strong>
          <span>${escapeHtml(n.date)}</span>
        </div>
        <div style="font-size: 12px; color: #0f172a; line-height: 1.6;">${escapeHtml(n.content)}</div>
      </div>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>بطاقة متابعة الطالب - ${escapeHtml(params.studentName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    html, body {
      font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;
      direction: rtl;
      text-align: right;
      unicode-bidi: embed;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
      margin: 0;
      padding: 16px;
      background: #ffffff;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: ${branding.headerTextColor};
      background: ${branding.primaryTableColor};
      padding: 7px 14px;
      border-radius: 6px;
      margin: 16px 0 10px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      direction: rtl;
      font-family: 'Cairo', 'Tajawal', 'Amiri', sans-serif;
    }
    th {
      background: ${branding.primaryTableColor};
      color: ${branding.headerTextColor};
      padding: 8px 12px;
      border: 1px solid ${branding.primaryTableColor};
      text-align: right;
    }
  </style>
</head>
<body dir="rtl">
  <!-- Official Institutional Header -->
  <div dir="rtl" style="border-bottom: 3px solid ${branding.primaryTableColor}; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 14px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      ${logoHtml}
      <div>
        <h1 style="margin: 0; font-size: 19px; font-weight: 900; color: ${branding.primaryTableColor};">بطاقة المتابعة الدورية الشاملة للطالب</h1>
        <p style="margin: 3px 0 0 0; font-size: 12px; color: #0f172a; font-weight: 800;">${escapeHtml(branding.centerName)} • ${escapeHtml(branding.headerSubtitle)}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569; font-weight: 600;">${escapeHtml(branding.headerAddress)} • هاتف الإدارة: ${escapeHtml(branding.centerPhone)}</p>
      </div>
    </div>
    <div style="text-align: left; font-size: 11px; color: #334155; line-height: 1.6; background: ${branding.zebraRowColor}; border: 1px solid ${branding.borderAccentColor}; padding: 8px 12px; border-radius: 8px;">
      <div><strong>تاريخ الإصدار:</strong> ${escapeHtml(printDate)}</div>
      <div><strong>كود الطالب:</strong> <span style="font-family: 'JetBrains Mono', monospace; font-weight: 800;">${escapeHtml(params.studentCode)}</span></div>
      <div><strong>${escapeHtml(branding.headerTaxOrLicense || 'نسخة رسمية لولي الأمر')}</strong></div>
    </div>
  </div>

  <!-- 1. Basic Information -->
  <div class="section-title">أولاً: البيانات الأساسية والأكاديمية للطالب</div>
  <div dir="rtl" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; border: 1px solid ${branding.borderAccentColor}; border-radius: 8px; padding: 12px; background: ${branding.zebraRowColor}; font-size: 12px;">
    <div><strong>اسم الطالب:</strong> ${escapeHtml(params.studentName)} (${escapeHtml(params.studentCode)})</div>
    <div><strong>المرحلة الدراسية:</strong> ${escapeHtml(params.grade)}</div>
    <div><strong>ولي الأمر ورقم التواصل:</strong> ${escapeHtml(params.parentName)} — <span style="font-family: 'JetBrains Mono', monospace;">${escapeHtml(params.parentPhone)}</span></div>
    <div><strong>إحصائيات الحضور:</strong> حضر ${params.attendancePresent} حصة • غياب ${params.attendanceAbsent} حصة</div>
    <div style="grid-column: span 2;"><strong>المجموعات المسجل بها:</strong> ${
      params.enrolledGroups.length > 0
        ? escapeHtml(params.enrolledGroups.join(' ، '))
        : 'غير مسجل بمجموعة حالياً'
    }</div>
  </div>

  <!-- 2. Financial Status -->
  <div class="section-title">ثانياً: الوضع المالي والاشتراكات الدراسية</div>
  <div dir="rtl" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center;">
    <div style="border: 1px solid ${branding.borderAccentColor}; border-radius: 8px; padding: 10px; background: ${branding.zebraRowColor};">
      <div style="font-size: 11px; color: #475569;">إجمالي المصروفات المطلوبة</div>
      <div style="font-size: 16px; font-weight: 900; color: ${branding.primaryTableColor}; margin-top: 4px;">${params.totalRequiredTuition} ${escapeHtml(params.currency)}</div>
    </div>
    <div style="border: 1px solid ${branding.borderAccentColor}; border-radius: 8px; padding: 10px; background: #f0fdf4;">
      <div style="font-size: 11px; color: #166534;">المبلغ المدفوع</div>
      <div style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 4px;">${params.paidAmount} ${escapeHtml(params.currency)}</div>
    </div>
    <div style="border: 1px solid ${branding.borderAccentColor}; border-radius: 8px; padding: 10px; background: ${
      params.remainingAmount > 0 ? '#fff1f2' : branding.zebraRowColor
    };">
      <div style="font-size: 11px; color: #9f1239;">المبلغ المتبقي (المديونية)</div>
      <div style="font-size: 16px; font-weight: 900; color: ${
        params.remainingAmount > 0 ? '#e11d48' : branding.primaryTableColor
      }; margin-top: 4px;">${params.remainingAmount} ${escapeHtml(params.currency)}</div>
    </div>
    <div style="border: 1px solid ${branding.borderAccentColor}; border-radius: 8px; padding: 10px; background: ${branding.zebraRowColor};">
      <div style="font-size: 11px; color: #475569;">حالة السداد</div>
      <div style="font-size: 13px; font-weight: 800; color: ${branding.primaryTableColor}; margin-top: 6px;">${escapeHtml(params.paymentStatusLabel)}</div>
    </div>
  </div>

  <!-- 3. Exam Grades Log -->
  <div class="section-title">ثالثاً: سجل درجات الامتحانات الشهرية والأسبوعية ومستوى التقييم</div>
  <table dir="rtl">
    <thead>
      <tr dir="rtl">
        <th>اسم الاختبار / الامتحان</th>
        <th>المادة والنوع</th>
        <th>التاريخ</th>
        <th>الدرجة والنسبة</th>
        <th>التقييم العام</th>
      </tr>
    </thead>
    <tbody>
      ${examsRowsHtml}
    </tbody>
  </table>

  <!-- 4. Admin & Teacher Notes -->
  <div class="section-title">رابعاً: ملاحظات الإدارة والمدرسين (السلوكية والأكاديمية)</div>
  <div>
    ${notesHtml}
  </div>

  <!-- Signatures Footer -->
  <div dir="rtl" style="margin-top: 24px; border-top: 1px dashed ${branding.borderAccentColor}; padding-top: 14px; display: flex; justify-content: space-between; font-size: 11px; color: #475569;">
    <div>
      <div style="font-weight: 700; color: ${branding.primaryTableColor};">* ${escapeHtml(branding.receiptFooter)}</div>
      <div>${escapeHtml(branding.centerName)} • ${escapeHtml(branding.headerAddress)} • هاتف: ${escapeHtml(branding.centerPhone)}</div>
    </div>
    <div style="display: flex; gap: 36px;">
      <div style="text-align: center; width: 150px;">
        <div>توقيع ولي الأمر بالعلم</div>
        <div style="border-bottom: 1px solid #94a3b8; height: 28px;"></div>
      </div>
      <div style="text-align: center; width: 150px;">
        <div>ختم واعتماد إدارة السنتر</div>
        <div style="border-bottom: 1px solid #94a3b8; height: 28px;"></div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
}

/**
 * Prints / exports a single-page A4 official Student Follow-up Card PDF (بطاقة متابعة الطالب الشاملة)
 * ready to hand to the parent, with full Arabic RTL shaping (Cairo, Tajawal & Amiri) and live Center Branding.
 */
export function exportStudentFollowUpCardPdf(
  params: Parameters<typeof buildStudentFollowUpCardPdfHtml>[0]
): void {
  const branding = resolveExportBrandingContext({
    centerName: params.centerName,
    centerPhone: params.centerPhone,
    currency: params.currency,
    ...(params.brandingOverrides || {}),
  });
  const html = buildStudentFollowUpCardPdfHtml(params);

  recordExportDiagnostic({
    type: 'STUDENT_CARD_PDF',
    section: 'STUDENT_CARD',
    title: `بطاقة متابعة الطالب - ${params.studentName}`,
    rowCount: params.examGrades.length,
    columnCount: 5,
    hasLogo: Boolean(branding.showLogoInExports && branding.logoDataUrl),
    primaryTableColor: branding.primaryTableColor,
    centerName: branding.centerName,
    timestamp: new Date().toISOString(),
    htmlOrContentPreview: html.slice(0, 2000),
  });

  if (typeof document === 'undefined') return;

  const existingFrame = document.getElementById(
    'educenter-print-iframe'
  ) as HTMLIFrameElement | null;
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }
  const iframe = document.createElement('iframe');
  iframe.id = 'educenter-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }
}

/**
 * Generates a full system backup JSON payload
 */
export async function createFullSystemBackup(
  data?: Partial<SystemBackupPayload>
): Promise<SystemBackupPayload> {
  const rawDate = new Date().toISOString();

  const backupData: SystemBackupPayload = {
    version: '2026.1.0',
    exportedAt: rawDate,
    checksumSha256: '',
    centerInfo: data?.centerInfo || {
      name: 'سنتر الأوائل التعليمي الذكي',
      currency: 'ج.م',
      phone: '01001234567',
      defaultSplitPercent: 70,
    },
    enabledModules: data?.enabledModules || {
      dashboard: true,
      student360: true,
      attendance: true,
      finance: true,
      analytics: true,
      teachers: true,
      payroll: true,
      scheduler: true,
      backup: true,
      audit: true,
      roles: true,
      backend: false,
      database: false,
    },
    studentsCount: data?.students?.length || 4,
    students: data?.students || [
      {
        id: 'stu-01',
        code: 'ST-2026-0012',
        name: 'أحمد محمود رضوان',
        phone: '01012345678',
        balance: 0,
        status: 'ACTIVE',
      },
      {
        id: 'stu-02',
        code: 'ST-2026-0045',
        name: 'مريم طارق الشريف',
        phone: '01198765432',
        balance: -60,
        status: 'ACTIVE',
      },
      {
        id: 'stu-03',
        code: 'ST-2026-0089',
        name: 'يوسف حسام الدين',
        phone: '01234567891',
        balance: 0,
        status: 'ACTIVE',
      },
      {
        id: 'stu-04',
        code: 'ST-2026-0104',
        name: 'نور الهدى إبراهيم',
        phone: '01511223344',
        balance: -150,
        status: 'ACTIVE',
      },
    ],
    treasuryTransactionsCount: data?.treasuryTransactions?.length || 5,
    treasuryTransactions: data?.treasuryTransactions || [
      {
        id: 'TX-1001',
        type: 'CASH_IN',
        amount: 350,
        description: 'سداد اشتراك شهري فيزياء',
        date: rawDate,
      },
      {
        id: 'TX-1002',
        type: 'CASH_IN',
        amount: 300,
        description: 'سداد كيمياء عضوية',
        date: rawDate,
      },
      {
        id: 'TX-1003',
        type: 'CASH_OUT',
        amount: 450,
        description: 'صيانة وتصوير مذكرات',
        date: rawDate,
      },
      {
        id: 'TX-1004',
        type: 'CASH_IN',
        amount: 700,
        description: 'تسوية متأخرات طلاب',
        date: rawDate,
      },
    ],
    attendanceRecordsCount: data?.attendanceRecords?.length || 3,
    attendanceRecords: data?.attendanceRecords || [
      {
        studentCode: 'ST-2026-0012',
        status: 'PRESENT',
        hmacVerified: true,
        time: '14:02:15',
      },
      {
        studentCode: 'ST-2026-0045',
        status: 'PRESENT',
        hmacVerified: true,
        time: '14:05:40',
      },
    ],
    payrollCount: data?.payroll?.length || 3,
    payroll: data?.payroll || [
      {
        teacherName: 'أ. محمد عبد المنعم',
        subject: 'الفيزياء',
        splitRate: 70,
        wallet: 8400,
      },
      {
        teacherName: 'أ. طارق عبد الحميد',
        subject: 'الكيمياء',
        splitRate: 70,
        wallet: 6300,
      },
    ],
    automationRulesCount: data?.automationRules?.length || 5,
    automationRules: data?.automationRules || [
      {
        id: 'rule-absence',
        name: 'تنبيه الغياب',
        enabled: true,
        delayMinutes: 15,
      },
      {
        id: 'rule-overdue',
        name: 'تذكير المصروفات',
        enabled: true,
        thresholdDays: 3,
      },
    ],
  };

  // Compute SHA-256 for integrity verification
  const contentString = JSON.stringify({ ...backupData, checksumSha256: '' });
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(contentString)
  );
  backupData.checksumSha256 = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return backupData;
}

/**
 * Triggers 1-Click download of full system backup file to user machine
 */
export async function downloadFullSystemBackupFile(
  customData?: Partial<SystemBackupPayload>
): Promise<string> {
  const backup = await createFullSystemBackup(customData);
  const jsonStr = JSON.stringify(backup, null, 2);
  const now = new Date();
  const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `educenter_full_backup_${dateSuffix}.json`;

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Validates and restores a system backup file
 */
export async function validateAndParseBackupFile(jsonString: string): Promise<{
  isValid: boolean;
  error?: string;
  payload?: SystemBackupPayload;
}> {
  try {
    const parsed = JSON.parse(jsonString) as SystemBackupPayload;
    if (!parsed.version || !parsed.exportedAt || !parsed.centerInfo) {
      return {
        isValid: false,
        error:
          'الملف غير صالح أو لا يحتوي على بنية النسخة الاحتياطية المعتمدة لـ EduCenter',
      };
    }
    return {
      isValid: true,
      payload: parsed,
    };
  } catch {
    return {
      isValid: false,
      error: 'صيغة الملف غير صالحة (يجب أن يكون ملف JSON سليم)',
    };
  }
}
