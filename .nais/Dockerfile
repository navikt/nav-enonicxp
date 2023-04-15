FROM ghcr.io/navikt/nav-enonicxp/alpine-curl:latest

COPY .nais/deploy.sh /
COPY .nais/chucknorris-2.2.3.jar /

CMD ["deploy.sh"]