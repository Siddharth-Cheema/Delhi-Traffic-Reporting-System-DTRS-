#!/bin/bash
echo "Starting API Service... Logs are being written to logs/api_logs.txt"
cd apps/api-service

# Check if we are in Windows (Git Bash) and use 'python', otherwise 'python3'
PYTHON_CMD="python"
if ! command -v python &> /dev/null; then
    PYTHON_CMD="python3"
fi

$PYTHON_CMD run_server.py 2>&1 | tee ../../logs/api_logs.txt
