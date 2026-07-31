@echo off
cd /d "C:\Users\USER\Downloads\trader-bot"
start /B pnpm next dev --port 3001 > next-dev.log 2>&1
