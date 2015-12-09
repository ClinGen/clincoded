import pytest


@pytest.fixture
def user():
    return{
        'first_name': 'Kang',
        'last_name': 'Liu',
        'email': 'kg.liu@stanford.edu',
        'groups': ['admin'],
        'uuid': 'b99c5c3e-ff1e-408a-9806-8941cbfd21ae'
    }


@pytest.fixture
def user_1(user):
    item = user.copy()
    item.update({
        'schema_version': '3',
        'groups': ['admin']
    })
    return item


def test_user_upgrade(app, user_1):
    migrator = app.registry['migrator']
    value = migrator.upgrade('user', user_1, target_version='4')
    assert value['schema_version'] == '4'
    assert value['groups'] == ['curator']
