from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "sherpa_worker",
    broker=f"redis://{settings.REDIS_HOST}:6379/0",
    backend=f"redis://{settings.REDIS_HOST}:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True
)

# Autodiscover tasks
celery_app.autodiscover_tasks(['app.tasks.calendar_sync'])
