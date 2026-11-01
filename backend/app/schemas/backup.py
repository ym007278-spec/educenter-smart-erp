"""
Pydantic v2 Schemas for Automated Database Backup & Cloud Storage Archival.
Zero shortcuts, hardened against invalid inputs.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class BackupScheduleConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enabled: bool = Field(default=True, description="تفعيل النسخ الاحتياطي التلقائي الدوري")
    cron_expression: str = Field(default="0 2 * * *", description="تعبير Cron (مثال: يومياً الساعة 2 صباحاً)")
    frequency_hours: int = Field(default=24, ge=1, le=168, description="التكرار بالساعات")
    cloud_provider: str = Field(default="GCS", pattern="^(GCS|S3|CLOUDFLARE_R2)$", description="المزود السحابي")
    cloud_bucket_name: str = Field(default="educenter-secure-backups-vault", min_length=3, max_length=128)
    encryption_algorithm: str = Field(default="AES-256-GCM", pattern="^(AES-256-GCM|AES-256-CBC)$")
    retention_days: int = Field(default=90, ge=7, le=365, description="فترة الاحتفاظ بالنسخ قبل الحذف التلقائي")
    notify_on_failure: bool = Field(default=True)
    notification_webhook_or_email: Optional[str] = Field(default="admin@educenter.edu.eg")


class BackupRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="معرف النسخة الفريد")
    filename: str = Field(..., description="اسم الملف المشفر")
    backup_type: str = Field(default="FULL", pattern="^(FULL|INCREMENTAL|DIFFERENTIAL)$")
    created_at: datetime
    execution_duration_seconds: float
    raw_size_bytes: int
    compressed_size_bytes: int
    tables_archived_count: int
    rows_archived_count: int
    sha256_checksum: str = Field(..., min_length=64, max_length=64, description="بصمة التحقق الرقمية SHA-256")
    encryption_type: str = Field(default="AES-256-GCM")
    cloud_destination: str = Field(..., description="رابط الحاوية السحابية")
    cloud_sync_status: str = Field(default="SYNCED", pattern="^(SYNCED|PENDING|FAILED)$")
    verified_integrity: bool = Field(default=True)


class CreateBackupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    backup_type: str = Field(default="FULL", pattern="^(FULL|INCREMENTAL)$")
    note: Optional[str] = Field(default="نسخة فورية يدوية قبل تحديثات النظام", max_length=255)
    target_cloud_provider: Optional[str] = Field(default="GCS", pattern="^(GCS|S3|CLOUDFLARE_R2)$")


class RestoreBackupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    backup_id: str = Field(..., min_length=5, max_length=64)
    confirmation_passphrase: str = Field(..., min_length=12, description="عبارة التأكيد لمنع الاستعادة غير المقصودة")
    dry_run_first: bool = Field(default=True, description="إجراء فحص تجريبي لسلامة التوافق قبل تطبيق الاستعادة")
