FROM node:16-alpine3.15

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN sed -i 's/dl-4.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV CHROMIUM_PATH /usr/bin/chromium-browser
COPY SourceHanSans.ttf /usr/share/fonts/TTF/SourceHanSans.ttf

# 测试时注释掉下一行
COPY api /api
RUN cd /api/ && npm install

COPY init.sh /init.sh
RUN chmod +x /init.sh
EXPOSE 80

RUN echo '* * * * * /usr/local/bin/node /api/cron.js > /data/cron.txt' > /etc/crontabs/root


ENTRYPOINT ["/bin/sh", "/init.sh"]
# ENTRYPOINT ["crond", "-l 2", "-f"]