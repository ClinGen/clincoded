'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import url from 'url';
import { content_views } from './globals';
import { Auth0, HistoryAndTriggers } from './mixins';
import { NavbarMixin, Nav, Navbar, NavItem } from '../libs/bootstrap/navigation';
import jsonScriptEscape from '../libs/jsonScriptEscape';
import { RestMixin } from './rest';
import AffiliationModal from './affiliation/modal';
const AffiliationsList = require('./affiliation/affiliations.json');

var routes = {
    'curator': require('./curator').Curator
};


// Site information, including navigation
var portal = {
    portal_title: 'ClinGen',
    navUser: [
        {id: 'help', title: 'Help', url: '#'}, // dropdown Help menu button to both gene and variant help docs
        {id: 'variant', title: 'New Variant Curation', url: '/select-variant/'}, // link to VCI page /select-variant/
        {id: 'gene', title: 'New Gene Curation', url: '/create-gene-disease/'}, // link to GCI page /create-gene-disease/
        {id: 'space', title: 'space'}, // white space between
        {id: 'dashboard', title: 'Dashboard', icon: 'icon-home', url: '/dashboard/'},
        {id: 'demo', title: 'Demo Login'},
        {id: 'loginout', title: 'Login'}
        //{id: 'account', title: 'Account', url: '/account/'},
    ]
};


// Renders HTML common to all pages.
var App = module.exports = createReactClass({
    mixins: [Auth0, HistoryAndTriggers, RestMixin],

    triggers: {
        demo: 'triggerAutoLogin',
        login: 'triggerLogin',
        logout: 'triggerLogout'
    },

    // Note on context. state.context set from initial props. Navigating to other pages sets this state.
    // This state gets passed as a property to ContentView, so it should be referenced as props.context
    // from there.
    getInitialState: function() {
        var demoWarning = false;
        var productionWarning = false;
        if (/production.clinicalgenome.org/.test(url.parse(this.props.href).hostname)) {
            // check if production URL. Enable productionWarning if it is.
            productionWarning = true;
        } else if (!/^(www\.)?curation.clinicalgenome.org/.test(url.parse(this.props.href).hostname)) {
            // if neither production nor curation URL, enable demoWarning.
            demoWarning = true;
        }
        return {
            context: this.props.context, // Close to anti-pattern, but puts *initial* context into state
            slow: this.props.slow,
            href: this.props.href,
            errors: [],
            portal: portal,
            demoWarning: demoWarning,
            productionWarning: productionWarning,
            tempAffiliation: null, // Placeholder when user selects an option in the affiliation dropdown
            affiliation: null, // Confirmed affiliation when user selects to continue in the modal
            affiliationModalButtonDisabled: true,
            isAffiliationModalOpen: false
        };
    },

    currentAction: function() {
        var href_url = url.parse(this.state.href);
        var hash = href_url.hash || '';
        var name;
        if (hash.slice(0, 2) === '#!') {
            name = hash.slice(2);
        }
        return name;
    },

    /**
     * Method to set states when the affiliation selection is changed
     * @param {event} e - Selection change event
     */
    handleOnChange(e) {
        this.setState({
            tempAffiliation: e.target.value !== 'self' ? JSON.parse(e.target.value) : null,
            affiliationModalButtonDisabled: false
        });
    },

    /**
     * Method to create a cookie
     */
    createCookie(name, value, days) {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + value + expires + "; path=/";
    },

    /**
     * Handler to close affiliation modal on continue action.
     * Sets affiliation state and cookie.
     */
    toggleAffiliationModal() {
        this.setState({
            affiliation: this.state.tempAffiliation,
            isAffiliationModalOpen: !this.state.isAffiliationModalOpen
        }, () => {
            this.createCookie('affiliation', JSON.stringify(this.state.affiliation));
            this.setState({
                tempAffiliation: null,
                affiliation_cookie: this.state.affiliation,
                affiliationModalButtonDisabled: true
            });
        });
    },

    /**
     * Handler to close affiliation modal on cancel action
     */
    closeAffiliationModal() {
        this.setState({isAffiliationModalOpen: !this.state.isAffiliationModalOpen});
    },

    /**
     * Handler to show affiliation modal on click event
     * @param {event} e - Button click event
     */
    showAffiliationModal(e) {
        this.setState({isAffiliationModalOpen: true});
    },

    /**
     * Method to return affiliation data given an array of IDs
     * @param {array} affiliations - List of affiliation IDs
     * @param {array} affiliations - List of affiliation data objects
     */
    getUserAffiliations(affiliations, staticAffiliations) {
        let affiliationArray = [];
        if (affiliations.length) {
            affiliations.forEach(id=> {
                for (let affiliation of staticAffiliations) {
                    if (affiliation.affiliation_id === id) {
                        affiliationArray.push(affiliation);
                    }
                }
            });
        }
        return affiliationArray;
    },

    /**
     * Method to render affiliation modal
     * @param {array} affiliations - List of affiliation IDs
     * @param {string} curatorName - The title of the logged-in user
     */
    renderAffiliationModal(affiliations, curatorName) {
        let userAffiliations = this.getUserAffiliations(affiliations, AffiliationsList);
        return (
            <AffiliationModal show={this.state.isAffiliationModalOpen} onClose={this.toggleAffiliationModal}
                buttonDisabled={this.state.affiliationModalButtonDisabled} onCancel={this.closeAffiliationModal}
                hasCancelButton={this.state.affiliation && Object.keys(this.state.affiliation).length ? true : false}>
                <div className="affiliation-modal-body">
                    <h2>Please select whether you would like to curate as part of an Affiliation:</h2>
                    <select className="form-control" defaultValue="none" onChange={this.handleOnChange}>
                        <option value="none" disabled>Select Affiliation</option>
                        <option value="" disabled className="divider">--------------------------------------------------------------</option>
                        <option value="self">No Affiliation ({curatorName})</option>
                        <option value="" disabled className="divider">--------------------------------------------------------------</option>
                        {userAffiliations.map((affiliation, i) => {
                            return <option key={i} value={JSON.stringify(affiliation)}>{affiliation.affiliation_fullname}</option>;
                        })}
                    </select>
                </div>
            </AffiliationModal>
        );
    },

    render: function() {
        let content,
            context = this.state.context,
            session = this.state.session;
        let user_properties = session && session.user_properties;
        let href_url = url.parse(this.state.href);
        // Switching between collections may leave component in place
        let key = context && context['@id'];
        let current_action = this.currentAction();

        let affiliation = this.state.affiliation,
            affiliation_cookie = this.state.affiliation_cookie;

        if (!current_action && context.default_page) {
            context = context.default_page;
        }
        if (context) {
            var ContentView = content_views.lookup(context, current_action);
            content = <ContentView {...this.props} context={context} href={this.state.href}
                loadingComplete={this.state.loadingComplete} session={session}
                portal={this.state.portal} navigate={this.navigate} href_url={href_url}
                demoVersion={this.state.demoWarning} affiliation={affiliation} />;
        }
        var errors = this.state.errors.map(function (error) {
            return <div className="alert alert-error"></div>;
        });

        var appClass = 'done';
        if (this.state.slow) {
            appClass = 'communicating';
        }

        var title = context.title || context.name || context.accession || context['@id'];
        if (title && title != 'Home') {
            title = title + ' – ' + portal.portal_title;
        } else {
            title = portal.portal_title;
        }

        var canonical = this.props.href;
        if (context.canonical_uri) {
            if (href_url.host) {
                canonical = (href_url.protocol || '') + '//' + href_url.host + context.canonical_uri;
            } else {
                canonical = context.canonical_uri;
            }
        }

        return (
            <html lang="en">
                <head>
                    <meta charSet="utf-8" />
                    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>ClinGen</title>
                    <link rel="canonical" href={canonical} />
                    <script async src='//www.google-analytics.com/analytics.js'></script>
                    <script src="https://cdn.auth0.com/js/lock/10.17.0/lock.min.js"></script>
                    <script data-prop-name="inline" dangerouslySetInnerHTML={{__html: this.props.inline}}></script>
                    <link rel="stylesheet" href="@@cssFile" />
                    <script src="@@bundleJsFile"></script>
                </head>
                <body onClick={this.handleClick} onSubmit={this.handleSubmit} className={this.state.demoWarning ? "demo-background" : ""}>
                    <script data-prop-name="context" type="application/ld+json" dangerouslySetInnerHTML={{
                        __html: '\n\n' + jsonScriptEscape(JSON.stringify(this.props.context)) + '\n\n'
                    }}></script>
                    <div>
                        <Header session={this.state.session} href={this.props.href} affiliation={affiliation} />
                        {this.state.demoWarning ?
                            <Notice noticeType='demo' noticeMessage={<span><strong>Note:</strong> This is a demo version of the site. Data entered will be deleted upon release of updated versions, which occurs roughly once per month. Please contact us at <a href="mailto:clingen-helpdesk@lists.stanford.edu" style={{color: '#FFFFFF'}}>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</span>} />
                            : null}
                        {this.state.productionWarning ?
                            <Notice noticeType='production' noticeMessage={<span><strong>Do not use this URL for entering data. Please use <a href="https://curation.clinicalgenome.org/">curation.clinicalgenome.org</a> instead.</strong></span>} />
                            : null}
                        {user_properties && user_properties.affiliation && user_properties.affiliation.length ?
                            <div className="affiliation-utility-container">
                                <div className="container affiliation-utility">
                                    <span className="curator-affiliation">Affiliation: {affiliation && affiliation.affiliation_fullname ? affiliation.affiliation_fullname : <span>No Affiliation ({user_properties.title})</span>}</span>
                                    <span className="change-affiliation-button">
                                        {context.name === 'dashboard' ?
                                            <button type="button" className="btn btn-default btn-sm" onClick={this.showAffiliationModal}>Change Affiliation</button>
                                            :
                                            <span><i className="icon icon-lightbulb-o"></i> To change your affiliation, go to <a href='/dashboard/'><i className="icon icon-home"></i></a></span>
                                        }
                                    </span>
                                </div>
                            </div>
                            : null}
                        {user_properties && user_properties.affiliation && user_properties.affiliation.length ?
                            this.renderAffiliationModal(user_properties.affiliation, user_properties.title)
                            : null}
                        {content}
                    </div>
                </body>
            </html>
        );
    },

    statics: {
        // Get data to display from page <script> tag
        getRenderedProps: function (document) {
            var props = {};
            // Ensure the initial render is exactly the same
            props.href = document.querySelector('link[rel="canonical"]').href;
            var script_props = document.querySelectorAll('script[data-prop-name]');
            for (var i = 0; i < script_props.length; i++) {
                var elem = script_props[i];
                var value = elem.text;
                var elem_type = elem.getAttribute('type') || '';
                if (elem_type == 'application/json' || elem_type.slice(-5) == '+json') {
                    value = JSON.parse(value);
                }
                props[elem.getAttribute('data-prop-name')] = value;
            }
            return props;
        }
    }
});


// Render the common page header.
var Header = createReactClass({
    render: function() {
        return (
            <header className="site-header">
                <NavbarMain portal={portal} session={this.props.session} href={this.props.href} />
            </header>
        );
    }
});


// Render the notice bar, under header, if needed
// Usage: <Notice noticeType='[TYPE]' noticeMessage={<span>[MESSAGE]</span>} {noticeClosable} />
// Valid noticeTypes: success, info, warning, danger (bootstrap defaults), and demo, production (clingen customs)
var Notice = createReactClass({
    getInitialState: function () {
        return { noticeVisible: true };
    },
    onClick: function() {
        this.setState({ noticeVisible: false });
    },
    render: function() {
        var noticeClass = 'notice-bar alert alert-' + this.props.noticeType;
        if (this.state.noticeVisible) {
            return (
                <div className={noticeClass} role="alert">
                    <div className="container">
                        {this.props.noticeMessage}
                        {this.props.noticeClosable ?
                        <button type="button" className="close" onClick={this.onClick}>&times;</button>
                        : null}
                    </div>
                </div>
            );
        }
        else { return (null); }
    }
});


var NavbarMain = createReactClass({
    mixins: [NavbarMixin],

    propTypes: {
        portal: PropTypes.object.isRequired,
        href: PropTypes.string.isRequired
    },

    render: function() {
        var headerUrl = '/';
        if (this.props.session && this.props.session['auth.userid'] !== undefined) headerUrl = '/dashboard/';
        return (
            <div>
                <div className="container">
                    <NavbarUser portal={this.props.portal} session={this.props.session} href={this.props.href} />
                    <a href={headerUrl} className='navbar-brand'>ClinGen Dashboard</a>
                </div>
            </div>
        );
    }
});


var NavbarUser = createReactClass({
    render: function() {
        var session = this.props.session;
        var demoLoginEnabled = true;
        if (/curation.clinicalgenome.org/.test(url.parse(this.props.href).hostname) || /production.clinicalgenome.org/.test(url.parse(this.props.href).hostname)) {
            // check if production or curation URL. Disable demo login if true
            demoLoginEnabled = false;
        }

        return (
            <Nav navbarStyles='navbar-user' styles='navbar-right nav-user'>
                {this.props.portal.navUser.map(menu => {
                    if (menu.url || menu.title === 'space') {
                        if (menu.id === 'help') {
                            return <NavItem key={menu.id} href={menu.url} title={menu.title}>{menu.title}</NavItem>;
                        }
                        // Normal menu item; disabled if user is not logged in
                        if (session && session['auth.userid']) {
                            return <NavItem key={menu.id} href={menu.url} icon={menu.icon} title={menu.title} target={menu.target}>{menu.title}</NavItem>;
                        }
                    } else {
                        // Trigger menu item; set <a> data attribute to login or logout
                        var attrs = {};

                        // Item with trigger; e.g. login/logout
                        if (!(session && session['auth.userid'])) {
                            if (menu.id === 'loginout') {
                                // Logged out; render signin triggers
                                attrs['data-trigger'] = 'login';
                                return <NavItem {...attrs} key={menu.id}>{menu.title}</NavItem>;
                            } else if (menu.id === 'demo' && demoLoginEnabled) {
                                // Logged out; render signin triggers
                                attrs['data-trigger'] = 'demo';
                                return <NavItem {...attrs} key={menu.id}>{menu.title}</NavItem>;
                            }
                        } else {
                            if (menu.id === 'loginout') {
                                var fullname = (session.user_properties && session.user_properties.title) || 'unknown';
                                attrs['data-trigger'] = 'logout';
                                return <NavItem {...attrs} key={menu.id}>{'Logout ' + fullname}</NavItem>;
                            }
                        }
                    }
                })}
            </Nav>
        );
    }
});
