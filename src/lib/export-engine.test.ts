/**
 * Unit Tests for Universal RTL Export & Backup Engine
 * Uses node:test and node:assert/strict
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  buildCsvContent,
  buildBrandedCsvContent,
  buildRtlExcelHtmlDocument,
  buildPrintablePdfHtml,
  buildStudentFollowUpCardPdfHtml,
  exportToExcel,
  exportToPdfReport,
  getLastExportDiagnostic,
  createFullSystemBackup,
  validateAndParseBackupFile,
  resolveExportBrandingContext,
} from './export-engine';
import { erpStore, EXPORT_COLOR_THEMES } from './erp-store';

test('escapeCsvCell correctly escapes commas, quotes, and newlines', () => {
  assert.equal(escapeCsvCell('Hello'), '"Hello"');
  assert.equal(escapeCsvCell('Hello, World'), '"Hello, World"');
  assert.equal(escapeCsvCell('He said "Hello"'), '"He said ""Hello"""');
  assert.equal(escapeCsvCell(12500), '"12500"');
  assert.equal(escapeCsvCell(null), '""');
});

test('buildCsvContent starts with UTF-8 BOM (\uFEFF) and formats Arabic lines correctly', () => {
  const headers = ['اسم الطالب', 'كود الطالب', 'المبلغ المتأخر'];
  const rows = [
    ['أحمد محمود رضوان', 'ST-2026-0012', 350],
    ['مريم طارق الشريف', 'ST-2026-0045', 60],
  ];

  const csv = buildCsvContent(headers, rows);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"أحمد محمود رضوان"'));
  assert.ok(csv.includes('"ST-2026-0012"'));
  assert.ok(csv.includes('"350"'));
  assert.ok(csv.includes('"مريم طارق الشريف"'));
});

test('createFullSystemBackup computes SHA-256 and structures all system sections', async () => {
  const backup = await createFullSystemBackup({
    centerInfo: {
      name: 'سنتر النخبة التعليمي',
      currency: 'ج.م',
      phone: '01009988776',
      defaultSplitPercent: 75,
    },
  });

  assert.equal(backup.version, '2026.1.0');
  assert.equal(backup.centerInfo.name, 'سنتر النخبة التعليمي');
  assert.equal(backup.centerInfo.defaultSplitPercent, 75);
  assert.ok(backup.checksumSha256.length === 64);
  assert.ok(backup.students.length > 0);
  assert.ok(backup.treasuryTransactions.length > 0);
  assert.ok(backup.enabledModules.attendance === true);
});

test('validateAndParseBackupFile validates valid JSON backup and rejects invalid data', async () => {
  const backup = await createFullSystemBackup();
  const validJson = JSON.stringify(backup);

  const validResult = await validateAndParseBackupFile(validJson);
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.payload?.centerInfo.name, backup.centerInfo.name);

  const invalidResult = await validateAndParseBackupFile('{ invalid json');
  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.error?.includes('صيغة الملف غير صالحة'));

  const corruptedResult = await validateAndParseBackupFile('{"foo": "bar"}');
  assert.equal(corruptedResult.isValid, false);
  assert.ok(
    corruptedResult.error?.includes('لا يحتوي على بنية النسخة الاحتياطية')
  );
});

test('Export Branding Engine injects custom Logo, Header metadata, Arabic fonts (Cairo/Amiri), and Institutional Table Colors into PDF and Excel outputs across Students, Finance, and Attendance', () => {
  erpStore.resetToDemoData();

  const emeraldTheme = EXPORT_COLOR_THEMES.find(
    (t) => t.id === 'EMERALD_OFFICIAL'
  )!;
  const customLogoDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  erpStore.updateConfig({
    centerName: 'أكاديمية الرواد التعليمية الكبرى',
    centerPhone: '01288990011',
    receiptFooter: 'مستند رسمي صادر من أكاديمية الرواد - جميع الحقوق محفوظة',
  });
  erpStore.updateExportBranding({
    logoDataUrl: customLogoDataUrl,
    headerSubtitle: 'المركز الأول لتدريس مناهج الثانوية العامة واللغات',
    headerAddress: 'الإسكندرية - سموحة - ميدان فيكتور عمانويل',
    headerTaxOrLicense: 'ترخيص وزارة التربية والتعليم رقم 881/2026',
    showLogoInExports: true,
    includeHeaderInExcel: true,
    themeId: 'EMERALD_OFFICIAL',
    primaryTableColor: emeraldTheme.primaryTableColor,
    headerTextColor: emeraldTheme.headerTextColor,
    zebraRowColor: emeraldTheme.zebraRowColor,
    borderAccentColor: emeraldTheme.borderAccentColor,
  });

  const resolved = resolveExportBrandingContext();
  assert.equal(resolved.centerName, 'أكاديمية الرواد التعليمية الكبرى');
  assert.equal(resolved.primaryTableColor, '#064e3b');
  assert.equal(
    resolved.headerAddress,
    'الإسكندرية - سموحة - ميدان فيكتور عمانويل'
  );

  // 1. Verify Excel Branded CSV includes Header metadata and Summary Cards
  const brandedCsv = buildBrandedCsvContent(
    ['كود الطالب', 'اسم الطالب', 'الرصيد'],
    [['ST-1001', 'أحمد محمود', 0]],
    {
      reportTitle: 'كشف حسابات الطلاب',
      summaryCards: [{ label: 'إجمالي الطلاب', value: '1 طالب' }],
    }
  );
  assert.ok(brandedCsv.startsWith('\uFEFF'));
  assert.ok(brandedCsv.includes('أكاديمية الرواد التعليمية الكبرى'));
  assert.ok(brandedCsv.includes('إجمالي الطلاب: 1 طالب'));

  // 2. Verify Native RTL Excel HTML Document (.xls) for Students, Finance, and Attendance
  const rtlExcelHtml = buildRtlExcelHtmlDocument({
    reportTitle: 'كشف حركة الخزينة وتوزيع نسب المدرسين والأقساط',
    subtitle: 'أكاديمية الرواد التعليمية الكبرى - صافي الخزينة: 15,000 ج.م',
    section: 'FINANCE',
    headers: ['رقم الإيصال', 'البيان', 'المبلغ المحصل', 'حصة المدرس', 'صافي السنتر'],
    rows: [
      ['RCP-2026-901', 'سداد اشتراك فيزياء', 350, 245, 105],
      ['RCP-2026-902', 'سداد اشتراك كيمياء', 300, 210, 90],
    ],
    summaryCards: [
      { label: 'إجمالي المتحصلات الدراسية', value: '650 ج.م' },
      { label: 'صافي الخزينة الحالي', value: '195 ج.م' },
    ],
  });

  assert.ok(rtlExcelHtml.startsWith('\uFEFF'));
  assert.ok(rtlExcelHtml.includes('dir="rtl"'));
  assert.ok(rtlExcelHtml.includes('<x:DisplayRightToLeft/>'));
  assert.ok(rtlExcelHtml.includes(customLogoDataUrl));
  assert.ok(rtlExcelHtml.includes('Cairo'));
  assert.ok(rtlExcelHtml.includes('Amiri'));
  assert.ok(rtlExcelHtml.includes('Tajawal'));
  assert.ok(rtlExcelHtml.includes(emeraldTheme.primaryTableColor));
  assert.ok(rtlExcelHtml.includes('إجمالي المتحصلات الدراسية'));

  // 3. Verify PDF HTML for Attendance with Logo, Summary Cards, RTL, and Clear Arabic Fonts
  const attendancePdfHtml = buildPrintablePdfHtml({
    title: 'سجل الحضور والانصراف بالـ QR والتسجيل الجماعي والتعويضات',
    subtitle: 'أكاديمية الرواد التعليمية الكبرى • المجموعة النشطة: فيزياء 3ث',
    section: 'ATTENDANCE',
    headers: ['كود الطالب', 'اسم الطالب', 'التاريخ', 'الحالة'],
    rows: [
      ['ST-101', 'أحمد محمود', '2026-11-01', 'حاضر'],
      ['ST-102', 'سارة طارق', '2026-11-01', 'غائب'],
    ],
    summaryCards: [
      { label: 'إجمالي سجلات الحضور', value: '2 سجل' },
      { label: 'نسبة الالتزام والحضور', value: '50%' },
    ],
  });

  assert.ok(attendancePdfHtml.includes('<html lang="ar" dir="rtl">'));
  assert.ok(attendancePdfHtml.includes(customLogoDataUrl));
  assert.ok(attendancePdfHtml.includes("font-family: 'Cairo', 'Tajawal', 'Amiri'"));
  assert.ok(attendancePdfHtml.includes('نسبة الالتزام والحضور'));
  assert.ok(attendancePdfHtml.includes(emeraldTheme.primaryTableColor));
  assert.ok(attendancePdfHtml.includes(emeraldTheme.zebraRowColor));
  assert.ok(attendancePdfHtml.includes(emeraldTheme.borderAccentColor));

  // 4. Verify Student Follow-Up Card PDF HTML embeds Logo, RTL, and Arabic Typography
  const cardHtml = buildStudentFollowUpCardPdfHtml({
    centerName: 'أكاديمية الرواد التعليمية الكبرى',
    centerPhone: '01288990011',
    currency: 'ج.م',
    studentName: 'يوسف حسام الدين',
    studentCode: 'ST-2026-0089',
    grade: 'الصف الثالث الثانوي',
    studentPhone: '01012345678',
    parentName: 'حسام الدين',
    parentPhone: '01099887766',
    enrolledGroups: ['مجموعة التميز فيزياء (3ث)'],
    totalRequiredTuition: 650,
    paidAmount: 650,
    remainingAmount: 0,
    paymentStatusLabel: 'مسدد بالكامل',
    attendancePresent: 12,
    attendanceAbsent: 1,
    examGrades: [
      {
        examTitle: 'امتحان الشهر الأول',
        subject: 'الفيزياء',
        examType: 'MONTHLY',
        date: '2026-10-25',
        score: 48,
        maxScore: 50,
        evaluation: 'ممتاز',
      },
    ],
    followUpNotes: [
      {
        date: '2026-10-28',
        author: 'أ. محمد عبد المنعم',
        category: 'ACADEMIC',
        content: 'طالب متفوق وملتزم بالحضور.',
      },
    ],
  });

  assert.ok(cardHtml.includes('<html lang="ar" dir="rtl">'));
  assert.ok(cardHtml.includes(customLogoDataUrl));
  assert.ok(cardHtml.includes("font-family: 'Cairo', 'Tajawal', 'Amiri'"));
  assert.ok(cardHtml.includes('يوسف حسام الدين'));

  // 5. Verify exportToExcel and exportToPdfReport record diagnostic metadata in Node/Browser
  exportToExcel(
    'سجل_الطلاب',
    [
      { header: 'الكود', key: 'code' },
      { header: 'اسم الطالب', key: 'fullName' },
    ],
    [{ code: 'ST-101', fullName: 'أحمد محمود' }],
    {
      reportTitle: 'تقرير شؤون الطلاب والحسابات المستحقة',
      section: 'STUDENTS',
      summaryCards: [{ label: 'إجمالي الطلاب بالكشف', value: '1 طالب' }],
    }
  );
  const excelDiag = getLastExportDiagnostic();
  assert.ok(excelDiag);
  assert.equal(excelDiag.type, 'EXCEL_RTL');
  assert.equal(excelDiag.section, 'STUDENTS');
  assert.equal(excelDiag.hasLogo, true);
  assert.equal(excelDiag.primaryTableColor, emeraldTheme.primaryTableColor);

  exportToPdfReport({
    title: 'كشف حركة الخزينة وتوزيع نسب المدرسين والأقساط',
    columns: [
      { header: 'رقم الإيصال', key: 'receiptNumber' },
      { header: 'المبلغ', key: 'netAmount' },
    ],
    data: [{ receiptNumber: 'RCP-1', netAmount: 350 }],
    section: 'FINANCE',
    summaryCards: [{ label: 'صافي الخزينة الحالي', value: '350 ج.م' }],
  });
  const pdfDiag = getLastExportDiagnostic();
  assert.ok(pdfDiag);
  assert.equal(pdfDiag.type, 'PDF');
  assert.equal(pdfDiag.section, 'FINANCE');
  assert.equal(pdfDiag.hasLogo, true);
});
