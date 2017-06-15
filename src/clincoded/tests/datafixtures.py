import pytest

@pytest.fixture
def lab(testapp):
    item = {
        'name': 'encode-lab',
        'title': 'ClinGen lab',
    }
    return testapp.post_json('/lab', item).json['@graph'][0]


@pytest.fixture
def admin(testapp):
    item = {
        'first_name': 'Test',
        'last_name': 'Admin',
        'email': 'test_admin@example.org',
        'groups': ['admin'],
    }
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json


@pytest.fixture
def curator(testapp, lab):
    item = {
        'first_name': 'ClinGen',
        'last_name': 'Submitter',
        'email': 'clingen_submitter@example.org',
        'submits_for': [lab['@id']],
    }
    res = testapp.post_json('/user', item)
    return testapp.get(res.location).json

@pytest.fixture
def gene(testapp):
    item = {
        'symbol': 'DICER1',
        'hgncId': 'HGNC:17098',
    }
    res = testapp.post_json('/gene', item)
    return testapp.get(res.location).json

@pytest.fixture
def disease(testapp):
    item = {
        'diseaseId': 'Orphanet_15',
        'term': 'Achondroplasia',
    }
    res = testapp.post_json('/disease', item)
    return testapp.get(res.location).json

@pytest.fixture
def gdm(testapp, owner, gene, disease):
    item = {
        'gene': [gene['@id']],
        'disease': [disease['@id']],
        'modeInheritance': 'Other',
        'owner': [owner['@id']],
    }
    res = testapp.post_json('/gdm', item)
    return testapp.get(res.location).json

