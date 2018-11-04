'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { RestMixin } from '../../rest';
import AdminReportSelectionForm from './form_select_report';
import { RenderInterpretationQuarterlyNIH } from './render_report';
import { sortListByField } from '../../../libs/helpers/sort';
import { exportCSV } from '../../../libs/export_csv';

const AffiliationsList = require('../../affiliation/affiliations.json');

const AdminReports = createReactClass({
    mixins: [RestMixin],

    getInitialState() {
        return {
            selectedReport: '', // The selected report option from dropdown 
            submitBusy: false, // REST operation in progress
            affiliatedInterpreationsList: []
        };
    },

    /**
     * FIXME - Errors on setState while extends React.Component but not in React.createClass
     */
    onSubmit(value) {
        if (value && value.length) {
            this.setState({selectedReport: value}, () => {
                const selectedReport = this.state.selectedReport;
                if (selectedReport && selectedReport === 'Interpretations Quarterly for NIH') {
                    this.fetchInterpretationsQuarterlyNIH();
                } else {
                    return null;
                }
            });
        }
    },

    /**
     * Handle fetching interpretation data
     * FIXME - Should convert to an external functional stateless component
     */
    fetchInterpretationsQuarterlyNIH() {
        let affiliatedInterpreationsList = [];
    
        // Pre-sort affiliation list by affiliation name
        let sortedAffiliationList = sortListByField(AffiliationsList, 'affiliation_fullname');
        for (let affiliation of sortedAffiliationList) {
            // Initialize the affiliation's interpretation data object
            let affiliatedInterpretationStats = {
                affiliationId: affiliation.affiliation_id,
                affiliationName: affiliation.affiliation_fullname
            };
            this.getRestData('/search/?type=interpretation&affiliation=' + affiliation.affiliation_id).then(response => {
                const interpretations = response['@graph'];
                // Number of interpretations that have a saved evaluation summary but not yet provisioned or approved
                const interpretationsWithSavedSummary = interpretations.length ? interpretations.filter(interpretation => {
                    return interpretation.provisional_count > 0 && interpretation.provisional_variant[0].classificationStatus === 'In progress';
                }) : [];
                // Number of interpretations that have been provisioned but not yet approved
                const interpretationsProvisional = interpretations.length ? interpretations.filter(interpretation => {
                    return interpretation.provisional_count > 0 && interpretation.provisional_variant[0].classificationStatus === 'Provisional';
                }) : [];
                // Number of interpretations that have been approved
                const interpretationsApproved = interpretations.length ? interpretations.filter(interpretation => {
                    return interpretation.provisional_count > 0 && interpretation.provisional_variant[0].classificationStatus === 'Approved';
                }) : [];
                // Fill in the rest of the affiliation's interpretation data object key/value pairs
                affiliatedInterpretationStats['totalInterpretations'] = interpretations.length ? Number(interpretations.length) : Number(0);
                affiliatedInterpretationStats['interpretationsWithSavedSummary'] = interpretationsWithSavedSummary.length ? Number(interpretationsWithSavedSummary.length) : Number(0);
                affiliatedInterpretationStats['interpretationsProvisional'] = interpretationsProvisional.length ? Number(interpretationsProvisional.length) : Number(0);
                affiliatedInterpretationStats['interpretationsApproved'] = interpretationsApproved.length ? Number(interpretationsApproved.length) : Number(0);
                affiliatedInterpreationsList.push(affiliatedInterpretationStats);
                return Promise.resolve(affiliatedInterpreationsList);
            }).then(data => {
                this.setState({affiliatedInterpreationsList: data, submitBusy: false});
            }).catch(err => {
                console.log('Data fetch error: %o', err);
                this.setState({submitBusy: false});
            });
        }
    },

    /**
     * Handle clicks in the table header for sorting
     * FIXME - Should convert to a reusable shared function
     */
    sortBy(key) {
        const reversed = key === this.state.sortCol ? !this.state.reversed : false;
        const sortCol = key;
        const arrayCopy = [...this.state.affiliatedInterpreationsList];
        arrayCopy.sort(this.compareBy);
        this.setState({affiliatedInterpreationsList: arrayCopy, sortCol: sortCol, reversed: reversed});
    },

    /**
     * Call-back for the JS sorting function
     * FIXME - Should convert to a reusable shared function
     */
    compareBy(a, b) {
        let diff;

        switch (this.state.sortCol) {
            case 'totalInterpretations':
                diff = a.totalInterpretations > b.totalInterpretations ? 1 : -1;
                break;
            case 'interpretationsWithSavedSummary':
                diff = a.interpretationsWithSavedSummary > b.interpretationsWithSavedSummary ? 1 : -1;
                break;
            case 'interpretationsProvisional':
                diff = a.interpretationsProvisional > b.interpretationsProvisional ? 1 : -1;
                break;
            case 'interpretationsApproved':
                diff = a.interpretationsApproved > b.interpretationsApproved ? 1 : -1;
                break;
            case 'affiliationName':
                const aLower = a.affiliationName.toLowerCase();
                const bLower = b.affiliationName.toLowerCase();
                diff = aLower > bLower ? 1 : (aLower === bLower ? 0 : -1);
                break;
            default:
                diff = 0;
                break;
        }
        return this.state.reversed ? -diff : diff;
    },

    handleExport() {
        exportCSV(this.state.affiliatedInterpreationsList, {filename: 'interpretations-export.csv'});
    },
    
    render() {
        const submitBusy = this.state.submitBusy;
        const affiliatedInterpreationsList = this.state.affiliatedInterpreationsList;

        return (
            <div className="content">
                <h2>Reports</h2>
                <div className="panel panel-default report-criteria">
                    <AdminReportSelectionForm onSubmit={this.onSubmit} submitBusy={submitBusy} />
                </div>
                {affiliatedInterpreationsList.length ?
                    <div>
                        <RenderInterpretationQuarterlyNIH
                            affiliatedInterpreationsList={affiliatedInterpreationsList}
                            sortBy={this.sortBy}
                        />
                        <div className="report-data-download clearfix">
                            <div className="pull-right">
                                {affiliatedInterpreationsList && affiliatedInterpreationsList.length ?
                                    <button className="btn btn-primary" onClick={this.handleExport}>
                                        <i className="icon icon-download"></i> <span>Download Data</span>
                                    </button>
                                    : null}
                            </div>
                        </div>
                    </div>
                    : null}
            </div>
        );
    }
});

export default AdminReports;
