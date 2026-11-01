"""
EduCenter Smart ERP - Academic Hierarchy & Groups Router
"""
from uuid import uuid4
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.permissions import CurrentUserContext

router = APIRouter(prefix="/academic", tags=["الهيكل التعليمي والمجموعات (Academic)"])


@router.get("/stages-tree")
async def get_academic_hierarchy(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the full 5-tier educational hierarchy:
    Stages ➡️ Subjects ➡️ Teachers (with split %) ➡️ Groups (Per session / Monthly)
    """
    return [
        {
            "stage_id": str(uuid4()),
            "stage_name": "المرحلة الثانوية",
            "subjects": [
                {
                    "subject_id": str(uuid4()),
                    "subject_name": "الفيزياء",
                    "teachers": [
                        {
                            "teacher_id": str(uuid4()),
                            "name": "أ. محمد عبد المنعم",
                            "phone": "01009876543",
                            "default_split_percent": 70.0,
                            "groups": [
                                {
                                    "group_id": str(uuid4()),
                                    "group_name": "الصف الثالث الثانوي - مجموعة السبت والأربعاء",
                                    "billing_type": "MONTHLY",
                                    "price": Decimal("350.00"),
                                    "teacher_revenue_percent": 70.0,
                                    "enrolled_students_count": 42
                                },
                                {
                                    "group_id": str(uuid4()),
                                    "group_name": "الصف الثالث الثانوي - بالحصة (مراجعات مكثفة)",
                                    "billing_type": "PER_SESSION",
                                    "price": Decimal("60.00"),
                                    "teacher_revenue_percent": 75.0,
                                    "enrolled_students_count": 38
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
