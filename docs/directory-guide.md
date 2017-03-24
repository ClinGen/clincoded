This document hopes to serve as a very rough introduction to the directory structure of the project's source. I've focused on directories and files that I found useful or important during my time with the project. All directories are relative to `clincoded/src/`, which is where the majority of the functional code resides.


# Frontend

### `clincoded/static/components/`

Primary location for all user-facing JavaScript components.

* The root folder contains interface-wide components (`activity_indicator.js`, `app.js`, `collection.js`, `curator.js`, `curator_history.js`, etc., to name a few), as well as GCI-centric pages (`*_curation.js` and `*_.submit.js` files).
* `variant_central/` and its directory structure contains components specific to the VCI.
* `case_control/`, `mapping/`, and `score/` also contain helper components specific to the GCI.


### `clincoded/static/img/`

Location of static images used throughout the site. Assets here are referenced via the url `/static/img/[FILENAME]` from the browser.


### `clincoded/static/libs/`

This folder contains additional helper components that are critical to the frontend.

* `parse-*.js` files contain the parsers of XML and JSON data from external resources.
* `registry.js` contains the code that handles view registration that tells the frontend to render pages using the templates specified in `/static/components`.
* `/bootstrap` contains modified bootstrap components (forms, modals, navigation, panels).


### `clincoded/static/scss/`

* The SCSS files under `clincoded/` define the styling used throughout the site.
* The SCSS files under `fontawesome/` define the font-awesome glyphs available for use throughout the site. If you want to use a new icon/the icon you're trying to use does not work, you may need to uncomment its inclusion from `_icons.scss`. Various other font-awesome components and modifiers may be disabled via comments in the files here, as well.


# Backend

### `clincoded/`

* `auth0.py` contains methods that handle session and user properties. When `_csrft_` and `user-properties`/`session-properties` variables are missing from the frontend, this is probably the first place to look.
* `loadxl.py` contains the `ORDER` variable, which specifies JSON schema types to load and in which order.
* `root.py` specifies the 'root view' of the site. Base access control list (ACL) for the non-logged in users is also defined here.


### `clincoded/schemas/`

Location of the schema files which define the data structure for objects used in the project. Please note that the naming convention is all over the place right now and (probably) should be converted to all-lowercase with underscore-delimiters as mixed-typing causes issues with snovault (see comments in [#1287](https://github.com/ClinGen/clincoded/issues/1287)).


### `clincoded/types/`

* `__init__.py` defines object schemas, their embedded objects, and calculated properties. The class names defined here are the names of the objects of its type on the frontend (pre-snovault: cast to lower case; post-snovault: case-sensitive; see comments in [#1287](https://github.com/ClinGen/clincoded/issues/1287)).
* `base.py` specifies the acess control list (ACL) for the different user groups. ACL can also be tweaked on a per-object basis, which ClinGen does not currently use but may become useful in the future for various authentication/authorization groups.
* `curator_page.py` defines the specific view for curator page objects (frontend rendering).


### `clincoded/tests/`

The python files here have specific methods for testing various aspects of the pyramid backend.


### `clincoded/tests/features/`

* `*.feature` files specify the testing steps for the bdd browser tests. Refer to other tests to build steps for your own tests.
* `customsteps.py` lists custom bdd commands for use in building test steps in the `*.feature` files.


### `clincoded/tests/data/inserts/` and `insertsComplete/`

Location of the test data which will load into local instances. Test instances use database dumps so be sure to [update the dumps](/ClinGen/clincoded/blob/dev/docs/database-dumping.rst) prior to code merge, otherwise they will not have the new/updated data on boot.


### `contentbase/`

Primary backend package; contains elasticsearch and batchupgrader settings and code. This entire directory is removed post-snovault as `contentbase` functionality is off-loaded to that project.
