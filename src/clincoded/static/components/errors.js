'use strict';
import React, { Component } from 'react';
import createReactClass from 'create-react-class';
import { content_views, listing_titles, itemClass } from './globals';

var Error = module.exports.Error = createReactClass({
    render: function() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <h1>{context.title}</h1>
                    <p>{context.description}</p>
                </div>
            </div>
        );
    }
});

content_views.register(Error, 'error');


var HTTPNotFound = module.exports.HTTPNotFound = createReactClass({
    render: function() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <div className="row">
                        <div className="col-sm-12">
                            <h1>Not found</h1>
                            <p>The requested page could not be found.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

content_views.register(HTTPNotFound, 'HTTPNotFound');


var HTTPForbidden = module.exports.HTTPForbidden = createReactClass({
    render: function() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'panel-gray');
        if (!this.props.loadingComplete) return (
            <div className="communicating">
                <div className="loading-spinner"></div>
            </div>
        );
        return (
            <div className="container">
                <div className={itemClass}>
                    <div className="row">
                        <div className="col-sm-12">
                            <h1>Not available</h1>
                            <p>Access to this interface is currently restricted to ClinGen curators. To access publicly available information, please visit the <a href="http://clinicalgenome.org">ClinGen portal</a>.</p>
                            <p>If you are a ClinGen curator, you may <a href='mailto:clingen-helpdesk@lists.stanford.edu'>request an account</a>.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

content_views.register(HTTPForbidden, 'HTTPForbidden');


var BlankWhileLoading = module.exports.BlankWhileLoading = function (props) {
    if (!props.loadingComplete) return "";
    return props.context.title;
};

listing_titles.register(BlankWhileLoading, 'HTTPForbidden');


var LoginDenied = module.exports.LoginDenied = createReactClass({
    render: function() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <div className="row">
                        <div className="col-sm-12">
                            <h1>Login failure</h1>
                            <p>In addition to creating an account with Auth0, your email must be registered with the ClinGen interfaces in order to log in to the interfaces. If you are encountering this error message, you have either not yet registered your email with us or we have not yet been able to verify and add your account to the system.</p>
                            <p>Currently, access is restricted to ClinGen curators. Please send us an email at <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu</a> if you feel your email should be registered for use with the ClinGen interfaces.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

content_views.register(LoginDenied, 'LoginDenied');


var LoginNotVerified = module.exports.LoginNotVerified = createReactClass({
    render: function() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <div className="row">
                        <div className="col-sm-12">
                            <h1>Account not verified</h1>
                            <p>Once you have created an account with Auth0, you must verify it via email - please check your inbox for an email from Auth0 and verify it according to their instructions.</p>
                            <p>Additionally, the same email you use for Auth0 must be registered for use with the interfaces. If you have not yet registered your email for the ClinGen interfaces, please send an email to <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu</a>, supplying the email you used for your Auth0 account and your preferred display name within the interfaces.</p>
                            <p>Please note that access to the ClinGen interfaces is currently restricted to ClinGen curators.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

content_views.register(LoginNotVerified, 'LoginNotVerified');


var RenderingError = module.exports.RenderingError = createReactClass({
    render: function() {
        var context = this.props.context;
        var itemClass = itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <h1>{context.title}</h1>
                    <p>{context.description}</p>
                    <pre>{context.detail}</pre>
                </div>
            </div>
        );
    }
});

content_views.register(RenderingError, 'RenderingError');
