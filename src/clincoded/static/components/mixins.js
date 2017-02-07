/*jshint scripturl:true */
'use strict';
var _ = require('underscore');
var React = require('react');
var url = require('url');
var origin = require('../libs/origin');
var $script = require('scriptjs');
var serialize = require('form-serialize');
var ga = require('google-analytics');


var parseError = module.exports.parseError = function (response) {
    if (response instanceof Error) {
        return Promise.resolve({
            status: 'error',
            title: response.message,
            '@type': ['ajax_error', 'error']
        });
    }
    var content_type = response.headers.get('Content-Type') || '';
    content_type = content_type.split(';')[0];
    if (content_type == 'application/json') {
        return response.json();
    }
    return Promise.resolve({
        status: 'error',
        title: response.statusText,
        code: response.status,
        '@type': ['ajax_error', 'error']
    });
};

var parseAndLogError = module.exports.parseAndLogError = function (cause, response) {
    var promise = parseError(response);
    promise.then(data => {
        ga('send', 'exception', {
            'exDescription': '' + cause + ':' + data.code + ':' + data.title,
            'location': window.location.href
        });
    });
    return promise;
};


var contentTypeIsJSON = module.exports.contentTypeIsJSON = function (content_type) {
    return (content_type || '').split(';')[0].split('/').pop().split('+').pop() === 'json';
};


module.exports.RenderLess = {
    shouldComponentUpdate: function (nextProps, nextState) {
        var key;
        if (nextProps) {
            for (key in nextProps) {
                if (nextProps[key] !== this.props[key]) {
                    console.log('changed props: %s', key);
                    return true;
                }
            }
        }
        if (nextState) {
            for (key in nextState) {
                if (nextState[key] !== this.state[key]) {
                    console.log('changed state: %s', key);
                    return true;
                }
            }
        }
        return false;
    }
};

class Timeout {
    constructor(timeout) {
        this.promise = new Promise(resolve => setTimeout(resolve.bind(undefined, this), timeout));
    }
}

module.exports.Auth0 = {
    // Mixin for providing Auth0 Authentication functionality. Call in app.js
    childContextTypes: {
        fetch: React.PropTypes.func,
        session: React.PropTypes.object,
        session_properties: React.PropTypes.object
    },

    getChildContext: function() {
        return {
            fetch: this.fetch,
            session: this.state.session,
            session_properties: this.state.session_properties
        };
    },

    getInitialState: function() {
        // Define loadingComplete and session here so they are available to mixin, as well as main app
        return {
            loadingComplete: false,
            session: null,
            session_properties: {}
        };
    },

    componentDidMount: function() {
        // Login / logout actions must be deferred until Auth0 is ready.
        var session_cookie = this.extractSessionCookie();
        var session = this.parseSessionCookie(session_cookie);
        if (session['auth.userid']) {
            this.fetchSessionProperties();
        }
        this.setProps({
            href: window.location.href,
            session_cookie: session_cookie
        });


        const logoUrl = '/static/img/clingen-logo-only.svg';
        // switch this out once we've upgraded to react15'
        //var lock_ = require('auth0-lock');
        if (window.Auth0Lock !== undefined) {
            this.lock = new window.Auth0Lock('fucNqQ1x5rSFOjXNqtm0NWzzxG1g1xVs', 'clingen.auth0.com', {
                additionalSignUpFields: [
                    {
                        name: "name",
                        placeholder: "Your full name"
                    }
                ],
                auth: {
                    redirect: false
                },
                avatar: null,
                socialButtonStyle: 'big',
                theme: {
                    logo: logoUrl,
                    primaryColor: '#294297'
                },
                languageDictionary: {
                    title: "ClinGen Curator Interface"
                }
            });
            this.lock.on("authenticated", this.handleAuth0Login.bind(this));
        }


            /*
        } else {
            // Auth0Lock is not defined, so it either did not load, was blocked by the user, or jest testing is occuring.
            // A custom error cannot be set, otherwise jest tests will fail due to the error page returning
            // instead of the normal home page as jest expects. The following is a workaround to mimic the normal
            // home page despite Auth0Lock not being found.
            let auth0_not_found = {};
            auth0_not_found = {
                "@id": "/",
                "@type": ["portal"],
                "portal_title": "ClinGen",
                "title": "Home"
            };
            this.setState({context: auth0_not_found});
        }
    */

    },

    fetch: function (url, options) {
        options = _.extend({credentials: 'same-origin'}, options);
        var http_method = options.method || 'GET';
        if (!(http_method === 'GET' || http_method === 'HEAD')) {
            var headers = options.headers = _.extend({}, options.headers);
            var session = this.state.session;
            if (session && session._csrft_ && !options.xcsrf_disable) {
                headers['X-CSRF-Token'] = session._csrft_;
            }
        }
        // Strip url fragment.
        var url_hash = url.indexOf('#');
        if (url_hash > -1) {
            url = url.slice(0, url_hash);
        }
        var request = fetch(url, options);
        request.xhr_begin = 1 * new Date();
        request.then(response => {
            request.xhr_end = 1 * new Date();
            var stats_header = response.headers.get('X-Stats') || '';
            request.server_stats = require('querystring').parse(stats_header);
            request.etag = response.headers.get('ETag');
            var session_cookie = this.extractSessionCookie();
            if (this.props.session_cookie !== session_cookie) {
                this.setProps({session_cookie: session_cookie});
            }
        });
        return request;
    },

    extractSessionCookie: function () {
        var cookie = require('cookie-monster');
        return cookie(document).get('session');
    },

    componentWillReceiveProps: function (nextProps) {
        if (!this.state.session || (this.props.session_cookie !== nextProps.session_cookie)) {
            var nextState = {};
            nextState.session = this.parseSessionCookie(nextProps.session_cookie);
            if (!nextState.session['auth.userid']) {
                nextState.session_properties = {};
            } else if (nextState.session['auth.userid'] !== (this.state.session && this.state.session['auth.userid'])) {
                this.fetchSessionProperties();
            }
            this.setState(nextState);
        }
    },

    componentDidUpdate: function (prevProps, prevState) {
        var key;
        if (this.props) {
            for (key in this.props) {
                if (this.props[key] !== prevProps[key]) {
                    console.log('changed props: %s', key);
                }
            }
        }
        if (this.state) {
            for (key in this.state) {
                if (this.state[key] !== prevState[key]) {
                    console.log('changed state: %s', key);
                }
            }
        }
    },

    parseSessionCookie: function (session_cookie) {
        var Buffer = require('buffer').Buffer;
        var session;
        if (session_cookie) {
            // URL-safe base64
            session_cookie = session_cookie.replace(/\-/g, '+').replace(/\_/g, '/');
            // First 64 chars is the sha-512 server signature
            // Payload is [accessed, created, data]
            try {
                session = JSON.parse(Buffer(session_cookie, 'base64').slice(64).toString())[2];
            } catch (e) {
            }
        }
        return session || {};
    },

    fetchSessionProperties: function() {
        if (this.sessionPropertiesRequest) {
            return;
        }
        this.sessionPropertiesRequest = true;
        this.fetch('/session-properties', {
            headers: {'Accept': 'application/json'}
        })
        .then(response => {
            this.sessionPropertiesRequest = null;
            if (!response.ok) throw response;
            return response.json();
        })
        .then(session_properties => {
            this.setState({session_properties: session_properties});
        });
    },

    handleAuth0Login: function (authResult, retrying) {
        var accessToken = authResult.accessToken ? authResult.accessToken : authResult.access_token;
        if (!accessToken) return;
        this.sessionPropertiesRequest = true;
        this.fetch('/login', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({accessToken: accessToken})
        })
        .then(response => {
            this.lock.hide();
            if (!response.ok) throw response;
            return response.json();
        })
        .then(session_properties => {
            this.setState({session: session_properties});
            this.sessionPropertiesRequest = null;
            var next_url = window.location.href;
            if (!(window.location.hash == '#logged-out' || window.location.pathname == '' || window.location.pathname == '/')) {
                this.navigate(next_url, {replace: true}).then(() => {
                    this.setState({loadingComplete: true});
                });
            } else {
                this.setState({loadingComplete: true});
            }
        }, err => {
            this.sessionPropertiesRequest = null;
            parseError(err).then(data => {
                // Server session creds might have changed.
                if (data.code === 400 && data.detail.indexOf('CSRF') !== -1) {
                    if (!retrying) {
                        window.setTimeout(this.handleAuth0Login);
                        return;
                    }
                }
                // If there is an error, show the error messages
                this.setProps({context: data});
            });
        });
    },

    triggerLogin: function (event) {
        if (this.state.session && !this.state.session._csrft_) {
            this.fetch('/session');
        }
        this.lock.show();
    },

    triggerLogout: function (event) {
        var session = this.state.session;
        if (!(session && session['auth.userid'])) return;
        this.fetch('/logout?redirect=false', {
            headers: {'Accept': 'application/json'}
        })
        .then(response => {
            if (!response.ok) throw response;
            return response.json();
        })
        .then(data => {
            this.DISABLE_POPSTATE = true;
            var old_path = window.location.pathname + window.location.search;
            window.location.assign('/#logged-out');
            if (old_path == '/') {
                window.location.reload();
            }
        }, err => {
            parseError(err).then(data => {
                data.title = 'Logout failure: ' + data.title;
                this.setProps({context: data});
            });
        });
    },

    triggerAutoLogin: function(e, retrying) {
        // pressing the Demo Login button automatically logs in the user to the test curator
        // account. Only enabled on non-production/curation instances
        if (this.state.session && !this.state.session._csrft_) {
            this.fetch('/session');
        }

        this.fetch(
            'https://clingen.auth0.com/oauth/ro', // AUTH0: LOGIN DOMAIN
            {
                xcsrf_disable: true,
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "client_id":   "fucNqQ1x5rSFOjXNqtm0NWzzxG1g1xVs", // AUTH0: CLIENT ID
                    "username":    "clingen.demo.curator@genome.stanford.edu", // AUTH0: TEST CURATOR CREDENTIALS
                    "password":    "CLSZ6lJhOAhYBZRgGx5%BdkfgwRt%LnY)EXT",
                    "id_token":    "",
                    "connection":  "Username-Password-Authentication",
                    "grant_type":  "password",
                    "scope":       "openid",
                    "device":      ""
                })
            }
        ).then(response => {
            if (!response.ok) throw response;
            return response.json();
        }).then(session => {
            this.handleAuth0Login(session);
        });
    },
};


class UnsavedChangesToken {
    constructor(manager) {
        this.manager = manager;
    }

    release() {
        this.manager.releaseUnsavedChanges(this);
    }
}


module.exports.HistoryAndTriggers = {
    SLOW_REQUEST_TIME: 750,
    // Detect HTML5 history support
    historyEnabled: !!(typeof window != 'undefined' && window.history && window.history.pushState),

    childContextTypes: {
        adviseUnsavedChanges: React.PropTypes.func,
        navigate: React.PropTypes.func
    },

    adviseUnsavedChanges: function () {
        var token = new UnsavedChangesToken(this);
        this.setState({unsavedChanges: this.state.unsavedChanges.concat([token])});
        return token;
    },

    releaseUnsavedChanges: function (token) {
        console.assert(this.state.unsavedChanges.indexOf(token) != -1);
        this.setState({unsavedChanges: this.state.unsavedChanges.filter(x => x !== token)});
    },

    getChildContext: function() {
        return {
            adviseUnsavedChanges: this.adviseUnsavedChanges,
            navigate: this.navigate
        };
    },


    getInitialState: function () {
        return {
            contextRequest: null,
            unsavedChanges: []
        };
    },

    componentWillMount: function () {
        if (typeof window !== 'undefined') {
            // IE8 compatible event registration
            window.onerror = this.handleError;
        }
    },

    componentDidMount: function () {
        if (this.historyEnabled) {
            var data = this.props.context;
            try {
                window.history.replaceState(data, '', window.location.href);
            } catch (exc) {
                // Might fail due to too large data
                window.history.replaceState(null, '', window.location.href);
            }
            // Avoid popState on load, see: http://stackoverflow.com/q/6421769/199100
            var register = window.addEventListener.bind(window, 'popstate', this.handlePopState, true);
            if (window._onload_event_fired) {
                register();
            } else {
                window.addEventListener('load', setTimeout.bind(window, register));
            }
        } else {
            window.onhashchange = this.onHashChange;
        }
        window.onbeforeunload = this.handleBeforeUnload;
        if (this.state.href !== window.location.href) {
            this.setState({href: window.location.href});
        }
    },

    onHashChange: function (event) {
        // IE8/9
        this.setState({href: window.location.href});
    },

    trigger: function (name) {
        var method_name = this.triggers[name];
        if (method_name) {
            this[method_name].call(this);
        }
    },

    handleError: function(msg, url, line, column) {
        // When an unhandled exception occurs, reload the page on navigation
        this.historyEnabled = false;
        var parsed = url && require('url').parse(url);
        if (url && parsed.hostname === window.location.hostname) {
            url = parsed.path;
        }
        ga('send', 'exception', {
            'exDescription': url + '@' + line + ',' + column + ': ' + msg,
            'exFatal': true,
            'location': window.location.href
        });
    },

    handleClick: function(event) {
        // https://github.com/facebook/react/issues/1691
        if (event.isDefaultPrevented()) return;

        var target = event.target;
        var nativeEvent = event.nativeEvent;

        // SVG anchor elements have tagName == 'a' while HTML anchor elements have tagName == 'A'
        while (target && (target.tagName.toLowerCase() != 'a' || target.getAttribute('data-href'))) {
            target = target.parentElement;
        }
        if (!target) return;

        if (target.getAttribute('disabled')) {
            event.preventDefault();
            return;
        }

        // data-trigger links invoke custom handlers.
        var data_trigger = target.getAttribute('data-trigger');
        if (data_trigger !== null) {
            event.preventDefault();
            this.trigger(data_trigger);
            return;
        }

        // Ensure this is a plain click
        if (nativeEvent.which > 1 || nativeEvent.shiftKey || nativeEvent.altKey || nativeEvent.metaKey) return;

        // Skip links with a data-bypass attribute.
        if (target.getAttribute('data-bypass')) return;

        var href = target.getAttribute('href');
        if (href === null) href = target.getAttribute('data-href');
        if (href === null) return;

        // Skip javascript links
        if (href.indexOf('javascript:') === 0) return;

        // Skip external links
        if (!origin.same(href)) return;

        // Skip links with a different target
        if (target.getAttribute('target')) return;

        // Skip @@download links
        if (href.indexOf('/@@download') != -1) return;

        // With HTML5 history supported, local navigation is passed
        // through the navigate method.
        if (this.historyEnabled) {
            event.preventDefault();
            this.navigate(href);
        }
    },

    // Submitted forms are treated the same as links
    handleSubmit: function(event) {
        var target = event.target;

        // Skip POST forms
        if (target.method != 'get') return;

        // Skip forms with a data-bypass attribute.
        if (target.getAttribute('data-bypass')) return;

        // Skip external forms
        if (!origin.same(target.action)) return;

        var options = {};
        var action_url = url.parse(url.resolve(this.state.href, target.action));
        options.replace = action_url.pathname == url.parse(this.state.href).pathname;
        var search = serialize(target);
        if (target.getAttribute('data-removeempty')) {
            search = search.split('&').filter(function (item) {
                return item.slice(-1) != '=';
            }).join('&');
        }
        var href = action_url.pathname;
        if (search) {
            href += '?' + search;
        }

        options.skipRequest = target.getAttribute('data-skiprequest');

        if (this.historyEnabled) {
            event.preventDefault();
            this.navigate(href, options);
        }
    },

    handlePopState: function (event) {
        if (this.DISABLE_POPSTATE) return;
        if (!this.confirmNavigation()) {
            window.history.pushState(window.state, '', this.state.href);
            return;
        }
        if (!this.historyEnabled) {
            window.location.reload();
            return;
        }
        var request = this.state.contextRequest;
        var href = window.location.href;
        if (event.state) {
            // Abort inflight xhr before setState
            if (request) request.abort();
            this.setState({
                context: event.state,
                href: href
            });
        }
        // Always async update in case of server side changes.
        // Triggers standard analytics handling.
        this.navigate(href, {replace: true});
    },

    confirmNavigation: function() {
        // check for beforeunload confirmation
        if (this.state.unsavedChanges.length) {
            var res = window.confirm('You have unsaved changes. Are you sure you want to lose them?');
            if (res) {
                this.setState({unsavedChanges: []});
            }
            return res;
        }
        return true;
    },

    handleBeforeUnload: function() {
        if (this.state.unsavedChanges.length) {
            return 'You have unsaved changes.';
        }
    },

    navigate: function (href, options) {
        if (!this.confirmNavigation()) {
            return;
        }

        // options.skipRequest only used by collection search form
        // options.replace only used handleSubmit, handlePopState, handlePersonaLogin
        options = options || {};
        href = url.resolve(this.state.href, href);

        // Strip url fragment.
        var fragment = '';
        var href_hash_pos = href.indexOf('#');
        if (href_hash_pos > -1) {
            fragment = href.slice(href_hash_pos);
            href = href.slice(0, href_hash_pos);
        }

        if (!this.historyEnabled) {
            if (options.replace) {
                window.location.replace(href + fragment);
            } else {
                var old_path = ('' + window.location).split('#')[0];
                window.location.assign(href + fragment);
                if (old_path == href) {
                    window.location.reload();
                }
            }
            return;
        }

        var request = this.state.contextRequest;

        if (request) {
            request.abort();
        }

        if (options.skipRequest) {
            if (options.replace) {
                window.history.replaceState(window.state, '', href + fragment);
            } else {
                window.history.pushState(window.state, '', href + fragment);
            }
            this.setState({href: href + fragment});
            return;
        }

        request = this.fetch(href, {
            headers: {'Accept': 'application/json'}
        });

        var timeout = new Timeout(this.SLOW_REQUEST_TIME);

        Promise.race([request, timeout.promise]).then(v => {
            if (v instanceof Timeout) this.setState({'slow': true});
        });

        var promise = request.then(response => {
            // navigate normally to URL of unexpected non-JSON response so back button works.
            if (!contentTypeIsJSON(response.headers.get('Content-Type'))) {
                if (options.replace) {
                    window.location.replace(href + fragment);
                } else {
                    var old_path = ('' + window.location).split('#')[0];
                    window.location.assign(href + fragment);
                    if (old_path == href) {
                        window.location.reload();
                    }
                }
            }
            // The URL may have redirected
            var response_url = response.url || href;
            if (options.replace) {
                window.history.replaceState(null, '', response_url + fragment);
            } else {
                window.history.pushState(null, '', response_url + fragment);
            }
            this.setState({
                href: response_url + fragment
            });
            if (!response.ok) {
                throw response;
            }
            return response.json();
        })
        .catch(parseAndLogError.bind(undefined, 'contextRequest'))
        .then(this.receiveContextResponse);

        if (!options.replace) {
            promise = promise.then(this.scrollTo);
        }

        this.setState({
            contextRequest: request
        });
        return request;
    },

    receiveContextResponse: function (data) {
        // title currently ignored by browsers
        try {
            window.history.replaceState(data, '', window.location.href);
        } catch (exc) {
            // Might fail due to too large data
            window.history.replaceState(null, '', window.location.href);
        }
        this.setState({
            context: data,
            slow: false
        });

    },

    componentDidUpdate: function () {
        var xhr = this.state.contextRequest;
        if (!xhr || !xhr.xhr_end || xhr.browser_stats) return;
        var browser_end = 1 * new Date();

        ga('set', 'location', window.location.href);
        ga('send', 'pageview');
        this.constructor.recordServerStats(xhr.server_stats, 'contextRequest');

        xhr.browser_stats = {};
        xhr.browser_stats['xhr_time'] = xhr.xhr_end - xhr.xhr_begin;
        xhr.browser_stats['browser_time'] = browser_end - xhr.xhr_end;
        xhr.browser_stats['total_time'] = browser_end - xhr.xhr_begin;
        this.constructor.recordBrowserStats(xhr.browser_stats, 'contextRequest');

    },

    scrollTo: function() {
        var hash = window.location.hash;
        if (hash && document.getElementById(hash.slice(1))) {
            window.location.replace(hash);
        } else {
            window.scrollTo(0, 0);
        }
    },

    statics: {
        recordServerStats: function (server_stats, timingVar) {
            // server_stats *_time are microsecond values...
            Object.keys(server_stats).forEach(function (name) {
                if (name.indexOf('_time') === -1) return;
                ga('send', 'timing', {
                    'timingCategory': name,
                    'timingVar': timingVar,
                    'timingValue': Math.round(server_stats[name] / 1000)
                });
            });
        },
        recordBrowserStats: function (browser_stats, timingVar) {
            Object.keys(browser_stats).forEach(function (name) {
                if (name.indexOf('_time') === -1) return;
                ga('send', 'timing', {
                    'timingCategory': name,
                    'timingVar': timingVar,
                    'timingValue': browser_stats[name]
                });
            });
        }
    }

};
