'use strict';
// Third-party libs
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import { FormMixin, Input } from '../../../../libs/bootstrap/form';

// Internal libs
import { RestMixin } from '../../../rest';
var CuratorHistory = require('../../../curator_history');

import { EvidenceTable } from './evidenceTable';
import { EvidenceModalManager } from './evidenceModalManager';

// Class to render the extra evidence table in VCI, and handle any interactions with it
// export default ExtraEvidenceTable = createReactClass({
var ExtraEvidenceTable = module.exports.ExtraEvidenceTable = createReactClass({
    mixins: [RestMixin, FormMixin, CuratorHistory],

    propTypes: {
        viewOnly: PropTypes.bool, // True if extra evidence is in view-only mode
        tableName: PropTypes.object, // table name as HTML object
        category: PropTypes.string, // category (usually the tab) the evidence is part of
        subcategory: PropTypes.string, // subcategory (usually the panel) the evidence is part of
        session: PropTypes.object, // session object
        variant: PropTypes.object, // parent variant object
        interpretation: PropTypes.object, // parent interpretation object
        updateInterpretationObj: PropTypes.func, // function from index.js; this function will pass the updated interpretation object back to index.js
        affiliation: PropTypes.object, // user's affiliation data object
        criteriaList: PropTypes.array, // criteria code(s) pertinent to the category/subcategory
        deleteEvidenceFunc: PropTypes.func, // function to call to delete an evidence
        evidenceCollectionDone: PropTypes.func,  // function to call to add or edit an existing one
        canCurrUserModifyEvidence: PropTypes.func // funcition to check if current logged in user can modify given evidence
    },

    getInitialState: function() {
        return {
            submitBusy: false, // spinner for Save button
            editBusy: false, // spinner for Edit button
            deleteBusy: false, // spinner for Delete button
            updateMsg: null,   // error message
            tempEvidence: null, // evidence object brought in my AddResourceId modal
            editEvidenceId: null, // the ID of the evidence to be edited from the table
            descriptionInput: null, // state to store the description input content
            editDescriptionInput: null, // state to store the edit description input content
            criteriaInput: 'none', // state to store one or more selected criteria
            editCriteriaInput: 'none', // state to store one or more edited criteria
            variant: this.props.variant, // parent variant object
            interpretation: this.props.interpretation ? this.props.interpretation : null, // parent interpretation object
            criteriaList: this.props.criteriaList ? this.props.criteriaList : [],
            evidenceType: 'PMID'  // One of PMID, clinical_lab, clinic, research_lab, public_database, registered_curator, other
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // Update variant object when received
        if (nextProps.variant) {
            this.setState({variant: nextProps.variant});
        }
        // Update interpretation object when received
        if (nextProps.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        // Update criteria list specific to the PMID
        if (nextProps.criteriaList) {
            this.setState({criteriaList: nextProps.criteriaList});
        }
    },

    setEvidenceType: function(ref, event) {
        if (event.target.value === 'select-source') {
            this.setState({evidenceType: null});
        } else {
            this.setState({evidenceType: event.target.value});
        }
    },

    addEvidenceText: function() {
        let text = 'Click "Add Evidence" to curate and save a piece of evidence.';
        if (this.state.evidenceType == null) {
            text = 'Select an evidence source above';
        }
        return (
            <span style={{marginLeft: '5px'}}>{text}</span>
        )
    },

    render: function() {
        let relevantEvidenceListRaw = [];
        if (this.state.variant && this.state.variant.associatedInterpretations) {
            this.state.variant.associatedInterpretations.map(interpretation => {
                if (interpretation.extra_evidence_list) {
                    interpretation.extra_evidence_list.forEach(extra_evidence => {
                        // temporary codes
                        //relevantEvidenceListRaw.push(extra_evidence);
                        if (extra_evidence.category === 'case-segregation') {
                            relevantEvidenceListRaw.push(extra_evidence);
                        }
                    });
                    // interpretation.extra_evidence_list.map(extra_evidence => {
                    //     if (extra_evidence.subcategory === this.props.subcategory) {
                    //         relevantEvidenceListRaw.push(extra_evidence);
                    //     }
                    // });
                }
            });
        }
        let relevantEvidenceList = _(relevantEvidenceListRaw).sortBy(evidence => {
            return evidence.date_created;
        }).reverse();
        let extraEvidenceData = [];
        if (this.state.interpretation != null && 'extra_evidence_list' in this.state.interpretation) {
            // temporary codes
            //extraEvidenceData = this.state.interpretation.extra_evidence_list
            let extraEvidenceData = [];
            if (this.state.interpretation.extra_evidence_list) {
                this.state.interpretation.extra_evidence_list.forEach(extra_evidence => {
                    if (extra_evidence.category === 'case-segregation') {
                        extraEvidenceData.push(extra_evidence);
                    }
                });
            }
        }
        /* removed source options for now
                                                    <Input type="select" defaultValue="select-source" handleChange={this.setEvidenceType}>
                                                        <option value="select-source">Select Source</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="PMID">PMID</option>
                                                        <option value="clinical_lab">Clinical Lab</option>
                                                        <option value="clinic">Clinic</option>
                                                        <option value="research_lab">Research Lab</option>
                                                        <option value="public_database">Public Database</option>
                                                        <option value="other">Other</option>
                                                    </Input>
        */
        return (
            <div className="panel panel-info">
                <div className="panel-heading"><h3 className="panel-title">{this.props.tableName}</h3></div>
                <div className="panel-content-wrapper">
                    <table className="table">
                        <tbody>
                            {!this.props.viewOnly ?
                                <tr>
                                    <td colSpan="6">
                                        <span>
                                            <div className="row">
                                                <div className="col-md-12">
                                                    <Input type="select" defaultValue="PMID" handleChange={this.setEvidenceType}>
                                                        <option value="PMID">PMID</option>
                                                    </Input>
                                                    <EvidenceModalManager
                                                        data = {null}
                                                        allData = {relevantEvidenceList}
                                                        criteriaList = {this.props.criteriaList}
                                                        evidenceType = {this.state.evidenceType}
                                                        subcategory = {this.props.subcategory}
                                                        evidenceCollectionDone = {this.props.evidenceCollectionDone}
                                                        isNew = {true}
                                                        affiliation = {this.props.affiliation}
                                                        session = {this.props.session}
                                                        canCurrUserModifyEvidence = {this.props.canCurrUserModifyEvidence}
                                                    >
                                                    </EvidenceModalManager>
                                                    {this.addEvidenceText()}
                                                </div>
                                            </div>
                                        </span>
                                    </td>
                                </tr>
                            : null}
                        </tbody>
                    </table>
                    <EvidenceTable
                        allData = {extraEvidenceData}
                        tableData = {relevantEvidenceList}
                        subcategory = {this.props.subcategory}
                        deleteEvidenceFunc = {this.props.deleteEvidenceFunc}
                        evidenceCollectionDone = {this.props.evidenceCollectionDone}
                        criteriaList = {this.props.criteriaList}
                        session = {this.props.session}
                        affiliation = {this.props.affiliation}
                        viewOnly = {this.props.viewOnly}
                        canCurrUserModifyEvidence = {this.props.canCurrUserModifyEvidence}
                    >
                    </EvidenceTable>
                </div>
            </div>
        );
    }
});
