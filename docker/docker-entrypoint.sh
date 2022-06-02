#!/bin/sh
crond -l 0 

pm2 start /xvfb.sh 
sleep 2

export DISPLAY=:99


if ["$VNC" == "ON" ]
then
    pm2 start /x11vnc.sh 
    pm2 start /novnc.sh
fi

pm2 start /api/app.js
pm2 start src/extension.js --no-daemon
#node src/extension.js

