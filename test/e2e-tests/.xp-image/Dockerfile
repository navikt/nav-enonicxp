FROM enonic/xp:7.15.0-ubuntu

ARG NAVNO_JAR="navno.jar"
ARG TEST_DATA_JAR="navno-testdata.jar"

# Assuming this computer has 4 GB of RAM, set JVM heap to 30% of available heap or 1230 MB. Also enable JVM OOME heap dump
ENV XP_OPTS: -Xms1230M -Xmx1230M -XX:-HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/enonic-xp/home/data/oom.hprof

EXPOSE 8080 2609 4848

COPY config /enonic-xp/home/config
COPY setenv.sh /enonic-xp/home/
COPY ${NAVNO_JAR} /enonic-xp/home/
COPY ${TEST_DATA_JAR} /enonic-xp/home/
