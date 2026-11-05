from typing import Optional

from fastapi import APIRouter, BackgroundTasks, status
from pydantic import BaseModel

from app.modules.fc_financial_monitor.services.financial_service import process_financial_batch
from app.modules.fc_financial_monitor.services.preview_service import preview_financial_file

router = APIRouter()


class PreviewFinancialFileRequest(BaseModel):
    file_path: str
    column_mapping: Optional[dict[str, str]] = None
    default_fc_name: Optional[str] = None


@router.post("/preview-financial-file")
def preview_financial_file_endpoint(payload: PreviewFinancialFileRequest):
    return preview_financial_file(payload.file_path, column_mapping=payload.column_mapping, default_fc_name=payload.default_fc_name)


class ProcessFinancialBatchRequest(BaseModel):
    job_id: str
    filename: str
    column_mapping: Optional[dict[str, str]] = None
    default_fc_name: Optional[str] = None


@router.post("/process-financial-batch", status_code=status.HTTP_202_ACCEPTED)
def process_financial_batch_endpoint(payload: ProcessFinancialBatchRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_financial_batch, payload.job_id, payload.filename, payload.column_mapping, payload.default_fc_name
    )
    return {"accepted": True, "jobId": payload.job_id}
