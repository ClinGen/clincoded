import os
import sys
from setuptools import setup, find_packages

here = os.path.abspath(os.path.dirname(__file__))
README = open(os.path.join(here, 'README.rst')).read()
CHANGES = open(os.path.join(here, 'CHANGES.rst')).read()


def read_requires(filename):
    with open(filename) as fp:
        return [l.strip() for l in fp.readlines() if not l.startswith('#')]

requires = read_requires('requirements.txt')

if sys.version_info.major == 2:
    requires.extend([
        'backports.functools_lru_cache',
        'subprocess32',
    ])

tests_require = read_requires('test-requires.txt')

setup(
    name='clincoded',
    version='0.1',
    description='Metadata database for ClinGen',
    long_description=README + '\n\n' + CHANGES,
    packages=find_packages('src'),
    package_dir={'': 'src'},
    include_package_data=True,
    zip_safe=False,
    author='Laurence Rowe',
    author_email='lrowe@stanford.edu',
    url='http://encode-dcc.org',
    license='MIT',
    install_requires=requires,
    tests_require=tests_require,
    extras_require={
        'test': tests_require,
    },
    entry_points='''
        [console_scripts]
        batchupgrade = contentbase.batchupgrade:main
        create-mapping = contentbase.elasticsearch.create_mapping:main

        add-date-created = clincoded.commands.add_date_created:main
        check-files = clincoded.commands.check_files:main
        check-rendering = clincoded.commands.check_rendering:main
        deploy = clincoded.commands.deploy:main
        dev-servers = clincoded.commands.dev_servers:main
        extract_test_data = clincoded.commands.extract_test_data:main
        es-index-data = clincoded.commands.es_index_data:main
        es-index-listener = clincoded.commands.es_index_listener:main
        generate-ontology = clincoded.commands.generate_ontology:main
        import-data = clincoded.commands.import_data:main
        jsonld-rdf = clincoded.commands.jsonld_rdf:main
        migrate-files-aws = clincoded.commands.migrate_files_aws:main
        profile = clincoded.commands.profile:main
        spreadsheet-to-json = clincoded.commands.spreadsheet_to_json:main
        update-file-status = clincoded.commands.update_file_status:main

        [paste.app_factory]
        main = clincoded:main

        [paste.composite_factory]
        indexer = clincoded.commands.es_index_listener:composite

        [paste.filter_app_factory]
        memlimit = clincoded.memlimit:filter_app
        ''',
)
