bin/dev-servers development.ini --app-name app --clear --init

-- outside of /tmp/clincode
pg_ctl -D /tmp/clincoded/pgdata start

psql -U postgres

-- drop / create db or table

create database "default";
\c default;
-- bingo! the dumped sql contains `CREATE TABLE`, so you better drop all tables or the entire db
drop database postgres;
create database postgres;

-- set checkpoint_segments (default is 3):
-- \! echo checkpoint_segments='30' >>/tmp/clincoded/pgdata/postgresql.conf

SELECT pg_reload_conf();
show checkpoint_segments ;

-- stop our temp postgres server
pg_ctl -D /tmp/clincoded/pgdata stop
-- let the app launch dbs, but don't clear data, don't init, and don't load test data
bin/dev-servers development.ini --app-name app

-- Do the restore
-- cd ~/Download
psql -U postgres -f ~/Downloads/pg-dump-2020-03-25.sql
-- or psql "postgresql://postgres@:5432/postgres?host=/tmp/clincoded/pgdata" -f ~/Downloads/pg-dump-2020-03-25.sql
-- by having dev-servers spin up both postgres and db, we make sure
-- when restoring, the notification occurs automatically toward es

-- Ready to test
bin/pserve -v development.ini
bin/grunt dev

-- open browser
-- ! can you login? !

-- inspect es
-- curl http://localhost:9200/clincoded/