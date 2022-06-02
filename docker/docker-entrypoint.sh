#!/bin/sh
crond -l 0 

if [ "${VNC:="ON"}" == "ON" ]
then
    pm2 start /xvfb.sh 
    sleep 2
    export DISPLAY=:99

    pm2 start /x11vnc.sh 
    pm2 start /novnc.sh
    pm2 start /api/app.js
    pm2 start src/extension.js --no-daemon

else
    node /api/app.js
fi

