FROM alpine:latest

RUN apk --no-cache add curl

COPY .nais-deploy-job/deploy.sh /
COPY .nais-deploy-job/chucknorris-2.2.3.jar /

CMD ["sh","deploy.sh"]