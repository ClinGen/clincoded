'use strict';
var React = require('react');
var globals = require('./globals');
var home = require('./home');

var Error = module.exports.Error = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'panel-gray');
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

globals.content_views.register(Error, 'error');


var HTTPNotFound = module.exports.HTTPNotFound = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'panel-gray');
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

globals.content_views.register(HTTPNotFound, 'HTTPNotFound');


var HTTPForbidden = module.exports.HTTPForbidden = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'panel-gray');
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

globals.content_views.register(HTTPForbidden, 'HTTPForbidden');


var BlankWhileLoading = module.exports.BlankWhileLoading = function (props) {
    if (!props.loadingComplete) return "";
    return props.context.title;
};

globals.listing_titles.register(BlankWhileLoading, 'HTTPForbidden');


var LoginDenied = module.exports.LoginDenied = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <div className="row">
                        <div className="col-sm-12">
                            <h1>Login failure</h1>
                            <p>Access is restricted to ClinGen curators.</p>
                            <p>If you are a ClinGen curator with a newly-created account, you may need to wait while we verify and add your account to the system.</p>
                            <p>Please <a href='mailto:clingen-helpdesk@lists.stanford.edu'>email us</a> if we have not verified you for a long time.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(LoginDenied, 'LoginDenied');


var LoginNotVerified = module.exports.LoginNotVerified = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'panel-gray');
        return (
            <div className="container">
                <div className={itemClass}>
                    <div className="row">
                        <div className="col-sm-12">
                            <h1>Account not verified</h1>
                            <p>Please check your inbox for an email from Auth0, and verify your email there.</p>
                            <p>If you do not see this email or cannot verify your email, please <a href='mailto:clingen-helpdesk@lists.stanford.edu'>contact us</a>.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

globals.content_views.register(LoginNotVerified, 'LoginNotVerified');


var RenderingError = module.exports.RenderingError = React.createClass({
    render: function() {
        var context = this.props.context;
        var itemClass = globals.itemClass(context, 'panel-gray');
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

globals.content_views.register(RenderingError, 'RenderingError');
