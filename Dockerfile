FROM enonic/java8

ENV XP_VERSION 6.14.2-B3

WORKDIR /xp

ADD /c/Users/D152742/Projects/local-configuration/enonic-xp-6.13.1 /xp

EXPOSE 8080

CMD [ "export XP_HOME=/xp/home/", "/xp/bin/server.sh" ]

