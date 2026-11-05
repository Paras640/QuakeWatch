@echo off
echo =======================================================
echo   Starting QuakeWatch India Web Application
echo =======================================================
python -m pip install -r requirements.txt
python wsgi.py
pause

