FROM ghcr.io/navikt/nav-enonicxp/curlimages_curl:latest

COPY .nais/chucknorris-2.2.3.jar /

CMD ["echo", "No command specified!"]

#CMD [ \
#    "curl", \
#    "--cacert", \
#    "/etc/pki/tls/cacert.pem", \
#    "-k", \
#    "https://{{ xpAdminHost }}{{ xpAdminInstallServicePath }}", \
#    "--user", \
#    "{{ XP_USER }}:{{ XP_PASSWORD }}", \
#    "-F", \
#    "file=\"https://repo.enonic.com/public/com/enonic/app/chucknorris/2.2.3/chucknorris-2.2.3.jar\"" \
#]
