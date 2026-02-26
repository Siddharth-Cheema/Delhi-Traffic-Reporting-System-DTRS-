#!/bin/bash
echo "Starting Mobile App... Logs are being written to logs/mobile_logs.txt"
cd apps/mobile-app
npm start 2>&1 | tee ../../logs/mobile_logs.txt
