# 使用多平台支持并继承 easychen/checkchan:2022.10.15.12.53
FROM --platform=$TARGETPLATFORM easychen/checkchan:2022.10.15.12.53

# 复制本地文件到容器中的指定路径
COPY api /checkchan/api
COPY src /checkchan/extension
RUN cd /checkchan/extension/ && npm install