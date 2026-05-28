#!/bin/bash
set -e

echo "--- RUNNING MIGRATIONS AND REPAIR ---"
export PYTHONPATH=.
python3 surgical_rebuild.py
alembic stamp head
python3 production_client_repair.py
python3 initialize_secrets.py
echo "--- PRE-DEPLOY STEPS COMPLETED ---"
