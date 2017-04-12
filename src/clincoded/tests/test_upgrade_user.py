import pytest


@pytest.fixture
def user():
    return{
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


def test_user_upgrade(upgrader, user_1):
    value = upgrader.upgrade('user', user_1, target_version='4')
    assert value['schema_version'] == '4'
    assert value['groups'] == ['curator']
