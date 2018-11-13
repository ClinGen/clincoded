'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { RestMixin } from '../../rest';
import AdminReportSelectionForm from './form_select_report';
import { RenderInterpretationStats, RenderGeneDiseaseRecordStats } from './render_report';
import { sortListByField, sortListByDate } from '../../../libs/helpers/sort';
import { exportCSV } from '../../../libs/export_csv';

const AffiliationsList = require('../../affiliation/affiliations.json');

const AdminReports = createReactClass({
    mixins: [RestMixin],

    getInitialState() {
        return {
            selectedReport: '', // The selected report option from dropdown 
            submitBusy: false, // REST operation in progress
            affiliatedInterpreationsList: [],
            affiliatedGDMsList: []
        };
    },

    /**
     * FIXME - Errors on setState while extends React.Component but not in React.createClass
     */
    onSubmit(value) {
        let filteredAffiliationList = AffiliationsList.filter(affiliation => !affiliation.affiliation_id.match(/10024|88888|99999/));
        const sortedAffiliationList = sortListByField(filteredAffiliationList, 'affiliation_fullname');

        if (value && value.length) {
            this.setState({selectedReport: value}, () => {
                const selectedReport = this.state.selectedReport;
                if (selectedReport && selectedReport === 'Interpretation Stats for Expert Panels') {
                    this.setState({affiliatedGDMsList: []}, () => {
                        this.fetchInterpretationStats(sortedAffiliationList);
                    });
                } else if (selectedReport && selectedReport === 'Gene-Disease Record Stats for Expert Panels') {
                    this.setState({affiliatedInterpreationsList: []}, () => {
                        this.fetchGdmStats(sortedAffiliationList);
                    });
                } else {
                    return false;
                }
            });
        }
    },

    /**
     * Handle fetching interpretation data
     * FIXME - Should convert to an external functional stateless component
     */
    fetchInterpretationStats(sortedAffiliationList) {
        let affiliatedInterpreationsList = [];

        for (let affiliation of sortedAffiliationList) {
            // Initialize the affiliation's interpretation data object
            let affiliatedInterpretationStats = {
                affiliationId: affiliation.affiliation_id,
                affiliationName: affiliation.affiliation_fullname
            };
            this.getRestData('/search/?type=interpretation&affiliation=' + affiliation.affiliation_id).then(response => {
                const interpretations = response['@graph'].filter(interpretation => interpretation.status !== 'deleted');
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
                console.log('Interpretations data fetch error: %o', err);
                this.setState({submitBusy: false});
            });
        }
    },

    /**
     * Handle fetching gene-disease record data
     * FIXME - Should convert to an external functional stateless component
     */
    fetchGdmStats(sortedAffiliationList) {
        let affiliatedGDMsList = [];

        for (let affiliation of sortedAffiliationList) {
            // Initialize the affiliation's interpretation data object
            let affiliatedGdmStats = {
                affiliationId: affiliation.affiliation_id,
                affiliationName: affiliation.affiliation_fullname
            };
            this.getRestData('/search/?type=gdm&affiliation=' + affiliation.affiliation_id).then(response => {
                const gdms = response['@graph'].filter(gdm => gdm.status !== 'deleted');
                // Number of GDMs that have saved classifications but not yet provisioned or approved or published
                const gdmsWithSavedSummary = gdms.length ? gdms.filter(gdm => {
                    const classifications = gdm.provisionalClassifications;
                    const affiliatedClassification = this.findAffiliatedClassification(classifications, affiliation.affiliation_id);
                    return affiliatedClassification && affiliatedClassification.classificationStatus === 'In progress';
                }) : [];
                // Number of GDMs whose classifications have been provisioned but not yet approved
                const gdmsProvisional = gdms.length ? gdms.filter(gdm => {
                    const classifications = gdm.provisionalClassifications;
                    const affiliatedClassification = this.findAffiliatedClassification(classifications, affiliation.affiliation_id);
                    return affiliatedClassification && affiliatedClassification.classificationStatus === 'Provisional';
                }) : [];
                // Number of GDMs whose classifications have been approved, including ones that had been published
                const gdmsApproved = gdms.length ? gdms.filter(gdm => {
                    const classifications = gdm.provisionalClassifications;
                    const affiliatedClassification = this.findAffiliatedClassification(classifications, affiliation.affiliation_id);
                    return affiliatedClassification && affiliatedClassification.classificationStatus === 'Approved';
                }) : [];
                // Number of GDMs whose classifications have been published
                const gdmsPublished = gdms.length ? gdms.filter(gdm => {
                    const classifications = gdm.provisionalClassifications;
                    const affiliatedClassification = this.findAffiliatedClassification(classifications, affiliation.affiliation_id);
                    // Get the most recently published snapshot
                    const snapshots = affiliatedClassification && affiliatedClassification.associatedClassificationSnapshots ? affiliatedClassification.associatedClassificationSnapshots : null;
                    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
                    const publishedSnapshot = sortedSnapshots.find(snapshot => snapshot.approvalStatus === 'Approved' && snapshot.publishStatus);
                    return typeof publishedSnapshot === 'object' && Object.keys(publishedSnapshot).length;
                }) : [];
                // Fill in the rest of the affiliation's interpretation data object key/value pairs
                affiliatedGdmStats['totalGdms'] = gdms.length ? Number(gdms.length) : Number(0);
                affiliatedGdmStats['gdmsWithSavedSummary'] = gdmsWithSavedSummary.length ? Number(gdmsWithSavedSummary.length) : Number(0);
                affiliatedGdmStats['gdmsProvisional'] = gdmsProvisional.length ? Number(gdmsProvisional.length) : Number(0);
                affiliatedGdmStats['gdmsApproved'] = gdmsApproved.length ? Number(gdmsApproved.length) - Number(gdmsPublished.length) : Number(0);
                affiliatedGdmStats['gdmsPublished'] = gdmsPublished.length ? Number(gdmsPublished.length) : Number(0);
                affiliatedGDMsList.push(affiliatedGdmStats);
                return Promise.resolve(affiliatedGDMsList);
            }).then(data => {
                this.setState({affiliatedGDMsList: data, submitBusy: false});
            }).catch(err => {
                console.log('GDM data fetch error: %o', err);
                this.setState({submitBusy: false});
            });
        }
    },

    /**
     * Helper method to find the affiliated classification
     * @param {array} classifications - List of GDM's classifications
     * @param {string} affiliationId - The affiliation id
     */
    findAffiliatedClassification(classifications, affiliationId) {
        let affiliatedClassification = classifications && classifications.length ? classifications.find(classification => {
            return classification.affiliation && classification.affiliation === affiliationId;
        }) : null;
        return affiliatedClassification;
    },

    /**
     * Handle clicks in the table header for sorting
     * FIXME - Should convert to a reusable shared function
     */
    sortBy(key) {
        const reversed = key === this.state.sortCol ? !this.state.reversed : false;
        const sortCol = key;
        const affiliatedInterpreationsListCopy = [...this.state.affiliatedInterpreationsList];
        const affiliatedGDMsListCopy = [...this.state.affiliatedGDMsList];
        if (affiliatedInterpreationsListCopy.length) {
            affiliatedInterpreationsListCopy.sort(this.compareBy);
            this.setState({affiliatedInterpreationsList: affiliatedInterpreationsListCopy, sortCol: sortCol, reversed: reversed});
        }
        if (affiliatedGDMsListCopy.length) {
            affiliatedGDMsListCopy.sort(this.compareBy);
            this.setState({affiliatedGDMsList: affiliatedGDMsListCopy, sortCol: sortCol, reversed: reversed});
        }
    },

    /**
     * Call-back for the JS sorting function
     * FIXME - Should convert to a reusable shared function
     */
    compareBy(a, b) {
        let diff;

        switch (this.state.sortCol) {
            case 'affiliationName':
                const aLower = a.affiliationName.toLowerCase();
                const bLower = b.affiliationName.toLowerCase();
                diff = aLower > bLower ? 1 : (aLower === bLower ? 0 : -1);
                break;
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
            case 'totalGdms':
                diff = a.totalGdms > b.totalGdms ? 1 : -1;
                break;
            case 'gdmsWithSavedSummary':
                diff = a.gdmsWithSavedSummary > b.gdmsWithSavedSummary ? 1 : -1;
                break;
            case 'gdmsProvisional':
                diff = a.gdmsProvisional > b.gdmsProvisional ? 1 : -1;
                break;
            case 'gdmsApproved':
                diff = a.gdmsApproved > b.gdmsApproved ? 1 : -1;
                break;
            case 'gdmsPublished':
                diff = a.gdmsPublished > b.gdmsPublished ? 1 : -1;
                break;
            default:
                diff = 0;
                break;
        }
        return this.state.reversed ? -diff : diff;
    },

    handleExport(contentType, filename) {
        if (contentType === 'interpretation') {
            exportCSV(this.state.affiliatedInterpreationsList, {filename: filename});
        } else if (contentType === 'gdm') {
            exportCSV(this.state.affiliatedGDMsList, {filename: filename});
        } else {
            return false;
        }
    },
    
    render() {
        const submitBusy = this.state.submitBusy;
        const affiliatedInterpreationsList = this.state.affiliatedInterpreationsList;
        const affiliatedGDMsList = this.state.affiliatedGDMsList;

        return (
            <div className="content">
                <h2>Reports</h2>
                <div className="panel panel-default report-criteria">
                    <AdminReportSelectionForm onSubmit={this.onSubmit} submitBusy={submitBusy} />
                </div>
                {affiliatedInterpreationsList.length ?
                    <div>
                        <RenderInterpretationStats
                            affiliatedInterpreationsList={affiliatedInterpreationsList}
                            sortBy={this.sortBy}
                        />
                        <div className="report-data-download clearfix">
                            <div className="pull-right">
                                {affiliatedInterpreationsList && affiliatedInterpreationsList.length ?
                                    <button className="btn btn-primary" onClick={this.handleExport.bind(null, 'interpretation', 'interpretations-export.csv')}>
                                        <i className="icon icon-download"></i> <span>Export data to .csv</span>
                                    </button>
                                    : null}
                            </div>
                        </div>
                    </div>
                    : null}
                {affiliatedGDMsList.length ?
                    <div>
                        <RenderGeneDiseaseRecordStats
                            affiliatedGDMsList={affiliatedGDMsList}
                            sortBy={this.sortBy}
                        />
                        <div className="report-data-download clearfix">
                            <div className="pull-right">
                                {affiliatedGDMsList && affiliatedGDMsList.length ?
                                    <button className="btn btn-primary" onClick={this.handleExport.bind(null, 'gdm', 'gdms-export.csv')}>
                                        <i className="icon icon-download"></i> <span>Export data to .csv</span>
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
