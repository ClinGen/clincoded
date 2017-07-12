'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { content_views } from './globals';
import { parseAndLogError } from './mixins';

var ga = require('google-analytics');

var Param = module.exports.Param = createReactClass({
    contextTypes: {
        fetch: PropTypes.func
    },

    getInitialState: function () {
        return {
            fetchedRequest: undefined,
        };
    },

    componentDidMount: function () {
        this.fetch(this.props.url);
    },

    componentWillUnmount: function () {
        var xhr = this.state.fetchedRequest;
        if (xhr) xhr.abort();
    },

    componentWillReceiveProps: function (nextProps) {
        if (!this.state.fetchedRequest && nextProps.url === undefined) return;
        if (this.state.fetchedRequest &&
            nextProps.url === this.props.url &&
            nextProps.session === this.props.session) return;
        this.fetch(nextProps.url);
    },

    fetch: function (url) {
        var request = this.state.fetchedRequest;
        if (request) request.abort();

        if (!url) {
            this.props.handleFetch();
            this.setState({
                fetchedRequest: undefined
            });
        }
        request = this.context.fetch(url, {
            headers: {'Accept': 'application/json'}
        });
        request.then(response => {
            if (!response.ok) throw response;
            return response.json();
        })
        .catch(parseAndLogError.bind(undefined, 'fetchedRequest'))
        .then(this.receive);

        this.setState({
            fetchedRequest: request
        });
    },

    receive: function (data) {
        var result = {};
        result[this.props.name] = data;
        if (this.props.etagName) {
            result[this.props.etagName] = this.state.fetchedRequest.etag;
        }
        this.props.handleFetch(result);
    },

    render: function() { return null; }
});


var FetchedData = module.exports.FetchedData = createReactClass({

    getDefaultProps: function() {
        return {loadingComplete: true};
    },

    getInitialState: function() {
        return {};
    },

    shouldComponentUpdate: function(nextProps, nextState) {
        if (!nextProps.loadingComplete) {
            return false;
        } else {
            return true;
        }
    },

    handleFetch: function(result) {
        this.setState(result);
    },

    render: function () {
        var params = [];
        var communicating = false;
        var children = [];
        if (this.props.children) {
            React.Children.forEach(this.props.children, function(child) {
                if (child.type.displayName === Param.displayName) {
                    params.push(React.cloneElement(child, {
                        key: child.props.name,
                        handleFetch: this.handleFetch,
                        handleFetchStart: this.handleFetchStart,
                        session: this.props.session
                    }));
                    if (this.state[child.props.name] === undefined) {
                        communicating = true;
                    }                    
                } else {
                    children.push(child);
                }
            }, this);
        }

        if (!params.length) {
            return null;
        }
        if (!this.props.loadingComplete) {
            return <div className="loading-spinner"></div>;
        }

        var errors = params.map(param => this.state[param.props.name])
            .filter(obj => obj && (obj['@type'] || []).indexOf('error') > -1);

        if (errors.length) {
            return (
                <div className="error done">
                    {errors.map(error => {
                        var ErrorView = content_views.lookup(error);
                        return <ErrorView {...this.props} context={error} />;
                    })}
                </div>
            );
        }

        if (communicating) {
            return (
                <div className="communicating">
                    <div className="loading-spinner"></div>
                    {params}
                </div>
            );
        }

        return (
            <div className="done">
                {children.map((child, i) => React.cloneElement(child, _.extend({key: i}, this.props, this.state)))}
                {params}
            </div>
        );
    }
});


var Items = createReactClass({

    render: function() {
        var Component = this.props.Component;
        var data = this.props.data;
        var items = data ? data['@graph'] : [];
        if (!items.length) return null;
        return <Component {...this.props} items={items} total={data.total} />;
    }

});


var FetchedItems = module.exports.FetchedItems = createReactClass({
    
    render: function() {
        return (
            <FetchedData loadingComplete={this.props.loadingComplete}>
                <Param name="data" url={this.props.url} />
                <Items {...this.props} />
            </FetchedData>
        );
    }

});
