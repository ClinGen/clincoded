'use strict';

// stdlib
import React from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

// third-party lib
import ModalComponent from '../../../../libs/bootstrap/modal';
import { Form, FormMixin, Input } from '../../../../libs/bootstrap/form';
import _ from 'underscore';

// Internal lib
import { extraEvidence } from './segregationData';
import { external_url_map } from '../../../globals';
import { RestMixin } from '../../../rest';
import * as curator from '../../../curator';

let EvidenceSheet = createReactClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        ready: PropTypes.bool,                      // Flag if ready for second modal
        sheetDone: PropTypes.func,                  // Function to call to add or edit an evidence
        data: PropTypes.object,                     // Data relevant to this particular piece of evidence
        allData: PropTypes.object,                  // All extra evidence across all entries for this variant
        isNew: PropTypes.bool,                      // If we are adding a new piece of evidence or editing an existing piece
        isFromMaster: PropTypes.bool,               // If editing an existing evidence by clicking edit button in master/tally table
        subcategory: PropTypes.string,              // Subcategory (usually the panel) the evidence is part of
        evidenceType: PropTypes.string              // Evidence source type
    },

    getInitialState: function() {
        let data =  {};
        let hpoUnaffected = false;
        let hpoData = [];
        if (this.props.data) {
            data = this.props.data;
            hpoUnaffected = this.props.data.is_disease_associated_with_probands;
            hpoData = this.props.data.hpoData ? this.props.data.hpoData : [];
        }
        return {
            data: data,
            hpoData: hpoData,
            hpoUnaffected: hpoUnaffected,  // Flag for "Disease associated with proband(s) (HPO)" checkbox
            backgroundGreen: '#00FF0030',
            errorMsg: '',
            enableSubmit: true             // Flag to enable Submit button
        };
    },

    componentDidMount() {
        this.props.onRef(this);
    },

    componentWillUnmount() {
        this.props.onRef(null);
    },

    handleModalClose() {
        this.child.closeModal();
    },

    cancel() {
        this.props.sheetDone(null);
        this.handleModalClose();
    },

    showError(msg) {
        this.setState({
            errorMsg: msg
        });
    },

    enableSubmitButton(flag) {
        this.setState({
            enableSubmit: flag
        });
    },

    clearHpoTerms() {
        this.setState({ hpoData: [] });	
        this.clrFormErrors('proband_hpo_ids');
    },

    /**
     * Submit button is clicked.  Save all form data and call function to save in db.
     * Close the modal.
     * 
     * @param {object} e    // event
     */
    submitNewEvidence(e) {
        e.preventDefault();
        e.stopPropagation();

        this.saveAllFormValues();
        const formValues = this.getAllFormValues();

        let formError = false;
        if (this.validateDefault()) {
            // Check HPO ID format
            const hpoIds = curator.capture.hpoids(this.getFormValue('proband_hpo_ids'));
            const filteredIds = this.filterOutExtraHpo(hpoIds);
            const duplicateExists = this.checkForDuplicateHpo(hpoIds);
            if (hpoIds && hpoIds.length && _(hpoIds).any(id => id === null)) {
                // HPOID list is bad
                formError = true;
                this.setFormErrors('proband_hpo_ids', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
            } else if (duplicateExists) {
                formError = true;
                this.setFormErrors('proband_hpo_ids', 'Please remove duplicate IDs.')
            } else if (filteredIds && filteredIds.length) {
                // Input and hpoData don't match
                formError = true;
                this.setFormErrors('proband_hpo_ids', `The terms and IDs above do not match. Please remove or retrieve terms again. (${filteredIds.join(', ')})`)
            }
            if (!formError) {
                let allData = null;
                let hpoData = {hpoData: this.state.hpoData};
                if (this.props.isNew) {
                    allData = Object.assign(this.props.data, formValues, hpoData);
                } else {
                    allData = Object.assign({}, this.props.data);
                    Object.assign(allData, formValues, hpoData);
                }
                this.handleModalClose();
                this.resetAllFormValues();
                this.setState({
                    data: {},
                    hpoData: [],
                    hpoUnaffected: false
                });
                this.props.sheetDone(allData);
            }
        }
    },

    /**
     * Given the subcategory, return a list of allowed fields.
     * This is used to highlight the input.
     */
    allowedFields() {
        let tableObj = _.find(extraEvidence.tableCols(), o => o.subcategory === this.props.subcategory);
        let fields = tableObj && tableObj.cols ? tableObj.cols.map(col => col.key) : [];
        if (fields.indexOf('comments') != -1) {
            fields.splice(fields.indexOf('comments'), 1);
        }
        return fields;
    },

    /**
     * If the "Disease associated with proband(s) (HPO) (Check here if unaffected)"
     * checkbox is toggled, save its current state.
     * 
     * @param {string} ref 
     * @param {event} e 
     */
    handleCheckboxChange(ref, e) {
        if (ref === 'is_disease_associated_with_probands') {
            this.setState({hpoUnaffected: this.refs[ref].toggleValue()});
        }
    },

    /**
     * Check for duplicates and return a boolean value accordingly
     * @param {array} inputIds 
     */
    checkForDuplicateHpo(inputIds) {
        if (inputIds && inputIds.length) {
            return inputIds.some((id, index) => inputIds.indexOf(id) !== index)
        }
    },

    /**
     * Check that hpoData and proband_hpo_ids are the same
     * If not, returns array of rejected ids for form validation
     * @param {array} inputIds
     */
    filterOutExtraHpo(inputIds) {
        const hpoData = this.state.hpoData;
        if (hpoData && hpoData.length) {
            const idsFromHpoData = [];
            hpoData.forEach(obj =>{
                idsFromHpoData.push(obj.hpoId);
            });
            if (inputIds.length > idsFromHpoData.length) {
                return inputIds.filter(id => !idsFromHpoData.includes(id));
            } else if (idsFromHpoData.length > inputIds.length) {
                return idsFromHpoData.filter(id => !inputIds.includes(id));
            }
        }
    },

    /**
     * Display the input fields with available values
     */
    inputs() {
        let jsx = [];
        let i = 0;
        let trStyle = {
            'display': 'flex',
            'alignItems': 'flex-end'
        };

        // Get a list of allowed fields
        let fields = this.allowedFields();

        extraEvidence.evidenceInputs.forEach(row => {
            let rowTDs = [];
            let done = false;
            row.cols.forEach(col => {
                let value = '';
                if (this.state.data != null && Object.keys(this.state.data).length > 0) {
                    value = this.state.data[col.name];
                }

                // Set up the label for the input
                let codes = extraEvidence.fieldToCriteriaCodeMapping
                    .filter(obj => obj.key === col.name)
                    .map(obj => obj.codes);
                let label = col.label;
                if (codes.length > 0) {
                    label += ` (${codes.join(', ')})`;
                }

                let node = [<div className={`col-md-${col.width}`}  style={{textAlign: 'left'}} key={i++}>
                    <Input 
                        type = {col.kind}
                        label = {label}
                        name = {col.name}
                        ref = {col.name}
                        value = {col.kind != 'checkbox' ? value : null}
                        checked = {col.name === 'is_disease_associated_with_probands' && this.state.hpoUnaffected != undefined ? this.state.hpoUnaffected : false}
                        handleChange = {col.kind === 'checkbox' ? this.handleCheckboxChange : null}
                        error = {this.getFormError(col.name)}
                        clearError = {this.clrFormErrors.bind(null, col.name)}
                        fieldStyle = {fields.indexOf(col.name) == -1 || this.props.isFromMaster ? null : {backgroundColor: this.state.backgroundGreen}}
                    />
                </div>]
                if ('lookup' in col) {
                    // Push nodes separately so elements do not stack vertically
                    node.push(
                        <div className="col-md-2">
                            <Input
                                type="button"
                                inputClassName="btn btn-primary btn-default get-terms-btn"
                                title="Get Terms"
                                clickHandler={() => this.lookupTerm()}
                            >
                            </Input>
                        </div>
                    );
                    node.push(	
                        <div className="col-md-2">	
                            <Input 	
                                type="button"	
                                inputClassName="btn btn-danger btn-default clear-terms-btn"	
                                title="Clear Terms"	
                                clickHandler={() => this.clearHpoTerms()}	
                            >
                            </Input>
                        </div>
                    );
                    node.push(
                        <div className="col-md-12">
                            <label className={!this.state.hpoData.length ? 'terms-label' : ''}>Terms for phenotypic feature(s) associated with proband(s):</label>
                            {this.renderLookupResult()}
                        </div>
                    );
                }
                rowTDs.push(node);
                // if field needs to be put in its own row, add it here.
                if (col.width === 12) {
                    let rowTR = <div className="row" style={trStyle} key={i++}>
                        {rowTDs}
                    </div>
                    jsx.push(rowTR);
                    rowTDs = [];
                    done = true;
                }
            });
            // if row has not been added, add it here.
            if (!done) {
                let rowTR = <div className="row" style={trStyle} key={i++}>
                    {rowTDs}
                </div>
                jsx.push(rowTR);
            }
        });
        return jsx;
    },

    /**
     * Renders list of saved HPO terms and their respective ids
     */
    renderLookupResult() {
        if (this.state.hpoData && !this.state.hpoData.length) {
            return null;
        }
        if (this.state.hpoData && this.state.hpoData.length) {
            let hpo = this.state.hpoData.map((obj, i) => {
                return <li key={i}>{obj.hpoTerm} ({obj.hpoId})</li>
            });
        
            let node = (
                <div className="text-left">
                    <ul>
                        {hpo}
                    </ul>
                </div>
            );
            return node;
        }
    },

    /**
     * 
     * @param {string} hpoIds
     */
    validateHpo(hpoIds) {
        const checkIds = curator.capture.hpoids(hpoIds);
        // Check HPO ID format
        if (checkIds && checkIds.length && _(checkIds).any(id => id === null)) {
            // HPOID list is bad
            this.setFormErrors('proband_hpo_ids', 'For term lookup, use HPO IDs (e.g. HP:0000001) separated by commas');
        }
        else if (checkIds && checkIds.length && !_(checkIds).any(id => id === null)) {
            const hpoIdList = _.without(checkIds, null);
            return _.uniq(hpoIdList);
        }
    },

    /**
     * Fetch terms from proband_hpo_id form value, save to state as array of objects
     */
    lookupTerm() {
        this.saveAllFormValues();
        const hpoIds = this.getFormValue('proband_hpo_ids');
        const validatedHpoList = this.validateHpo(hpoIds);
        const hpoWithTerms = [];
        if (validatedHpoList) {
            validatedHpoList.forEach(id => {
                let url = external_url_map['HPOApi'] + id;
                this.getRestData(url).then(result => {
                    const term = result['details']['name'];
                    const hpo = {hpoId: id, hpoTerm: term};
                    hpoWithTerms.push(hpo);
                    this.setState({ hpoData: hpoWithTerms });
                }).catch(err => {
                    // Unsuccessful retrieval
                    console.warn('Error in fetching HPO data =: %o', err);
                    const term = 'Term not found';
                    const hpo = {hpoId: id, hpoTerm: term};
                    hpoWithTerms.push(hpo);
                    this.setState({ hpoData: hpoWithTerms });
                });
            });
            this.clrFormErrors('proband_hpo_ids');
        }
    },

    render() {
        var submitErrClass = 'submit-err ' + (this.anyFormErrors() ? '' : ' hidden');
        var errMsgClass = this.state.errorMsg === '' ? 'hidden' : '';
        var submitClass = "btn-default btn-inline-spacer btn-primary" + (this.state.errorMsg === '' && this.state.enableSubmit === true ? '' : ' disabled');
        var showMsgClass = this.props.isFromMaster ? 'hidden' : '';

        return  <ModalComponent
            modalTitle={this.props.isNew ? "Add Evidence Details" : "Edit Evidence Details"}
            modalClass="modal-default"
            modalWrapperClass="input-inline add-resource-id-modal"
            onRef={ref => (this.child = ref)}
            actuatorDisabled={!this.props.ready}
            modalOpen={this.props.ready}
            modalWidthPct={90}
        >
        <div className="form-std">
            <div className="case-seg-modal modal-body" style={{textAlign: 'left'}}>
                <h4 className={errMsgClass} style={{color: 'red'}}>
                    {this.state.errorMsg}
                </h4>
                <h4>
                    For {extraEvidence.typeMapping[this.props.evidenceType].name} evidence details
                </h4>
                <h4 className={showMsgClass}>
                    Fields marked in a <span style={{backgroundColor: this.state.backgroundGreen}}>green background</span> are specifically relevant to this Criteria Code.
                </h4>
                <Form submitHandler={this.submitNewEvidence} formClassName="form-horizontal form-std">
                {this.inputs()}
                <div className="row">&nbsp;<br />&nbsp;</div>
                <div className='modal-footer'>
                <h4 className={errMsgClass} style={{color: 'red'}}>{this.state.errorMsg}</h4>
                <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                    <Input type="submit" inputClassName={submitClass} title="Submit" id="submit" />
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancel} title="Cancel" />
                </div>
                </Form>
            </div>
        </div>
        </ModalComponent>
    }
});

module.exports = {
    EvidenceSheet: EvidenceSheet
};
