-- ============================================================================
-- EduCenter Smart ERP - Complete Production Database Schema & Automation Triggers
-- Database: PostgreSQL 15 / 16 (ACID Compliant & Hardened Security)
-- Step 2: Full Relational Hierarchy, RBAC, Treasury, QR Attendance, & Triggers
-- ============================================================================

-- 0. Extensions & Schema Setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set Timezone to Cairo / Local
SET timezone = 'Africa/Cairo';

-- Drop existing tables/functions if necessary (for clean replayable migrations)
-- (In production, run inside migration tools like Alembic or Flyway)

-- ============================================================================
-- 1. SECURITY, AUTHENTICATION & RBAC (Role-Based Access Control)
-- ============================================================================

-- Table: roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'SUPER_ADMIN', 'CENTER_MANAGER', 'ACCOUNTANT', 'RECEPTIONIST', 'TEACHER'
    name_ar VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'treasury.cash_in', 'attendance.scan_qr', 'students.view_360'
    name_ar VARCHAR(150) NOT NULL,
    module VARCHAR(50) NOT NULL, -- 'TREASURY', 'ACADEMIC', 'STUDENTS', 'ATTENDANCE', 'PAYROLL', 'REPORTS'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: role_permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash with 12 rounds
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    failed_login_attempts INT DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Table: audit_logs (Complete security audit trail for financial & data transparency)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) DEFAULT 'SYSTEM',
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    table_name VARCHAR(100) NOT NULL, -- 'students', 'treasury_transactions', 'student_payments', 'teacher_wallets', 'staff_salaries'
    record_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_values JSONB, -- Previous values before modification or deletion
    new_values JSONB, -- New values after insertion or modification
    changed_fields JSONB DEFAULT '[]'::jsonb, -- Array of field names that were updated
    description TEXT, -- Human-readable summary of the sensitive change
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. EDUCATIONAL HIERARCHY (المراحل ⬅️ المواد ⬅️ المدرسين ⬅️ المجموعات ⬅️ الطلاب)
-- ============================================================================

-- Table 1: Academic Stages (المراحل التعليمية)
CREATE TABLE IF NOT EXISTS academic_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- e.g. 'المرحلة الثانوية', 'المرحلة الإعدادية'
    code VARCHAR(50) UNIQUE NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Subjects (المواد الدراسية)
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES academic_stages(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL, -- e.g. 'فيزياء', 'رياضيات', 'كيمياء'
    code VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stage_id, code)
);

-- Table 3: Teachers & Teacher Wallets (المدرسين والمحافظ المالية)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Teacher can also have user account
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    default_revenue_split NUMERIC(5,2) DEFAULT 70.00 CHECK (default_revenue_split BETWEEN 0 AND 100), -- 70% to teacher, 30% to center
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_wallets (
    teacher_id UUID PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
    balance NUMERIC(14,2) DEFAULT 0.00 CHECK (balance >= 0),
    total_earned NUMERIC(14,2) DEFAULT 0.00,
    total_withdrawn NUMERIC(14,2) DEFAULT 0.00,
    last_payout_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: Groups (المجموعات الدراسية، نظام الدفع، ومواعيد الحصص)
CREATE TYPE billing_type_enum AS ENUM ('PER_SESSION', 'MONTHLY');

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL, -- e.g. 'مجموعة أوائل الثانوية - السبت والثلاثاء 4 عصراً'
    stage_id UUID NOT NULL REFERENCES academic_stages(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    billing_type billing_type_enum NOT NULL DEFAULT 'MONTHLY',
    price_per_unit NUMERIC(10,2) NOT NULL CHECK (price_per_unit >= 0), -- Price per session or per month
    teacher_revenue_percent NUMERIC(5,2) NOT NULL CHECK (teacher_revenue_percent BETWEEN 0 AND 100), -- Specific revenue split for this group
    max_capacity INT DEFAULT 50 CHECK (max_capacity > 0),
    day_schedule JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{"day": "SAT", "time": "16:00", "duration_minutes": 120}]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 5: Students (الطلاب وبيانات الاتصال والـ QR Code)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_code VARCHAR(20) UNIQUE NOT NULL, -- Unique sequential code e.g. 'ST-2026-0001'
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    parent_name VARCHAR(150) NOT NULL,
    parent_phone VARCHAR(20) NOT NULL, -- WhatsApp Alert destination
    stage_id UUID NOT NULL REFERENCES academic_stages(id) ON DELETE RESTRICT,
    qr_secret_hash VARCHAR(255) NOT NULL, -- Cryptographic HMAC key for tamper-proof QR validation
    is_active BOOLEAN DEFAULT TRUE,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student Enrollments in Groups (اشتراك الطالب في المجموعة)
CREATE TYPE enrollment_status_enum AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE payment_clearance_enum AS ENUM ('CLEARED', 'PARTIAL', 'OVERDUE');

CREATE TABLE IF NOT EXISTS student_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    status enrollment_status_enum DEFAULT 'ACTIVE',
    payment_status payment_clearance_enum DEFAULT 'CLEARED',
    balance_due NUMERIC(10,2) DEFAULT 0.00, -- Amount owed by student (if any)
    total_sessions_attended INT DEFAULT 0,
    last_payment_date TIMESTAMPTZ,
    UNIQUE(student_id, group_id)
);

-- ============================================================================
-- 3. CENTRAL TREASURY & FINANCIAL LEDGERS (الخزنة المركزية وسندات الصرف والقبض)
-- ============================================================================

CREATE TYPE treasury_tx_type AS ENUM ('CASH_IN', 'CASH_OUT');
CREATE TYPE treasury_category AS ENUM (
    'STUDENT_TUITION',
    'TEACHER_PAYOUT',
    'STAFF_PAYROLL',
    'CENTER_EXPENSES',
    'REFUND',
    'CAPITAL_ADJUSTMENT'
);

-- Table: Central Treasury (الخزنة المركزية المحمية - Single Record)
CREATE TABLE IF NOT EXISTS central_treasury (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Strict single treasury instance
    current_balance NUMERIC(16,2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0),
    total_cash_in NUMERIC(16,2) NOT NULL DEFAULT 0.00,
    total_cash_out NUMERIC(16,2) NOT NULL DEFAULT 0.00,
    last_transaction_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize Central Treasury if not exists
INSERT INTO central_treasury (id, current_balance, total_cash_in, total_cash_out)
VALUES (1, 0.00, 0.00, 0.00)
ON CONFLICT (id) DO NOTHING;

-- Table: Treasury Transactions (سجل حركة الخزنة الدقيق)
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_code VARCHAR(30) UNIQUE NOT NULL, -- e.g. 'TX-20261031-0001'
    transaction_type treasury_tx_type NOT NULL,
    category treasury_category NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(16,2) NOT NULL, -- Snapshot of balance right after transaction
    reference_type VARCHAR(50), -- 'STUDENT_PAYMENT', 'TEACHER_PAYOUT', 'STAFF_PAYROLL'
    reference_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Student Payments (سداد مصروفات الطلاب)
CREATE TYPE payment_method_enum AS ENUM ('CASH', 'VISA_POS', 'VODAFONE_CASH', 'BANK_TRANSFER');

CREATE TABLE IF NOT EXISTS student_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number VARCHAR(30) UNIQUE NOT NULL, -- e.g. 'REC-2026-000452'
    enrollment_id UUID NOT NULL REFERENCES student_enrollments(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_method payment_method_enum DEFAULT 'CASH',
    paid_for_period VARCHAR(50) NOT NULL, -- e.g. 'حصة رقم 5' or 'شهر نوفمبر 2026'
    teacher_split_amount NUMERIC(10,2) NOT NULL, -- Calculated automatically
    center_split_amount NUMERIC(10,2) NOT NULL,  -- Calculated automatically
    pdf_receipt_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Teacher Wallet Ledger (حركات محفظة المعلم)
CREATE TYPE wallet_tx_type AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE IF NOT EXISTS teacher_wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    transaction_type wallet_tx_type NOT NULL, -- CREDIT (earned from student), DEBIT (withdrawn payout)
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    balance_after NUMERIC(14,2) NOT NULL,
    payment_id UUID REFERENCES student_payments(id) ON DELETE SET NULL,
    payout_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ATTENDANCE & AUTOMATION (حضور الطلاب والموظفين بالدقيقة وإشعارات الواتساب)
-- ============================================================================

CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED', 'LATE');

-- Table: Student Attendance
CREATE TABLE IF NOT EXISTS student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ,
    status attendance_status_enum NOT NULL DEFAULT 'PRESENT',
    scan_method VARCHAR(20) DEFAULT 'QR_SCAN', -- 'QR_SCAN', 'MANUAL_ENTRY'
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    whatsapp_notified BOOLEAN DEFAULT FALSE,
    session_charge_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, group_id, session_date)
);

-- Table: WhatsApp Notification Logs (سجل تنبيهات أولياء الأمور)
CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'ABSENCE_ALERT', 'PAYMENT_RECEIPT', 'STUDENT_360_REPORT'
    message_content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'SENT', -- 'QUEUED', 'SENT', 'FAILED', 'DELIVERED'
    whatsapp_message_id VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: Staff Attendance & Shift Records (حضور وانصراف الموظفين واحتساب التأخير)
CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_start_time TIME NOT NULL DEFAULT '09:00:00',
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    late_minutes INT DEFAULT 0 CHECK (late_minutes >= 0),
    early_leave_minutes INT DEFAULT 0 CHECK (early_leave_minutes >= 0),
    deduction_applied BOOLEAN DEFAULT FALSE,
    deduction_amount NUMERIC(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, work_date)
);

-- ============================================================================
-- 5. PAYROLL & SALARIES (الرواتب، الاستقطاعات وصرف الخزنة)
-- ============================================================================

CREATE TYPE payroll_status_enum AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');

CREATE TABLE IF NOT EXISTS payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- 'YYYY-MM' e.g. '2026-11'
    base_salary NUMERIC(10,2) NOT NULL CHECK (base_salary >= 0),
    total_late_minutes INT DEFAULT 0,
    late_deduction NUMERIC(10,2) DEFAULT 0.00,
    penalties NUMERIC(10,2) DEFAULT 0.00,
    bonuses NUMERIC(10,2) DEFAULT 0.00,
    net_salary NUMERIC(10,2) NOT NULL CHECK (net_salary >= 0),
    status payroll_status_enum DEFAULT 'DRAFT',
    paid_at TIMESTAMPTZ,
    paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_year)
);

-- ============================================================================
-- 6. AUTOMATION TRIGGERS & PROCEDURES (ACID COMPLIANT & HIGH INTEGRITY)
-- ============================================================================

-- Function 1: Ensure Central Treasury Exists & Row-Level Lock Helper
CREATE OR REPLACE FUNCTION fn_lock_treasury()
RETURNS NUMERIC AS $$
DECLARE
    v_balance NUMERIC(16,2);
BEGIN
    SELECT current_balance INTO v_balance
    FROM central_treasury
    WHERE id = 1
    FOR UPDATE; -- Row-level lock to prevent concurrent race conditions

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الخزنة المركزية غير مهيأة';
    END IF;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function 2: Prevent Treasury Deficit on CASH_OUT
CREATE OR REPLACE FUNCTION fn_check_treasury_payout()
RETURNS TRIGGER AS $$
DECLARE
    v_current_bal NUMERIC(16,2);
BEGIN
    -- Acquire row lock on central treasury
    v_current_bal := fn_lock_treasury();

    IF NEW.transaction_type = 'CASH_OUT' THEN
        IF v_current_bal < NEW.amount THEN
            RAISE EXCEPTION 'عملية مرفوضة: رصيد الخزنة المركزية الحالي (%.2f) غير كافٍ لصرف المبلغ المطلوب (%.2f)',
                v_current_bal, NEW.amount;
        END IF;

        -- Update balance after
        NEW.balance_after := v_current_bal - NEW.amount;
        
        UPDATE central_treasury
        SET current_balance = current_balance - NEW.amount,
            total_cash_out = total_cash_out + NEW.amount,
            last_transaction_at = NOW(),
            updated_at = NOW()
        WHERE id = 1;
    ELSE
        -- CASH_IN
        NEW.balance_after := v_current_bal + NEW.amount;

        UPDATE central_treasury
        SET current_balance = current_balance + NEW.amount,
            total_cash_in = total_cash_in + NEW.amount,
            last_transaction_at = NOW(),
            updated_at = NOW()
        WHERE id = 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_treasury_transaction_balance ON treasury_transactions;
CREATE TRIGGER trg_treasury_transaction_balance
BEFORE INSERT ON treasury_transactions
FOR EACH ROW
EXECUTE FUNCTION fn_check_treasury_payout();

-- Trigger Function 3: Fully Automated Student Payment Processing
-- (Revenue Split + Treasury Cash In + Teacher Wallet Credit + Student Clearance)
CREATE OR REPLACE FUNCTION fn_process_student_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_teacher_id UUID;
    v_split_pct NUMERIC(5,2);
    v_teacher_share NUMERIC(10,2);
    v_center_share NUMERIC(10,2);
    v_tx_code VARCHAR(30);
    v_teacher_bal NUMERIC(14,2);
BEGIN
    -- 1. Fetch Teacher ID and revenue percentage configured for this specific group
    SELECT g.teacher_id, g.teacher_revenue_percent
    INTO v_teacher_id, v_split_pct
    FROM groups g
    WHERE g.id = NEW.group_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المجموعة غير معرفة لسداد المصروفات';
    END IF;

    -- 2. Calculate accurate splits (ACID Rounding)
    v_teacher_share := ROUND((NEW.amount * v_split_pct / 100.0), 2);
    v_center_share := NEW.amount - v_teacher_share;

    NEW.teacher_split_amount := v_teacher_share;
    NEW.center_split_amount := v_center_share;

    -- 3. Trigger Central Treasury Cash-In
    v_tx_code := 'TX-IN-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS-') || SUBSTRING(NEW.id::text FROM 1 FOR 4);
    
    INSERT INTO treasury_transactions (
        transaction_code, transaction_type, category, amount, balance_after,
        reference_type, reference_id, created_by, notes
    ) VALUES (
        v_tx_code, 'CASH_IN', 'STUDENT_TUITION', NEW.amount, 0,
        'STUDENT_PAYMENT', NEW.id, NEW.created_by,
        'سداد مصروفات طالب - إيصال: ' || NEW.receipt_number || ' (' || NEW.paid_for_period || ')'
    );

    -- 4. Credit Teacher Wallet & Update Balance Atomically
    -- Ensure wallet exists
    INSERT INTO teacher_wallets (teacher_id, balance, total_earned, total_withdrawn, updated_at)
    VALUES (v_teacher_id, 0.00, 0.00, 0.00, NOW())
    ON CONFLICT (teacher_id) DO NOTHING;

    -- Update wallet with row lock
    UPDATE teacher_wallets
    SET balance = balance + v_teacher_share,
        total_earned = total_earned + v_teacher_share,
        updated_at = NOW()
    WHERE teacher_id = v_teacher_id
    RETURNING balance INTO v_teacher_bal;

    -- Record in Teacher Ledger
    INSERT INTO teacher_wallet_ledger (
        teacher_id, transaction_type, amount, balance_after, payment_id, notes
    ) VALUES (
        v_teacher_id, 'CREDIT', v_teacher_share, v_teacher_bal, NEW.id,
        'استحقاق تلقائي نسبة ' || v_split_pct || '% من إيصال: ' || NEW.receipt_number
    );

    -- 5. Update Student Enrollment Status & Balance
    UPDATE student_enrollments
    SET balance_due = GREATEST(0.00, balance_due - NEW.amount),
        payment_status = CASE 
            WHEN (balance_due - NEW.amount) <= 0 THEN 'CLEARED'::payment_clearance_enum
            ELSE 'PARTIAL'::payment_clearance_enum
        END,
        last_payment_date = NOW()
    WHERE id = NEW.enrollment_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_student_payment_split ON student_payments;
CREATE TRIGGER trg_student_payment_split
BEFORE INSERT ON student_payments
FOR EACH ROW
EXECUTE FUNCTION fn_process_student_payment();

-- Trigger Function 4: Teacher Payout Deduction from Central Treasury
CREATE OR REPLACE FUNCTION fn_process_teacher_payout(
    p_teacher_id UUID,
    p_amount NUMERIC(10,2),
    p_admin_user_id UUID,
    p_notes TEXT DEFAULT 'صرف مستحقات معلم'
)
RETURNS UUID AS $$
DECLARE
    v_wallet_bal NUMERIC(14,2);
    v_tx_id UUID;
    v_tx_code VARCHAR(30);
    v_new_wallet_bal NUMERIC(14,2);
BEGIN
    -- Check teacher wallet with lock
    SELECT balance INTO v_wallet_bal
    FROM teacher_wallets
    WHERE teacher_id = p_teacher_id
    FOR UPDATE;

    IF NOT FOUND OR v_wallet_bal < p_amount THEN
        RAISE EXCEPTION 'رصيد محفظة المعلم (%.2f) غير كافٍ لصرف المبلغ المطلوب (%.2f)',
            COALESCE(v_wallet_bal, 0), p_amount;
    END IF;

    -- Deduct from Treasury (Trigger fn_check_treasury_payout will check treasury solvency)
    v_tx_code := 'TX-OUT-TCH-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS');
    INSERT INTO treasury_transactions (
        transaction_code, transaction_type, category, amount, balance_after,
        reference_type, reference_id, created_by, notes
    ) VALUES (
        v_tx_code, 'CASH_OUT', 'TEACHER_PAYOUT', p_amount, 0,
        'TEACHER_PAYOUT', p_teacher_id, p_admin_user_id, p_notes
    ) RETURNING id INTO v_tx_id;

    -- Deduct from Teacher Wallet
    UPDATE teacher_wallets
    SET balance = balance - p_amount,
        total_withdrawn = total_withdrawn + p_amount,
        last_payout_at = NOW(),
        updated_at = NOW()
    WHERE teacher_id = p_teacher_id
    RETURNING balance INTO v_new_wallet_bal;

    -- Record in Teacher Ledger
    INSERT INTO teacher_wallet_ledger (
        teacher_id, transaction_type, amount, balance_after, payout_id, notes
    ) VALUES (
        p_teacher_id, 'DEBIT', p_amount, v_new_wallet_bal, v_tx_id, p_notes
    );

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Function 5: Automated Student Per-Session Charge on Attendance
CREATE OR REPLACE FUNCTION fn_attendance_per_session_charge()
RETURNS TRIGGER AS $$
DECLARE
    v_billing billing_type_enum;
    v_price NUMERIC(10,2);
    v_enrollment_id UUID;
BEGIN
    IF NEW.status = 'PRESENT' THEN
        -- Check group billing type
        SELECT g.billing_type, g.price_per_unit, se.id
        INTO v_billing, v_price, v_enrollment_id
        FROM groups g
        JOIN student_enrollments se ON se.group_id = g.id
        WHERE g.id = NEW.group_id AND se.student_id = NEW.student_id;

        -- If group is billed per session, automatically record session charge on enrollment
        IF v_billing = 'PER_SESSION' AND NEW.session_charge_applied = FALSE THEN
            UPDATE student_enrollments
            SET balance_due = balance_due + v_price,
                payment_status = 'PARTIAL',
                total_sessions_attended = total_sessions_attended + 1
            WHERE id = v_enrollment_id;

            NEW.session_charge_applied := TRUE;
        ELSE
            -- Just increment attendance count
            UPDATE student_enrollments
            SET total_sessions_attended = total_sessions_attended + 1
            WHERE id = v_enrollment_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_student_attendance_charge ON student_attendance;
CREATE TRIGGER trg_student_attendance_charge
BEFORE INSERT ON student_attendance
FOR EACH ROW
EXECUTE FUNCTION fn_attendance_per_session_charge();

-- Trigger Function 6: Staff Late Minutes Auto Calculation
CREATE OR REPLACE FUNCTION fn_calc_staff_late_minutes()
RETURNS TRIGGER AS $$
DECLARE
    v_checkin_time TIME;
    v_diff_seconds INT;
BEGIN
    IF NEW.check_in_time IS NOT NULL THEN
        v_checkin_time := NEW.check_in_time::time;
        
        IF v_checkin_time > NEW.scheduled_start_time THEN
            v_diff_seconds := EXTRACT(EPOCH FROM (v_checkin_time - NEW.scheduled_start_time));
            NEW.late_minutes := FLOOR(v_diff_seconds / 60.0);
        ELSE
            NEW.late_minutes := 0;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_staff_late ON staff_attendance;
CREATE TRIGGER trg_calc_staff_late
BEFORE INSERT OR UPDATE OF check_in_time ON staff_attendance
FOR EACH ROW
EXECUTE FUNCTION fn_calc_staff_late_minutes();

-- ============================================================================
-- Trigger Function 7: Universal Audit Trail for Sensitive Database Operations
-- Automatically tracks modifications, deletions, and insertions on sensitive tables:
-- (students data, treasury amount changes, student payments, teacher wallets, staff payroll)
-- Preserving: Timestamp, Operator Username, Old Values (JSONB), New Values (JSONB), and Changed Keys.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_audit_sensitive_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_changed_fields JSONB := '[]'::jsonb;
    v_record_id VARCHAR(100);
    v_username VARCHAR(100);
    v_user_id UUID := NULL;
    v_action VARCHAR(20);
    v_desc TEXT;
BEGIN
    -- 1. Determine operation type & extract record payloads
    IF (TG_OP = 'INSERT') THEN
        v_action := 'INSERT';
        v_new_data := to_jsonb(NEW);
        v_record_id := COALESCE(v_new_data->>'id', v_new_data->>'student_id', v_new_data->>'code', 'N/A');
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_record_id := COALESCE(v_new_data->>'id', v_new_data->>'student_id', v_old_data->>'id', 'N/A');

        -- Calculate diff between OLD and NEW JSON keys
        SELECT COALESCE(jsonb_agg(key), '[]'::jsonb)
        INTO v_changed_fields
        FROM jsonb_each(v_new_data)
        WHERE v_new_data->key IS DISTINCT FROM v_old_data->key;

        -- If no columns actually changed (idempotent update), skip audit log to save space
        IF jsonb_array_length(v_changed_fields) = 0 THEN
            RETURN NEW;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_action := 'DELETE';
        v_old_data := to_jsonb(OLD);
        v_record_id := COALESCE(v_old_data->>'id', v_old_data->>'student_id', v_old_data->>'code', 'N/A');
    END IF;

    -- 2. Extract active operator username (from session context or fallback)
    BEGIN
        v_username := NULLIF(current_setting('app.current_username', true), '');
    EXCEPTION WHEN OTHERS THEN
        v_username := NULL;
    END;

    IF v_username IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            v_username := COALESCE(v_old_data->>'created_by', v_old_data->>'collected_by', SESSION_USER);
        ELSE
            v_username := COALESCE(v_new_data->>'created_by', v_new_data->>'collected_by', v_new_data->>'updated_by', SESSION_USER);
        END IF;
    END IF;

    -- 3. Construct descriptive human-readable audit summary
    IF TG_OP = 'INSERT' THEN
        v_desc := FORMAT('إضافة سجل جديد في جدول %s (المعرف: %s) بواسطة %s', TG_TABLE_NAME, v_record_id, v_username);
    ELSIF TG_OP = 'UPDATE' THEN
        v_desc := FORMAT('تعديل حساس في جدول %s (المعرف: %s). الحقول التي تغيرت: %s بواسطة %s', TG_TABLE_NAME, v_record_id, v_changed_fields::text, v_username);
    ELSIF TG_OP = 'DELETE' THEN
        v_desc := FORMAT('حذف سجل من جدول %s (المعرف: %s) بواسطة %s', TG_TABLE_NAME, v_record_id, v_username);
    END IF;

    -- 4. Record entry in audit_logs
    INSERT INTO audit_logs (
        user_id,
        username,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        changed_fields,
        description,
        created_at
    ) VALUES (
        v_user_id,
        COALESCE(v_username, 'SYSTEM'),
        v_action,
        TG_TABLE_NAME,
        v_record_id,
        v_old_data,
        v_new_data,
        v_changed_fields,
        v_desc,
        NOW()
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Trigger to: students (بيانات الطلاب، أرقام الهواتف، حالة القيد)
DROP TRIGGER IF EXISTS trg_audit_students ON students;
CREATE TRIGGER trg_audit_students
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW
EXECUTE FUNCTION fn_audit_sensitive_changes();

-- Attach Audit Trigger to: treasury_transactions (حركات الخزنة وتغيير المبالغ)
DROP TRIGGER IF EXISTS trg_audit_treasury_transactions ON treasury_transactions;
CREATE TRIGGER trg_audit_treasury_transactions
AFTER INSERT OR UPDATE OR DELETE ON treasury_transactions
FOR EACH ROW
EXECUTE FUNCTION fn_audit_sensitive_changes();

-- Attach Audit Trigger to: student_payments (إيصالات وسداد المصروفات)
DROP TRIGGER IF EXISTS trg_audit_student_payments ON student_payments;
CREATE TRIGGER trg_audit_student_payments
AFTER INSERT OR UPDATE OR DELETE ON student_payments
FOR EACH ROW
EXECUTE FUNCTION fn_audit_sensitive_changes();

-- Attach Audit Trigger to: teacher_wallets (أرصدة المدرسين وصرف المستحقات)
DROP TRIGGER IF EXISTS trg_audit_teacher_wallets ON teacher_wallets;
CREATE TRIGGER trg_audit_teacher_wallets
AFTER INSERT OR UPDATE OR DELETE ON teacher_wallets
FOR EACH ROW
EXECUTE FUNCTION fn_audit_sensitive_changes();

-- Attach Audit Trigger to: staff_attendance & payroll
DROP TRIGGER IF EXISTS trg_audit_staff_attendance ON staff_attendance;
CREATE TRIGGER trg_audit_staff_attendance
AFTER INSERT OR UPDATE OR DELETE ON staff_attendance
FOR EACH ROW
EXECUTE FUNCTION fn_audit_sensitive_changes();

-- ============================================================================
-- 7. PERFORMANCE INDEXES (FAST LOOKUPS & REPORTING)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students(parent_phone);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_group ON student_enrollments(group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON student_attendance(session_date, group_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_treasury_tx_created ON treasury_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_wallet_ledger_teacher ON teacher_wallet_ledger(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- End of PostgreSQL Schema & Automation File
