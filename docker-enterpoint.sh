#! /bin/bash

set -e

cp -r /vendor/{bin,ontology.json,backfill_2683_md5sum_content_md5sum.json,.installed.cfg,.mr.developer.cfg} /code
mkdir -p /code/{eggs,parts,develop-eggs,node_modules}
mount -o bind /vendor/eggs /code/eggs
mount -o bind /vendor/parts /code/parts
mount -o bind /vendor/develop-eggs /code/develop-eggs
mount -o bind /vendor/node_modules /code/node_modules
cat > ~/.npmrc << EOF
unsafe-perm = true
EOF
pushd /code > /dev/null
if [ ! -f /vendor/.buildout_done ]; then
    bin/buildout -c $1
    INITARGS="--clear --init --load"
    touch /vendor/.buildout_done
    cp -r /code/{ontology.json,.installed.cfg,.mr.developer.cfg} /vendor
else
    bin/buildout -c $1 install clincoded
fi
mkdir -p /data/clincoded
chmod 777 /data/clincoded
rm -rf /tmp/clincoded
ln -s /data/clincoded /tmp/clincoded
PATH=$PATH:/usr/lib/postgresql/9.4/bin:/usr/share/elasticsearch/bin bin/dev-servers development.ini --app-name app $INITARGS & while ! nc -z 127.0.0.1 5432 && ! nc -z 127.0.0.1 9200; do sleep 5; done; while bin/grunt watch; sleep 5; do echo; done & while bin/compass watch; sleep 5; do echo; done & bin/pserve development.ini --reload
