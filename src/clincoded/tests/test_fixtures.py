import pytest


@pytest.yield_fixture(scope='session')
def minitestdata(app, connection):
    tx = connection.begin_nested()

    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    item = {
        'term': 'AchondroplasiaTest',
        'id': 'Orphanet_9999',
    }
    testapp.post_json('/disease', item, status=201)

    yield
    tx.rollback()


@pytest.yield_fixture(scope='session')
def minitestdata2(app, connection):
    tx = connection.begin_nested()

    from webtest import TestApp
    environ = {
        'HTTP_ACCEPT': 'application/json',
        'REMOTE_USER': 'TEST',
    }
    testapp = TestApp(app, environ)

    item = {
        'term': 'AchondroplasiaTest3',
        'id': 'Orphanet_9997',
    }
    testapp.post_json('/disease', item, status=201)

    yield
    tx.rollback()


@pytest.mark.usefixtures('minitestdata')
def test_fixtures1(testapp):
    """ This test is not really exhaustive.

    Still need to inspect the sql log to verify fixture correctness.
    """
    res = testapp.get('/disease').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 1

    # Trigger an error
    item = {'foo': 'bar'}
    res = testapp.post_json('/disease', item, status=422)
    assert res.json['errors']

    res = testapp.get('/disease').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 1

    item = {
        'term': 'AchondroplasiaTest2',
        'id': 'Orphanet_9998',
    }
    testapp.post_json('/disease', item, status=201)

    res = testapp.get('/disease').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 2

    # Trigger an error
    item = {'foo': 'bar'}
    res = testapp.post_json('/disease', item, status=422)
    assert res.json['errors']

    res = testapp.get('/disease').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 2


def test_fixtures2(minitestdata2, testapp):
    # http://stackoverflow.com/questions/15775601/mutually-exclusive-fixtures
    res = testapp.get('/disease/').maybe_follow()
    items = res.json['@graph']
    assert len(items) == 1
