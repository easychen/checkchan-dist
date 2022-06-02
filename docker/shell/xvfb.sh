#!/bin/bash
XVFB_WHD=${XVFB_WHD:-1220x1020x16}

echo "Starting Xvfb"
Xvfb :99 -ac -nolock -screen 0 $XVFB_WHD -nolisten tcp