'use strict';

// Minimal inline IE8 html5 compatibility
require('shivie8');

// Read and clear stats cookie
var cookie = require('cookie-monster')(document);
window.stats_cookie = cookie.get('X-Stats') || '';
cookie.set('X-Stats', '', {path: '/', expires: new Date(0)});


var ga = require('google-analytics');

//existing trackers for gene curation app
var trackers = {
    'curation.clinicalgenome.org': 'UA-49947422-4',
    'curation-beta.clinicalgenome.org': 'UA-49947422-6',
    'curation-demo.clinicalgenome.org': 'UA-49947422-5'
};

//determine current hostname
var analyticsTrackerHostname = document.location.hostname;

//match hostname to google analytics domain identified for tracker
if (/^(www\.)?curation.clinicalgenome.org/.test(analyticsTrackerHostname)) {
    //production app
    analyticsTrackerHostname = 'curation.clinicalgenome.org';
} else if (/^curation-beta.*.clinicalgenome.org/.test(analyticsTrackerHostname)){
    //all curation-beta variants
    analyticsTrackerHostname = 'curation-beta.clinicalgenome.org';
} else {
    //catch-all
    analyticsTrackerHostname = 'curation-demo.clinicalgenome.org';
}

//use correct tracker based on hostname
var tracker = trackers[analyticsTrackerHostname];

ga('create', tracker, {'cookieDomain': 'none', 'siteSpeedSampleRate': 100});
ga('send', 'pageview');

// Need to know if onload event has fired for safe history api usage.
window.onload = function () {
    window._onload_event_fired = true;
};

var $script = require('scriptjs');
$script.path('/static/build/');
$script('https://login.persona.org/include.js', 'persona');
