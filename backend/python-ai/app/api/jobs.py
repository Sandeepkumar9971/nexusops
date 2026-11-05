from fastapi import APIRouter, BackgroundTasks, status
from pydantic import BaseModel

from app.modules.parcel_intelligence.service import process_parcel_job

router = APIRouter()


class ProcessJobRequest(BaseModel):
    job_id: str
    file_paths: list[str]


@router.post("/process-job", status_code=status.HTTP_202_ACCEPTED)
def process_job(payload: ProcessJobRequest, background_tasks: BackgroundTasks):
    # In-process background task — no Redis/Celery dependency for now.
    # app/workers/celery_app.py and the parcel-intelligence tasks.py wrapper
    # are already written for when Phase 9 (real distributed queue) resumes;
    # swapping back in is just changing this one call.
    background_tasks.add_task(process_parcel_job, payload.job_id, payload.file_paths)
    return {"accepted": True, "jobId": payload.job_id}
