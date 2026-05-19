FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:24-slim

USER root
WORKDIR /

ARG appFileName
ENV APP_FILE_NAME=${appFileName}

COPY deploy.js /
COPY ${appFileName} /

CMD ["node", "/deploy.js"]