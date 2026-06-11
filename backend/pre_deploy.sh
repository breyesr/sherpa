#!/bin/bash
set -e

echo "--- RUNNING MIGRATIONS AND REPAIR ---"
export PYTHONPATH=.
# python3 surgical_rebuild.py  # Removed to prevent data wiping on every deploy
alembic upgrade head
python3 production_client_repair.py
python3 initialize_secrets.py
echo "--- PRE-DEPLOY STEPS COMPLETED ---"
