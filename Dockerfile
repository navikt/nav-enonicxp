FROM gradle:5.0.0-jdk11
ARG http_proxy=http://webproxy-utvikler.nav.no:8088
ENV http_proxy ${http_proxy}
ENV https_proxy ${http_proxy}
ENV no_proxy 155.55.,192.168.,10.,local,rtv.gov,adeo.no,nav.no,aetat.no,devillo.no,oera.no
USER root
RUN apt-get update
RUN apt-get install -y git-core 
RUN apt-get install -y curl 
RUN apt-get install -y build-essential 
RUN apt-get install -y openssl 
RUN apt-get install -y libssl-dev
RUN git clone https://github.com/nodejs/node.git \
 && cd node \
 && ./configure \
 && make \
 && sudo make install