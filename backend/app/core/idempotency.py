import functools
import hashlib
import json
import logging
from typing import Callable, Any
import redis
from app.core.config import settings

logger = logging.getLogger(__name__)

def _get_redis_client() -> redis.Redis:
    redis_url = settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:6379/0"
    return redis.Redis.from_url(redis_url)

def _serialize_arg(arg: Any) -> Any:
    """Helper to convert complex task arguments into JSON-serializable types."""
    if hasattr(arg, "name") and hasattr(arg, "request"):  # Celery Task 'self' instance
        return None
    if isinstance(arg, (str, int, float, bool, type(None))):
        return arg
    if isinstance(arg, (list, tuple)):
        return [_serialize_arg(x) for x in arg if _serialize_arg(x) is not None]
    if isinstance(arg, dict):
        return {str(k): _serialize_arg(v) for k, v in arg.items()}
    return str(arg)

def idempotent_task(ttl: int = 3600) -> Callable:
    """
    Decorator for Celery tasks to ensure idempotent execution using Redis locks.
    Prevents duplicate task processing within the specified TTL window.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Filter out Celery task 'self' if bound task
            filtered_args = [_serialize_arg(a) for a in args]
            filtered_args = [a for a in filtered_args if a is not None]
            filtered_kwargs = _serialize_arg(kwargs)

            payload = json.dumps({"args": filtered_args, "kwargs": filtered_kwargs}, sort_keys=True)
            arg_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
            task_name = func.__name__
            redis_key = f"idempotent:{task_name}:{arg_hash}"

            try:
                r = _get_redis_client()
                # set nx=True returns True if key was set (new task), None/False if existed
                acquired = r.set(redis_key, "1", nx=True, ex=ttl)
                if not acquired:
                    logger.warning(
                        "Task %s skipped due to duplicate payload (hash: %s, key: %s)",
                        task_name,
                        arg_hash,
                        redis_key,
                    )
                    return None
            except redis.RedisError as e:
                logger.warning(
                    "Redis error during idempotency check for %s: %s. Executing task without idempotency check.",
                    task_name,
                    e,
                )

            return func(*args, **kwargs)

        return wrapper

    return decorator
