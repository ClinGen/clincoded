import pytest


@pytest.fixture
def user():
    return {
        'first_name': 'Kang',
        'last_name': 'Liu',
        'email': 'kg.liu@stanford.edu',
        'groups': ['admin'],
    }


@pytest.fixture
def user_1(user):
    item = user.copy()
    item.update({
        'schema_version': '3',
        'groups': ['admin']
    })
    return item

@pytest.fixture
def user_5(user):
    item = user.copy()
    item.update({
        'schema_version': '5',
        'user_status': 'requested activation'
    })
    return item

def test_user_upgrade(app, user_1):
    migrator = app.registry['migrator']
    value = migrator.upgrade('user', user_1, target_version='4')
    assert value['schema_version'] == '4'
    assert value['groups'] == ['curator']

def test_user_upgrade_5_6(app, user_5):
    migrator = app.registry['migrator']
    value = migrator.upgrade('user', user_5, target_version='6')
    assert value['schema_version'] == '6'
    assert value['user_status'] == 'active'
