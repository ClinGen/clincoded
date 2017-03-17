Test Database Dumps
===================

Why?
----

There are currently two database dumps that contains starting test data that must be updated on every schema/database entry change. This is because the AWS instances uses these dumps as a data source, not the .json files. If you make a change to the schema/database entries, then make changes on the UI to reflect these changes, but do not update the database dumps, the AWS instances you spin up with your changes will not function as expected.

How?
----
1. Start up a local test server with the test data
2. Dump the test data database using this command::

    pg_dump --no-owner postgresql://postgres@:5432/postgres?host=/tmp/snovault/pgdata > DEV_TEST_DB_DUMP_9.4

3. Stop the server
4. Move the test ``gene.json`` and ``orphaphenotype.json`` files out of ``src/clincoded/tests/data/inserts``, and replace them with the ones in ``src/clincoded/tests/data/insertsComplete``::

    mv src/clincoded/tests/data/inserts/gene.json src/clincoded/tests/data/
    mv src/clincoded/tests/data/inserts/orphaphenotype.json src/clincoded/tests/data/
    cp src/clincoded/tests/data/insertsComplete/gene.json src/clincoded/tests/data/inserts/gene.json
    cp src/clincoded/tests/data/insertsComplete/orphaphenotype.json src/clincoded/tests/data/inserts/orphaphenotype.json

5. Start the server again; this time the process will take significantly longer as its loading the complete Gene and Disease datasets
6. Dump the complete data database using this command::

    pg_dump --no-owner postgresql://postgres@:5432/postgres?host=/tmp/snovault/pgdata > DEV_TEST_DB_DUMP_GENES_9.4

7. Stop the server
8. Restore the test data files so you you don't have to go through loading the huge dataset every time you spin up a server for testing purposes::

    rm src/clincoded/tests/data/inserts/gene.json
    rm src/clincoded/tests/data/inserts/orphaphenotype.json
    mv src/clincoded/tests/data/gene.json src/clincoded/tests/data/inserts/
    mv src/clincoded/tests/data/orphaphenotype.json src/clincoded/tests/data/inserts/

9. Commit and push your newly updated database dumps.

Hopefully this will be automated in the near future, but until then, this manual method is what we have.
