FROM --platform=$TARGETPLATFORM node:16-alpine3.15

# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
# ENV CHROME_BIN=/usr/bin/chromium-browser
# ENV CHROME_PATH=/usr/lib/chromium/

# USER 0

# 因为反正要国外网络才能获取到 zenika/alpine-chrome 的 meta，这里替换反而没意义了
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
# RUN sed -i 's/dl-4.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/main" > /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    && echo "http://dl-cdn.alpinelinux.org/alpine/v3.16/main" >> /etc/apk/repositories 

# RUN echo "http://dl-cdn.alpinelinux.org/alpine/v3.16/main" > /etc/apk/repositories \
#     && echo "http://dl-cdn.alpinelinux.org/alpine/v3.16/community" >> /etc/apk/repositories


RUN apk upgrade -U -a && apk add --no-cache chromium xvfb x11vnc bash tzdata git python3 py3-pip libstdc++ harfbuzz nss freetype ttf-freefont  font-noto-emoji php php-phar php-mbstring php-openssl curl

RUN curl -s https://getcomposer.org/installer | php
RUN alias composer='php composer.phar'

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV CHROME_PATH=/usr/lib/chromium/
ENV NOVNC_TAG="v1.3.0"
ENV WEBSOCKIFY_TAG="v0.10.0"

WORKDIR /checkchan
RUN mkdir /checkchan/data
# 让挂丢了目录的同学也可以体验下

RUN git config --global advice.detachedHead false && \
    git clone  https://github.com/novnc/noVNC --branch ${NOVNC_TAG} /checkchan/noVNC && \
    git clone https://github.com/novnc/websockify --branch ${WEBSOCKIFY_TAG} /checkchan/noVNC/utils/websockify

RUN rm -rf /checkchan/noVNC/.git && rm -rf /checkchan/noVNC/utils/websockify/.git

RUN cp /checkchan/noVNC/vnc.html /checkchan/noVNC/index.html
RUN sed -i "/wait ${proxy_pid}/i if [ -n \"\$AUTOCONNECT\" ]; then sed -i \"s/'autoconnect', false/'autoconnect', '\$AUTOCONNECT'/\" /checkchan/noVNC/app/ui.js; fi" /checkchan/noVNC/utils/novnc_proxy
RUN sed -i "/wait ${proxy_pid}/i if [ -n \"\$VNC_PASSWORD\" ]; then sed -i \"s/WebUtil.getConfigVar('password')/'\$VNC_PASSWORD'/\" /checkchan/noVNC/app/ui.js; fi" /checkchan/noVNC/utils/novnc_proxy
RUN sed -i "/wait ${proxy_pid}/i if [ -n \"\$VIEW_ONLY\" ]; then sed -i \"s/UI.rfb.viewOnly = UI.getSetting('view_only');/UI.rfb.viewOnly = \$VIEW_ONLY;/\" /checkchan/noVNC/app/ui.js; fi" /checkchan/noVNC/utils/novnc_proxy
RUN sed -i -- "s/ps -p/ps -o pid | grep/g"  /checkchan/noVNC/utils/novnc_proxy

RUN npm install -g pm2 ts-node typescript '@types/node' nodemon

COPY api /checkchan/api
RUN cd /checkchan/api/ && npm install
RUN echo '* * * * * /usr/local/bin/node /checkchan/api/cron.js > /checkchan/data/app_data/cron.txt' >> /etc/crontabs/root
RUN echo '* * * * * /usr/bin/find /tmp -maxdepth 1 -type d -name 'puppeteer_dev*' -mtime +1 -exec rm -rf {} \; > /dev/null 2>&1' >> /etc/crontabs/root

COPY SourceHanSans.ttf /usr/share/fonts/TTF/SourceHanSans.ttf

COPY src /checkchan/extension
RUN cd /checkchan/extension/ && npm install

COPY shell /checkchan/shell
RUN chmod +x /checkchan/shell/docker-entrypoint.sh

ENV DISPLAY :99
ENV TZ=Asia/Chongqing

EXPOSE 5900 80 8080 9222



ENTRYPOINT ["/checkchan/shell/docker-entrypoint.sh"] 
