#!/bin/bash
set -e

echo "--- RUNNING MIGRATIONS AND REPAIR ---"
export PYTHONPATH=.
# python3 scripts/dev_tools/surgical_rebuild.py  # Removed to prevent data wiping on every deploy
alembic upgrade head
python3 scripts/diagnostics/production_client_repair.py
python3 scripts/data_ops/initialize_secrets.py
python3 scripts/data_ops/seed_postal_codes_if_empty.py
echo "--- PRE-DEPLOY STEPS COMPLETED ---"
