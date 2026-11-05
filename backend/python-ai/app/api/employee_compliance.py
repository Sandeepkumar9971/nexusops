from fastapi import APIRouter, BackgroundTasks, status
from pydantic import BaseModel

from app.modules.employee_compliance.services.compliance_service import process_compliance_batch

router = APIRouter()


class ProcessComplianceBatchRequest(BaseModel):
    job_id: str
    wagesheet_filename: str
    pf_ecr_filename: str
    esic_ecr_filename: str


@router.post("/process-compliance-batch", status_code=status.HTTP_202_ACCEPTED)
def process_compliance_batch_endpoint(payload: ProcessComplianceBatchRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        process_compliance_batch,
        payload.job_id,
        payload.wagesheet_filename,
        payload.pf_ecr_filename,
        payload.esic_ecr_filename,
    )
    return {"accepted": True, "jobId": payload.job_id}
