'use strict';
var React = require('react');
var globals = require('./globals');

var SignIn = module.exports.SignIn = React.createClass({
    render: function() {
        var hidden = !this.props.session || this.props.session['auth.userid'];
        var disabled = !this.props.loadingComplete;
        return (
            <div id="signin-box" className="col-sm-3" hidden={hidden}>
                <h4>Data Providers</h4>
                <a href="" disabled={disabled} data-trigger="login" className="signin-button btn btn-large btn-success">Sign In</a>
                <p>No access? <a href='mailto:clingen-helpdesk@lists.stanford.edu'>Request an account</a>.</p>
                <p>Authentication by <a href="https://accounts.google.com/" target="_blank">Google</a> via <a href="https://auth0.com/" target="_blank">Auth0</a>.</p>
            </div>
        );
    }
});

var Home = module.exports.Home = React.createClass({
    render: function() {
        if (this.props.session && this.props.session['auth.userid'] !== undefined) {
            window.location.href = '/dashboard/';
        }
        return (
            <div className="container">
                <div className="homepage-main-box panel-gray">
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="project-info site-title">
                                <h1>ClinGen Curator Interface</h1>
                                <p>Access to this interface is currently restricted to ClinGen curators. To access publicly available information, please visit the <a href="http://clinicalgenome.org">ClinGen portal</a>.</p>
                                <p>If you are a ClinGen curator, you may <a href='mailto:clingen-helpdesk@lists.stanford.edu'>request an account</a>.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});


globals.content_views.register(Home, 'portal');
