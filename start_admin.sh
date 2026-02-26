#!/bin/bash
echo "Starting Admin Dashboard... Logs are being written to logs/admin_logs.txt"
cd apps/admin-dashboard
npm run dev 2>&1 | tee ../../logs/admin_logs.txt
