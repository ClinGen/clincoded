'use strict';
import React, { Component } from 'react';
import { content_views, listing_titles, itemClass } from './globals';

export class Error extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <h1>{context.title}</h1>
                    <p>{context.description}</p>
                </div>
            </div>
        );
    }
}

content_views.register(Error, 'error');


export class HTTPNotFound extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="alert alert-warning"><h3><i className="icon icon-exclamation-triangle"></i> Oh Snap! The page you were looking for does not exist.</h3></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

content_views.register(HTTPNotFound, 'HTTPNotFound');


export class HTTPForbidden extends Component {
    render() {
        var context = this.props.context;
        if (!this.props.loadingComplete) return (
            <div className="communicating">
                <div className="loading-spinner"></div>
            </div>
        );
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="alert alert-warning"><h3><i className="icon icon-exclamation-triangle"></i> Your session has expired. Please log in again to continue.</h3></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

content_views.register(HTTPForbidden, 'HTTPForbidden');


export function BlankWhileLoading(props) {
    if (!props.loadingComplete) return "";
    return props.context.title;
}

listing_titles.register(BlankWhileLoading, 'HTTPForbidden');


export class LoginDenied extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="page-header"><h1><i className="icon icon-exclamation-triangle"></i> Registration not yet complete</h1></div>
                            <div className="panel panel-default">
                                <div className="panel-body">
                                    <p>If you wish to continue registering your own account and display name, please follow the instructions below:</p>
                                    <p><span className="section-header">Step 1 <span className="text-success"><i className="icon icon-check"></i> Completed</span></span>Register your user name and password with <a href="https://auth0.com/signup" target="_blank" rel="noopener noreferrer">Auth0</a>, a third-party system that will manage your password.</p>
                                    <p><span className="section-header">Step 2</span>Request an account for the ClinGen interfaces by emailing the following information to <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a></p>
                                    <ol>
                                        <li>The email address associated with your newly created Auth0 account</li>
                                        <li>Preferred name for display in the ClinGen interfaces (first and last name)</li>
                                        <li>Any affiliation you have with ClinGen (note: a ClinGen affiliation is not required for use of the Variant Curation Interface)</li>
                                        <li>Intended use of ClinGen interface(s) -- select all that apply:
                                            <ol>
                                                <li>ClinGen curation activity</li>
                                                <li>Non-ClinGen variant curation (note: the Variant Curation Interface is open for public use but the Gene Curation Interface is currently restricted to use by ClinGen curators. If you wish to collaborate on gene curation please contact ClinGen at <a href='mailto:clingen@clinicalgenome.org'>clingen@clinicalgenome.org <i className="icon icon-envelope"></i></a>)</li>
                                                <li>Demo only exploration of the interfaces using test data and your own account and display name</li>
                                            </ol>
                                        </li>
                                    </ol>
                                    <p>Please contact us with any questions regarding registration at <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a></p>
                                </div>
                            </div>
                            <div className="alert alert-info">
                                <span>If you do not wish to continue registering for the interfaces but want to explore a demo version of the interfaces, you may select the "Demo Login" button located at <a href="https://curation-test.clinicalgenome.org" target="_blank" rel="noopener noreferrer">curation-test.clinicalgenome.org</a>. Your name will display as "ClinGen Test Curator" in the interfaces, along with others who use the "Demo Login."</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

content_views.register(LoginDenied, 'LoginDenied');


export class LoginNotVerified extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="page-header"><h1><i className="icon icon-exclamation-triangle"></i> Auth0 account not yet verified</h1></div>
                            <div className="panel panel-default">
                                <div className="panel-body">
                                    <p>Auth0 account activation requires email verification - please check your inbox for an email from Auth0 and verify it according to their instructions.</p>
                                    <p>Once you have completed Auth0 account activation you must also register to use the ClinGen interfaces. To complete your registration please send the email address you verified with Auth0 and your preferred display name within the interfaces to <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a></p>
                                    <p>Please note that access to the ClinGen interfaces is currently restricted to ClinGen curators.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

content_views.register(LoginNotVerified, 'LoginNotVerified');


export class RenderingError extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <h1>{context.title}</h1>
                    <p>{context.description}</p>
                    <pre>{context.detail}</pre>
                </div>
            </div>
        );
    }
}

content_views.register(RenderingError, 'RenderingError');
