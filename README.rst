=======================================
ClinGen Curation Database and Interface
=======================================
DEV
***
.. image:: https://travis-ci.org/ClinGen/clincoded.svg?branch=dev
    :target: https://travis-ci.org/ClinGen/clincoded

PROD
*******
.. image:: https://travis-ci.org/ClinGen/clincoded.svg?branch=master
    :target: https://travis-ci.org/ClinGen/clincoded

This software creates an object store and user interface for the collection of mappings between human diseases and genetic variation as input by the ClinGen curation staff.

Baseline Dependendencies
=========================

You will need a system with at least 2GB of available memory - ``npm install`` will need
about 1GB to succeed, while elasticsearch will need at least 2GB for the JVM.

Mac OSX
--------
If you do not have homebrew installed, you can get it at `brew.sh
<https://brew.sh/>`_  You may also want to have it globally available; if you run
bash, you can append ``export PATH=/usr/local/opt/postgresql@9.4/bin:$PATH`` to your ``~/.bash_profile`` file.

#. Verify that homebrew is working properly::

    $ brew doctor


#.  Install or update dependencies

    ::

    $ brew install libevent libmagic libxml2 libxslt openssl graphviz
    $ brew install freetype libjpeg libtiff littlecms webp
    $ brew tap homebrew/cask
    $ brew cask install chromedriver # required for pillow


    Note: For Mac < 10.9, the system python doesn't work. You should install Python 3.4.x; the
    preferred method is to use pyEnv, covered further down the list

#. Install postgres
   ::

    $ brew install postgres@9.4

#. Install elasticsearch

   - First, download `v1.7.4 <https://www.elastic.co/downloads/past-releases/elasticsearch-1-7-4>`_.
   - Next, unpack the tarball into a directory of your choice; suggested location is ``/opt/elasticsearch``.
   - Finally, create symbolic links to the install location

   ::

        $ ln -s [install location]/bin/elasticsearch /usr/local/bin/elasticsearch
        $ ln -s [install location]/bin/elasticsearch.in.sh /usr/local/bin/elasticsearch.in.sh


#. Install pyEnv and python 3.4

   ::

   $ brew install pyenv
   $ pyenv install 3.4.3


   If pyEnv fails on installation, this may help: https://github.com/pyenv/pyenv/wiki/Common-build-problems

   To make the newly-installed version of python the system default

   ::

        $ pyenv global 3.4.3

   And to confirm the results

   ::

        $ python —version

#. Install Node v6 (v6 is the current LTS version https://github.com/nodejs/LTS#lts-schedule ):

  * check node version::

    $ node --version

  * install via homebrew (homebrew will indicate if you need to unlink a prior version of node)::

    $ brew install node@6

  * or install via nvm::

    $ npm install -g nvm
    $ nvm install 6
    $ nvm use 6

Insure you are using npm 3 (check version: `npm --version`), if necessary update npm to npm 3::

    $ npm install npm -g


If you need to update dependencies::

    $ brew update
    $ brew upgrade
    $ make clean

You can also use the Makefile to set up for a clean buildout::

    $ make clean

Then proceed to the section on installing python, node, and ruby depdendencies.

Linux
-----

See cloud-config.yml in this repository.  Use apt-get or yum or other package manager to install everything under packages.   The rest of the install instructions assume you have python3.4 in your path.

Install python, node and ruby dependencies
==========================================

Note: These will all be installed locally for the application and should never conflict with other system packages

Step 1b: Run buildout::

    $ python3.4 bootstrap.py -v 2.9.5 --setuptools-version 15.2
    $ bin/buildout -c buildout-dev.cfg

If you see a clang error like this::

    clang: error: unknown argument: '-mno-fused-madd' [-Wunused-command-line-argument-hard-error-in-future]

You can try::

    $ ARCHFLAGS=-Wno-error=unused-command-line-argument-hard-error-in-future bin/buildout

If it does not exist, set a session key::

    $ cat /dev/urandom | head -c 256 | base64 > session-secret.b64

Start the application locally
================================

In one terminal startup the database servers with::

    $ bin/dev-servers development.ini --app-name app --clear --init --load

This will first clear any existing data in /tmp/clincoded.
Then postgres and elasticsearch servers will be initiated within /tmp/clincoded.
The servers are started, and finally the test set will be loaded.

In a second terminal, run the app in with::

    $ bin/pserve development.ini

Indexing will then proceed in a background thread similar to the production setup.

Browse to the interface at http://localhost:6543/.

Run the tests locally  (tests also run on travis-ci with every push)
====================================================================

To run specific tests locally::

    $ bin/test -k test_name

To run with a debugger::

    $ bin/test --pdb

Specific tests to run locally for schema changes::

    $ bin/test -k test_load_workbook

Run the Pyramid tests with::

    $ bin/test -m "not bdd"

Run the Browser tests with::

    $ bin/test -m bdd -v -v

Run the Javascript tests with::

    $ npm test

Or if you need to supply command line arguments::

    $ ./node_modules/.bin/jest

Notes on modifying the local (Postgres) database
================================================

Note:  The below is generally superceeded by the dev-servers command which creates a temporary PG db, then throws it away.  But this might be useful for some deep debugging.

If you wish a clean db wipe for DEVELOPMENT::

    $ dropdb clincoded
    ...
    $ createdb clincoded
    $ pg_ctl -D /usr/local/var/postgres -l pg.log start

Database setup on VMs::

    # service postgresql-9.4 initdb
    # service postgresql-9.4 start
    # sudo -u postgres createuser --createdb clincoded

Then as the clincoded user::

    $ createdb clincoded

To dump a postgres database:
    pg_dump -Fc clincoded > FILE_NAME  (as user clincoded on demo vm)
    (FILE_NAME for production is ~/clincoded/archive/clincoded-YYYYMMDD.dump)

To restore a postgres database:
    pg_restore -d clincoded FILE_NAME (as user clincoded on demo vm)

Notes on manual creation of ElasticSearch mapping
-------------------------------------------------
    $ bin/create-mapping production.ini

Notes on SASS/Compass
=====================

`SASS <http://sass-lang.com/>`_ and `Compass <http://compass-style.org/>`_ are being used. Before running to app, you need to builld the css files by starting 'compass watch' or doing a 'compass compile' (see below).

Installing
----------

Both can be installed via Ruby gems::

    $ gem install sass
    $ gem install compass

Compiling "on the fly"
----------------------

Compass can watch for any changes made to .scss files and instantly compile them to .css. To start this, from the root of the project (where config.rb is) do::

    $ compass watch

You can specify whether the compiled CSS is minified or not in config.rb. (Currently, it is set to minify.)

Force compiling
---------------

    $ compass compile

Again, you can specify whether the compiled CSS is minified or not in config.rb.

Also see the `Compass Command Line Documentation <http://compass-style.org/help/tutorials/command-line/>`_ and the `Configuration Reference <http://compass-style.org/help/tutorials/configuration-reference/>`_.

And of course::

    $ compass help


Notes on SublimeLinter
======================

To setup SublimeLinter with Sublime Text 3, first install the linters::

    $ easy_install-2.7 flake8
    $ npm install -g eslint
    $ npm install -g eslint-plugin-react

After first setting up `Package Control`_ (follow install and usage instructions on site), use it to install the following packages in Sublime Text 3:

    * sublimelinter
    * sublimelinter-flake8
    * SublimeLinter-contrib-eslint (`eslint instructions <https://github.com/roadhump/SublimeLinter-eslint#plugin-installation>`_)
    * babel (`babel instructions <https://github.com/babel/babel-sublime#setting-as-the-default-syntax>`_)

.. _`Package Control`: https://sublime.wbond.net/

Troubleshooting the install
===========================
- The ``[parts, bin]`` directories are generated by the bootstrapping process.  It's safe to delete this directory and re-run the bootstrapper if you run into errors during the buildout step
- **OSX**: nvm may fail with xcode related issues.  If so, this may help: https://github.com/nodejs/node-gyp/issues/569
- Postgres server not responding?  Start the Postgres server if it hasn't yet started.  You can check by running:

  ::

        $ psql --username=postgres --host=/tmp/clincoded/pgdata/

  This should put you into the Potgres CLI.  If it's not running, you can start it by running:

  ::

        $ pg_ctl -D /tmp/clincoded/pgdata -l psql_log.log start

  Note that the ``-l`` option indicates a log file - suggested location is ``/var/log/postgres``