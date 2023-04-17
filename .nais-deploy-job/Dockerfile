FROM alpine:latest

RUN apk --no-cache add curl

ARG APP_FILE_NAME
ENV APP_FILE_NAME=$APP_FILE_NAME

COPY .nais-deploy-job/deploy.sh /

CMD ["sh","deploy.sh"]