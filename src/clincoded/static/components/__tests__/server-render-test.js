'use strict';

jest.autoMockOff();
jest.mock('jquery');

// Fixes https://github.com/facebook/jest/issues/78
jest.dontMock('react');
jest.dontMock('react-dom');
jest.dontMock('underscore');

describe("Server rendering", function () {
    var React;
    var ReactDOM;
    var ReactDOMServer;
    var App;
    var document;
    var home_url = "http://localhost/";
    var home = {
        "@id": "/",
        "@type": ["portal"],
        "portal_title": "ClinGen",
        "title": "Home"
    };

    beforeEach(function () {
        require('../../libs/react-patches');
        React = require('react');
        ReactDOM = require('react-dom');
        ReactDOMServer = require('react-dom/server');
        App = require('..');
        var server_app = <App context={home} href={home_url} />;
        var markup = '<!DOCTYPE html>\n' + ReactDOMServer.renderToString(server_app);
        var parser = new DOMParser();
        document = parser.parseFromString(markup, 'text/html');
        window.location.href = home_url;
    });

    it("renders the application to html", function () {
        expect(document.title).toBe(home.portal_title);
    });

    it("react render http-equiv correctly", function () {
        var meta_http_equiv = document.querySelectorAll('meta[http-equiv]');
        expect(meta_http_equiv.length).not.toBe(0);
    });

    it("mounts the application over the rendered html", function () {
        var props = App.getRenderedProps(document);
        var app = ReactDOM.render(<App {...props} />, document);
        expect(ReactDOM.findDOMNode(app)).toBe(document.documentElement);
    });
});
