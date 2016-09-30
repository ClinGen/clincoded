import pytest

pytestmark = [
    pytest.mark.persona,
    pytest.mark.slow,
]


def persona_test_data():
    domain = 'mrmin.auth0.com'
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJYc0x0RHNkZ1Y1b2ExUzlrVlBDNUFDUzk5U1RkVkhUeSIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX19LCJpYXQiOjE0NzUxOTI2ODcsImp0aSI6ImVhMzM3Zjg1ODQ1MGQ2YzQzZDk1ZGJhZTFkZGExNmUzIn0.tfAAji7tyE8VuPfGz7GsIJdAwYNywbf66IpO89tFSxw'

    auth0 = Auth0(domain, token)
    return auth0


@pytest.fixture(scope='session')
def persona_assertion(app_settings):
    audience = app_settings['persona.audiences']
    return persona_test_data(audience)


@pytest.fixture(scope='session')
def persona_bad_assertion():
    return persona_test_data('http://badaudience')


def test_login_no_csrf(anontestapp, persona_assertion):
    res = anontestapp.post_json('/login', persona_assertion, status=400)
    assert 'Set-Cookie' in res.headers


def test_login_unknown_user(anontestapp, persona_assertion):
    res = anontestapp.get('/session')
    csrf_token = str(res.json['_csrft_'])
    headers = {'X-CSRF-Token': csrf_token}
    res = anontestapp.post_json('/login', persona_assertion, headers=headers, status=403)
    assert 'Set-Cookie' in res.headers


def test_login_bad_audience(anontestapp, persona_bad_assertion):
    res = anontestapp.get('/session')
    csrf_token = str(res.json['_csrft_'])
    headers = {'X-CSRF-Token': csrf_token}
    res = anontestapp.post_json('/login', persona_bad_assertion, headers=headers, status=403)
    assert 'Set-Cookie' in res.headers


def test_login_logout(testapp, anontestapp, persona_assertion):
    # Create a user with the persona email
    url = '/users/'
    email = persona_assertion['email']
    item = {
        'email': email,
        'first_name': 'Persona',
        'last_name': 'Test User',
    }
    testapp.post_json(url, item, status=201)

    # Log in
    res = anontestapp.get('/session')
    csrf_token = str(res.json['_csrft_'])
    headers = {'X-CSRF-Token': csrf_token}
    res = anontestapp.post_json('/login', persona_assertion, headers=headers, status=200)
    assert 'Set-Cookie' in res.headers
    res = anontestapp.get('/session')
    assert res.json['auth.userid'] == email

    # Log out
    res = anontestapp.get('/logout?redirect=false', headers=headers, status=200)
    assert 'Set-Cookie' in res.headers
    res = anontestapp.get('/session')
    assert 'auth.userid' not in res.json
