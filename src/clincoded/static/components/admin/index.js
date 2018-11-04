'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { curator_page } from '../globals';
import AdminPageHeader from './header';
import AdminPageSideNavigation from './side_nav';
import AdminReports from './reports';

const AdminConsole = createReactClass({
    propTypes: {
        context: PropTypes.object,
        session: PropTypes.object
    },

    componentDidUpdate(prevProps, prevState) {
        // Remove site header, notice bar (if any) & affiliation bar from DOM
        const siteHeader = document.querySelector('.site-header');
        siteHeader.setAttribute('style', 'display:none');
        const noticeBar = document.querySelector('.notice-bar');
        if (noticeBar) {
            noticeBar.setAttribute('style', 'display:none');
        }
        const affiliationUtilityBar = document.querySelector('.affiliation-utility-container');
        if (affiliationUtilityBar) {
            affiliationUtilityBar.setAttribute('style', 'display:none');
        }
    },
    
    render() {
        const title = this.props.context.title;
        const user = this.props.session.user_properties;
        let group = user && user.groups && user.groups.length ? user.groups[0] : null;
        const user_name = user && user.title ? user.title : 'anonymous';

        return (
            <div>
                {group === 'admin' ?
                    <div className="admin-page">
                        <AdminPageHeader title={title} user_name={user_name} />
                        <div className="admin-page-body">
                            <AdminPageSideNavigation />
                            <AdminReports />
                        </div>
                    </div>
                    :
                    <div className="container"><h3><i className="icon icon-exclamation-triangle"></i> Sorry. You do not have access to this page.</h3></div>
                }
            </div>
        );
    }
});

curator_page.register(AdminConsole, 'curator_page', 'admin');