# looks like --clear won't reset es, only postgres
# if you don't do this and previous indexing failed
# your new indexing will get hanged at some point
rm -rf /tmp/clincoded/esdata

bin/dev-servers development.ini --app-name app --clear --init --load
# terminate process until we see "log: autovacum start"

pg_ctl -D /tmp/clincoded/pgdata start
# wait till you see `LOG:  autovacuum launcher started`

psql -U postgres << EOF
create database "default";
\c default;
drop database postgres;
create database postgres;
EOF

echo checkpoint_segments='60' >>/tmp/clincoded/pgdata/postgresql.conf;

psql -U postgres << EOF
SELECT pg_reload_conf();
EOF
psql -U postgres << EOF
show checkpoint_segments ;
EOF

pg_ctl -D /tmp/clincoded/pgdata stop

bin/dev-servers development.ini --app-name app 2>&1 | tee dev-servers.log
# leave this process running

# psql "postgresql://postgres@:5432/postgres?host=/tmp/clincoded/pgdata" -f ~/Downloads/pg-dump-2020-03-25.sql
# wait patiently
# And at es log you should probably see this:
# LOG:  autovacuum launcher started
# ERROR:  canceling autovacuum task
# CONTEXT:  automatic analyze of table "postgres.public.propsheets"
# ERROR:  canceling autovacuum task
# CONTEXT:  automatic analyze of table "postgres.public.resources"
# ERROR:  canceling autovacuum task
# CONTEXT:  automatic analyze of table "postgres.public.transactions"

# change checkpoint_segments back to default 3

# postgres reload conf
psql "postgresql://postgres@:5432/postgres?host=/tmp/clincoded/pgdata" << EOF
SELECT pg_reload_conf();
EOF
psql "postgresql://postgres@:5432/postgres?host=/tmp/clincoded/pgdata" << EOF
show checkpoint_segments ;
EOF

# get rid of es water mark check
curl -XPUT "http://localhost:9200/_cluster/settings" \
 -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster": {
      "routing": {
        "allocation.disk.threshold_enabled": false
      }
    }
  }
}'

bin/pserve development.ini 2>&1 | tee pserve.log
# wait patiently, only after indexing finish will you see data in es
# wait till you no longer see new "Indexing /object/...uuid..."
# and at the end you see things like below (PUT indexing):
# es index stats api: https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-stats.html
#
# 2020-03-28 18:56:42,221 INFO  [elasticsearch][listener] PUT http://localhost:9200/clincoded/meta/indexing [status:201 request:0.003s]
# 2020-03-28 18:56:42,486 INFO  [elasticsearch][listener] POST http://localhost:9200/clincoded/_refresh [status:200 request:0.264s]
# 2020-03-28 18:56:42,489 INFO  [clincoded.commands.es_index_listener][listener] {'indexed': 1308, 'timestamp': '2020-03-28T18:56:42.488932', 'last_xmin': None, 'stats': {'db_time': 16499, 'es_count': 3, 'db_count': 45, 'rss_change': 80375808, 'wsgi_end': 1585447002488422, 'rss_end': 244342784, 'wsgi_time': 11987589, 'es_time': 277790, 'wsgi_begin': 1585446990500833, 'rss_begin': 163966976}, 'xmin': 5686, 'types': None}
# 2020-03-28 18:57:42,500 INFO  [elasticsearch][listener] GET http://localhost:9200/clincoded/meta/indexing [status:200 request:0.004s]




# Misc
# 
#

# List all listening ports
# sudo lsof -PiTCP -sTCP:LISTEN

# Obtain PID of elasticsearch 
# jps | grep Elasticsearch

# Send SIGTERM to elasticsearch 
# kill -SIGTERM pid

# Elasticsearch
# entrypoint and args is at `src/clincoded/tests/elasticsearch_fixture.py`
#
# cat indices
# curl "http://localhost:9200/_cat/indices?format=json&pretty"
#
# indexing
# curl http://localhost:9200/clincoded/meta/indexing

# WARNING!
# Using these external config file will cause error
# since seems to do an overwrite instead of merging w/ default configs.
# Elasticsearch has three configuration files (https://www.elastic.co/guide/en/elasticsearch/reference/current/settings.html):
# elasticsearch.yml for configuring Elasticsearch
# jvm.options for configuring Elasticsearch JVM settings
# log4j2.properties for configuring Elasticsearch logging
#
# You can store these config files in `/etc/elasticsearch`
# create the `elasticsearch` directory if not exists
# `elasticsearch_fixture.py` will check this directory for config files

mkdir -p /etc/elasticsearch

# multi-line echo to file https://unix.stackexchange.com/questions/77277/how-to-append-multiple-lines-to-a-file
cat <<EOT >> /etc/elasticsearch/jvm.options
# https://stackoverflow.com/questions/34601697/elasticsearch-out-of-memory
# es doc: https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-configuration-memory.html
# macos: https://stackoverflow.com/questions/57600663/failed-elasticsearch-7-3-install-on-mac-el-capitan-repeated-installation-failur
bootstrap.mlockall: true
EOT

cat <<EOT >> /etc/elasticsearch/elasticsearch.yml
line 1
line 2
EOT


# Reference

# using psql to restore from sql file: https://stackoverflow.com/questions/40292202/unable-to-pg-restore-sql-file-on-remote-linux-vm