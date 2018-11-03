'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { curator_page } from '../globals';
import { RestMixin } from '../rest';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
const AffiliationsList = require('../affiliation/affiliations.json');

const AdminConsole = createReactClass({
    propTypes: {
        context: PropTypes.object,
        session: PropTypes.object
    },

    getInitialState() {
        return {
            selectedReport: '', // The selected report option from dropdown 
            submitBusy: false // REST operation in progress
        };
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

    // Handle report selection
    handleChange(ref, e) {
        if (ref === 'selectedReport') {
            const selection = this.refs[ref].getValue();
            if (selection === 'none') {
                // reset form
                this.setState({selectedReport: ''});
            } else {
                this.setState({selectedReport: selection});
            }
        }
    },

    submitForm(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        // Save all form values from the DOM.
        this.saveAllFormValues();
        this.setState({submitBusy: true});

        const selectedReport = this.state.selectedReport;
        if (this.validateDefault() && selectedReport && selectedReport === 'NIH Quarterly') {
            for (let affiliation of AffiliationsList) {
                this.getRestData('/search/?type=interpretation&affiliation=' + affiliation.affiliation_id).then(response => {

                });
            }
        }
    },
    
    render() {
        const title = this.props.context.title;
        const user = this.props.session.user_properties;
        let group = user && user.groups && user.groups.length ? user.groups[0] : null;
        const user_name = user && user.title ? user.title : 'anonymous';
        const selectedReport = this.state.selectedReport;
        let data = null;

        return (
            <div>
                {group === 'admin' ?
                    <div className="admin-page">
                        <div className="admin-page-header clearfix">
                            <h3 className="pull-left">{title}</h3>
                            <span className="pull-right">
                                <a href="/dashboard/"><i className="icon icon-home"></i></a>
                                <span><i className="icon icon-user"></i> {user_name}</span>
                            </span>
                        </div>
                        <div className="admin-page-body">
                            <div className="side-navigation">
                                <ul className="side-navigation-item-list">
                                    <li className="side-navigation-item"><i className="icon icon-clipboard"></i> Reports</li>
                                </ul>
                            </div>
                            <div className="content">
                                <h2>Reports</h2>
                                <div className="panel panel-default report-criteria">
                                    <Form submitHandler={this.submitForm} formClassName="form-report-criteria">
                                        <div className="form-report-criteria-content clearfix">
                                            <Input type="select" ref="selectedReport" label="Select report:" handleChange={this.handleChange}
                                                groupClassName="form-group" defaultValue="none" value={selectedReport ? selectedReport : 'none'}>
                                                <option value="none">No Selection</option>
                                                <option disabled="disabled"></option>
                                                <option value="NIH Quarterly">NIH Quarterly</option>
                                            </Input>
                                            <Input type="submit" inputClassName="btn-primary submit-report" id="submit" title="Submit" submitBusy={this.state.submitBusy} />
                                        </div>
                                    </Form>
                                </div>
                                {data ?
                                    <div className="report-content">
                                    </div>
                                    : null}
                            </div>
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