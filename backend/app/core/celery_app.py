from celery import Celery
from app.core.config import settings

from celery.schedules import crontab
from kombu import Queue

broker_url = settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:6379/0"
result_backend = settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:6379/0"

celery_app = Celery(
    "sherpa_worker",
    broker=broker_url,
    backend=result_backend
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    
    # Queue Definitions
    task_default_queue="slow_queue",
    task_queues=(
        Queue("fast_queue"),
        Queue("slow_queue"),
    ),
    
    # Task Routing
    task_routes={
        "send_upcoming_reminders": {"queue": "fast_queue"},
        "sync_all_calendars": {"queue": "fast_queue"},
        # Route ingestion, knowledge, messages, and calendar_sync tasks to slow_queue
        "sync_single_calendar": {"queue": "slow_queue"},
        "send_single_reminder": {"queue": "slow_queue"},
        "process_b2b_ingestion": {"queue": "slow_queue"},
        "process_whatsapp_prospect_message": {"queue": "slow_queue"},
        "sync_vector_task": {"queue": "slow_queue"},
        "delete_vector_task": {"queue": "slow_queue"},
        "update_account_intelligence_task": {"queue": "slow_queue"},
        "process_sales_rep_message": {"queue": "slow_queue"},
        "process_distributor_message": {"queue": "slow_queue"},
        "process_prospect_message": {"queue": "slow_queue"},
        "app.tasks.data_gateway.process_data_import": {"queue": "slow_queue"},
    },
    
    # Global Settings
    task_ignore_result=True,
    result_expires=1800,
    broker_transport_options={"polling_interval": 5.0},
    
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
    'app.tasks.reminders',
    'app.tasks.ingestion',
    'app.tasks.knowledge',
    'app.tasks.messages'
])
