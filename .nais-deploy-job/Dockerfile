FROM alpine:latest

RUN apk --no-cache add curl

ARG appFileName
ENV APP_FILE_NAME=${appFileName}

RUN echo $APP_FILE_NAME

COPY .nais-deploy-job/deploy.sh /
COPY build/libs/$APP_FILE_NAME /

CMD ["sh", "deploy.sh"]