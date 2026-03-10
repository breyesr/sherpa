from celery import Celery
from app.core.config import settings

from celery.schedules import crontab

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
    task_track_started=True,
    beat_schedule={
        "send-reminders-every-hour": {
            "task": "send_upcoming_reminders",
            "schedule": crontab(minute=0), # Run every hour at minute 0
        },
        "sync-calendars-every-15-mins": {
            "task": "sync_all_calendars",
            "schedule": crontab(minute="*/15"),
        }
    }
)

# Autodiscover tasks
celery_app.autodiscover_tasks([
    'app.tasks.calendar_sync',
    'app.tasks.reminders'
])
