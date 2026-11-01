"""
EduCenter Smart ERP - Treasury & Revenue Schemas (Pydantic v2)
"""
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PaymentCreate(BaseSchema):
    enrollment_id: UUID
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2, description="Payment amount in EGP")
    payment_method: str = Field(default="CASH", description="CASH, VISA_POS, VODAFONE_CASH")
    paid_for_period: str = Field(..., min_length=2, max_length=50, description="e.g. شهر نوفمبر أو حصة 4")
    notes: Optional[str] = None


class PaymentResponse(BaseSchema):
    id: UUID
    receipt_number: str
    student_id: UUID
    student_name: str
    group_name: str
    amount: Decimal
    teacher_split_amount: Decimal
    center_split_amount: Decimal
    payment_method: str
    paid_for_period: str
    pdf_receipt_url: Optional[str] = None
    created_at: datetime


class TeacherPayoutRequest(BaseSchema):
    teacher_id: UUID
    amount: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    notes: Optional[str] = Field(default="صرف مستحقات معلم")


class TreasuryBalanceResponse(BaseSchema):
    current_balance: Decimal
    total_cash_in: Decimal
    total_cash_out: Decimal
    last_transaction_at: datetime


class TreasuryTransactionResponse(BaseSchema):
    id: UUID
    transaction_code: str
    transaction_type: str  # CASH_IN / CASH_OUT
    category: str
    amount: Decimal
    balance_after: Decimal
    reference_type: Optional[str]
    notes: Optional[str]
    created_at: datetime
