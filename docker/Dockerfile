FROM zenika/alpine-chrome:with-puppeteer

ENV NOVNC_TAG="v1.3.0"
ENV WEBSOCKIFY_TAG="v0.10.0"
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser

USER 0

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN sed -i 's/dl-4.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

RUN apk upgrade -U -a \
    && apk add xvfb x11vnc bash tzdata \
    && rm -rf /var/cache/* \
    && mkdir /var/cache/apk

RUN git config --global advice.detachedHead false && \
    git clone https://github.com/novnc/noVNC --branch ${NOVNC_TAG} /home/chrome/noVNC && \
    git clone https://github.com/novnc/websockify --branch ${WEBSOCKIFY_TAG} /home/chrome/noVNC/utils/websockify

RUN cp /home/chrome/noVNC/vnc.html /home/chrome/noVNC/index.html
RUN sed -i "/wait ${proxy_pid}/i if [ -n \"\$AUTOCONNECT\" ]; then sed -i \"s/'autoconnect', false/'autoconnect', '\$AUTOCONNECT'/\" /home/chrome/noVNC/app/ui.js; fi" /home/chrome/noVNC/utils/novnc_proxy
RUN sed -i "/wait ${proxy_pid}/i if [ -n \"\$VNC_PASSWORD\" ]; then sed -i \"s/WebUtil.getConfigVar('password')/'\$VNC_PASSWORD'/\" /home/chrome/noVNC/app/ui.js; fi" /home/chrome/noVNC/utils/novnc_proxy
RUN sed -i "/wait ${proxy_pid}/i if [ -n \"\$VIEW_ONLY\" ]; then sed -i \"s/UI.rfb.viewOnly = UI.getSetting('view_only');/UI.rfb.viewOnly = \$VIEW_ONLY;/\" /home/chrome/noVNC/app/ui.js; fi" /home/chrome/noVNC/utils/novnc_proxy
RUN sed -i -- "s/ps -p/ps -o pid | grep/g"  /home/chrome/noVNC/utils/novnc_proxy

ADD  src/chrome_extension /home/chrome/checkchan
RUN npm install -g pm2

COPY api /api
RUN cd /api/ && npm install

COPY x11vnc.sh /x11vnc.sh
COPY novnc.sh /novnc.sh
USER chrome

ENV DISPLAY :99
ENV TZ=Asia/Chongqing
EXPOSE 5900 80 8080


COPY --chown=chrome . ./

RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"] 
