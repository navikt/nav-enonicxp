FROM alpine:latest

RUN apk --no-cache add curl

COPY .nais/deploy.sh /
COPY .nais/chucknorris-2.2.3.jar /

CMD ["./deploy.sh"]