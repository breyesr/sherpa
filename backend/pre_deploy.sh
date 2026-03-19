#!/bin/bash
set -e

echo "--- RUNNING MIGRATIONS AND REPAIR ---"
export PYTHONPATH=.
alembic upgrade head
python3 production_client_repair.py
echo "--- PRE-DEPLOY STEPS COMPLETED ---"
