"""
EduCenter Smart ERP - Audit Trail & Sensitive Operations Schemas (Pydantic v2)
Tracks all modifications, deletions, and additions on students, treasury, payments, and payroll.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AuditLogEntry(BaseSchema):
    id: int = Field(..., description="Unique auto-incremented audit log ID")
    user_id: Optional[str] = Field(default=None, description="UUID of the operating user if authenticated")
    username: str = Field(default="SYSTEM", description="Operator username who executed the change")
    action: str = Field(..., description="INSERT | UPDATE | DELETE")
    table_name: str = Field(..., description="Target database table: students, treasury_transactions, etc.")
    record_id: str = Field(..., description="Identifier or primary key of the modified record")
    old_values: Optional[Dict[str, Any]] = Field(default=None, description="Snapshot of fields before change/deletion")
    new_values: Optional[Dict[str, Any]] = Field(default=None, description="Snapshot of fields after insertion/change")
    changed_fields: List[str] = Field(default_factory=list, description="Array of columns that were updated")
    description: str = Field(..., description="Human-readable explanation in Arabic")
    ip_address: Optional[str] = Field(default=None, description="Client IP address")
    created_at: datetime = Field(..., description="Timestamp of the operation")


class AuditStatsResponse(BaseSchema):
    total_logs: int
    insert_count: int
    update_count: int
    delete_count: int
    critical_financial_events_today: int
    last_audit_timestamp: Optional[datetime]
    top_affected_tables: List[Dict[str, Any]] = Field(default_factory=list)


class SimulateAuditEventRequest(BaseSchema):
    table_name: str = Field(..., description="Target table: students | treasury_transactions | student_payments | staff_salaries")
    action: str = Field(..., description="INSERT | UPDATE | DELETE")
    record_id: str = Field(..., description="Target record code or ID")
    username: str = Field(default="أحمد الشناوي (مدير الخزنة)", description="Operator username")
    old_values: Optional[Dict[str, Any]] = Field(default=None, description="Old JSON data")
    new_values: Optional[Dict[str, Any]] = Field(default=None, description="New JSON data")
    note: Optional[str] = Field(default=None, description="Optional justification note")
