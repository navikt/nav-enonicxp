FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-slim

RUN apt-get update \
 && apt-get install -y curl \
 && rm -rf /var/lib/apt/lists/*

ARG appFileName
ENV APP_FILE_NAME=${appFileName}

COPY deploy.sh /
COPY ${appFileName} /

CMD ["sh", "deploy.sh"]