#!/usr/bin/env bash
set -e
echo "Starting QuakeWatch India..."
pip install -r requirements.txt
python wsgi.py

