#!/usr/bin/env bash
# Render "Build Command": ./build.sh      "Start Command": gunicorn config.wsgi
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input
python manage.py ensure_admin          # uses ADMIN_USERNAME / ADMIN_PASSWORD env vars
python manage.py seed_products --if-empty
python manage.py seed_offers
