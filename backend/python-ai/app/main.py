from fastapi import FastAPI

from app.api import employee_compliance, fc_financial_monitor, health, jobs
from app.core.config import settings

# No CORS middleware here on purpose: per the platform architecture, the
# browser never talks to this service directly — only the Node.js API
# gateway calls it, server to server.
app = FastAPI(title=settings.app_name)

app.include_router(health.router)
app.include_router(jobs.router)
app.include_router(employee_compliance.router)
app.include_router(fc_financial_monitor.router)
