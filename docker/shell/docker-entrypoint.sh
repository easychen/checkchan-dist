#!/bin/sh
crond -l 0 

if [ "${VNC:="ON"}" == "ON" ]
then
    pm2 start /checkchan/shell/xvfb.sh 
    sleep 2
    export DISPLAY=:99

    pm2 start /checkchan/shell/x11vnc.sh 
    pm2 start /checkchan/shell/novnc.sh
    pm2 start /checkchan/api/app.js
    pm2 start /checkchan/extension/extension.js --no-daemon

else
    if [ -z "${DEV}" ]
        node /checkchan/api/app.js
    then
        nodemon /checkchan/api/app.js
    fi
    
fi

