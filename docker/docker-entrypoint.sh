#!/bin/sh
XVFB_WHD=${XVFB_WHD:-1220x1020x16}

echo "Starting Xvfb"
Xvfb :99 -ac -screen 0 $XVFB_WHD -nolisten tcp &
sleep 2

export DISPLAY=:99

crond -l 0 

pm2 start /x11vnc.sh 
pm2 start /novnc.sh
pm2 start /api/app.js
pm2 start src/extension.js --no-daemon

