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


export class RequestedActivation extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="page-header"><h1><i className="icon icon-exclamation-triangle"></i> Thank you for registering</h1></div>
                            <div className="panel panel-default">
                                <div className="panel-body">
                                    <p>Your request for access to the interfaces has been received. Once your account is activated, you will receive a confirmation email.</p>
                                    <p>If you are a ClinGen curator, your coordinator will arrange for you to be added to your affiliation. To learn more about volunteering for curation efforts with ClinGen please check our <a href="https://www.clinicalgenome.org/working-groups/c3/" target="_blank" rel="noopener noreferrer">Community Curation</a> site.</p>
                                    <p>Please contact us at <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a> with any questions.</p>
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

content_views.register(RequestedActivation, 'RequestedActivation');

export class LoginDenied extends Component {
    render() {
        var context = this.props.context;
        return (
            <div className="container">
                <div className={itemClass(context, 'panel-gray')}>
                    <div className="row">
                        <div className="col-sm-12">
                            <div className="page-header"><h1><i className="icon icon-exclamation-triangle"></i> Access Denied</h1></div>
                            <div className="panel panel-default">
                                <div className="panel-body">
                                    <div>If you have any questions, please contact us at <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</div>
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
                                    <p><span className="section-header">Step 1 <span className="text-success"><i className="icon icon-check"></i> Completed</span></span>Sign up with your email and password.</p>
                                    <p><span className="section-header">Step 2 </span>Please check your inbox for an email from Auth0 and verify your email according to the instructions.</p>
                                    <p><span className="section-header">Step 3 </span>Please log in to complete the registration of your account.</p>
                                    <p>If you have any questions, please contact us at <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</p>
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
