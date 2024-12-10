FROM alpine:latest

RUN apk --no-cache add curl

ARG appFileName
ENV APP_FILE_NAME=${appFileName}

COPY deploy.sh /
COPY ${appFileName} /

CMD ["sh", "deploy.sh"]