FROM alpine:latest

RUN apk --no-cache add curl

ARG appFileName
ENV APP_FILE_NAME=${appFileName}

COPY .nais-deploy-job/deploy.sh /

CMD ["sh","deploy.sh"]