FROM ubuntu:14.04
RUN apt-get update -qy
RUN apt-get install curl wget python3.4-dev python-virtualenv software-properties-common -qqy
RUN add-apt-repository ppa:webupd8team/java && \
    add-apt-repository "deb http://packages.elasticsearch.org/elasticsearch/1.4/debian stable main" && \
    curl http://packages.elasticsearch.org/GPG-KEY-elasticsearch | apt-key add - && \
    add-apt-repository "deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main" && \
    curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    echo debconf shared/accepted-oracle-license-v1-1 select true | debconf-set-selections && \
    echo debconf shared/accepted-oracle-license-v1-1 seen true | debconf-set-selections
RUN apt-get update -qy
RUN pip install shyaml
ADD cloud-config.yml /tmp/
RUN apt-get install -qqy postgresql-9.4
RUN cat /tmp/cloud-config.yml | shyaml get-value packages | cut -c3- | \
    xargs apt-get install -qqy
ENV LANG C.UTF-8
WORKDIR /code
ADD ["bootstrap.py", "ez_setup.py", "buildout.cfg", "buildout-docker.cfg", \
     "versions.cfg", "package.json", "requirements.txt", "/code/"]
RUN cd /code && python3.4 bootstrap.py -v 2.3.1 --setuptools-version 15.2
RUN cd /code && bin/buildout -c buildout-docker.cfg
RUN mv /code /vendor && mkdir /code
VOLUME /code
ADD docker-enterpoint.sh /usr/local/bin/
EXPOSE 5432 9200 6543
ENTRYPOINT ["/usr/local/bin/docker-enterpoint.sh"]
CMD ["buildout-dev.cfg"]
