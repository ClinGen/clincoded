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
        evidenceCollectionDone: PropTypes.func,     // Function to call to add or edit an evidence
        ready: PropTypes.bool,                      // Flag if ready for second modal
        data: PropTypes.object,                     // Data relevant to this particular piece of evidence
        allData: PropTypes.object,                  // All extra evidence across all entries for this variant
        isNew: PropTypes.bool,                      // If we are adding a new piece of evidence or editing an existing piece
        subcategory: PropTypes.string               // Subcategory (usually the panel) the evidence is part of
    },

    getInitialState: function() {
        let data =  {};
        let hpoUnaffected = false;
        if (this.props.data) {
            data = this.props.data;
            hpoUnaffected = this.props.data.is_disease_associated_with_probands;
        }
        return {
            data: data,
            hpo: null,
            hpoUnaffected: hpoUnaffected,  // Flag for "Disease associated with proband(s) (HPO)" checkbox
            backgroundGreen: '#00FF0030'
        };
    },

    handleModalClose() {
        this.child.closeModal();
    },

    cancel() {
        this.props.sheetDone(null);
        this.handleModalClose();
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
        let formValues = this.getAllFormValues();

        var formError = false;
        // Check HPO ID format
        var hpoids = curator.capture.hpoids(this.getFormValue('proband_hpo_ids'));
        if (hpoids && hpoids.length && _(hpoids).any(function(id) { return id === null; })) {
            // HPOID list is bad
            formError = true;
            this.setFormErrors('proband_hpo_ids', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
        }

        if (!formError) {
            let allData = null;
            if (this.props.isNew) {
                allData = Object.assign(this.props.data, formValues);
            } else {
                allData = Object.assign({}, this.props.data);
                Object.assign(allData, formValues);
            }
            this.handleModalClose();
            this.resetAllFormValues();
            this.setState({
                data: {},
                hpoUnaffected: false
            });
            this.props.sheetDone(allData);
        }
    },

    /**
     * Given the subcategory, return a list of allowed fields.
     * This is used to highlight the input.
     */
    allowedFields() {
        let tableObj = _.find(extraEvidence.tableCols(), o => o.subcategory === this.props.subcategory);
        let fields = tableObj.cols.map(col => col.key);
        if (fields.indexOf('comments') != -1) {
            fields.splice(fields.indexOf('comments'), 1);
        }
        return fields;
    },

    /**
     * If the "Disease associated with proband(s) (HPO) (Check here if unaffected)"
     * checkbox is toggled, save its current state.
     * 
     * @param {sting} ref 
     * @param {event} e 
     */
    handleCheckboxChange(ref, e) {
        if (ref === 'is_disease_associated_with_probands') {
            this.setState({hpoUnaffected: this.refs[ref].toggleValue()});
        }
    },

    /**
     * Display the input fields with available values
     */
    inputs() {
        let jsx = [];
        let i = 0;
        let outerStyle = {
            'display': 'flex',
            'alignItems': 'flex-end'
        };

        // Get a list of allowed fields
        let fields = this.allowedFields();

        extraEvidence.evidenceInputs.forEach(row => {
            let inner = [];
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
                        value = { col.kind != 'checkbox' ? value : null}
                        checked = { col.name === 'is_disease_associated_with_probands' && this.state.hpoUnaffected != undefined ? this.state.hpoUnaffected : false }
                        handleChange = { col.kind === 'checkbox' ? this.handleCheckboxChange : null }
                        error = { col.name === 'proband_hpo_ids' ? this.getFormError('proband_hpo_ids') : null }
                        fieldStyle = { fields.indexOf(col.name) == -1 ? null : {backgroundColor: this.state.backgroundGreen} }
                    />
                </div>]
                // if ('lookup' in col) {
                //     node.push(<div className="col-md-1">
                //         <Input 
                //             type = "button"
                //             inputClassName="btn-default btn-inline-spacer"
                //             title="Lookup"
                //             clickHandler={() => this.lookupTerm(col.lookup, col.name)}
                //             style={{'alignSelf': 'center'}}
                //         >
                //         </Input>
                //         {this.renderLookupResult()}
                //     </div>);
                // }
                inner.push(node);
            });
            let outer = <div className="row" style={outerStyle} key={i++}>
                {inner}
            </div>
            jsx.push(outer);
        });
        return jsx;
    },

    renderLookupResult() {
        if (this.state.hpo == null) {
            return null;
        }
        let node = <div className="row">
            <p>
                <strong>{this.state.hpo.label}</strong>
                {this.state.hpo.description[0]}
            </p>
            <a 
                href={this.state.hpo.iri} 
                title={"Open HPO term " + this.state.hpo.short_form + " in new tab"}
                target="_blank"
            >
                {this.state.hpo.short_form}
            </a>
        </div>
        return node;
    },

    lookupTerm(termType, fieldName) {
        let uri = external_url_map[termType];
        this.saveAllFormValues();
        const formValues = this.getAllFormValues();
        if (termType === 'HPOApi') {
            uri += formValues[fieldName].replace(':', '_');
            this.getRestData(uri).then(result => {
                let term = result['_embedded']['terms'][0];
                this.setState({
                    hpo: term
                });
            });
        }
    },

    render() {
        var submitErrClass = 'submit-err ' + (this.anyFormErrors() ? '' : ' hidden');

        return  <ModalComponent
            modalTitle="Add Evidence Details"
            modalClass="modal-default"
            modalWrapperClass="input-inline add-resource-id-modal"
            onRef={ref => (this.child = ref)}
            disabled={!this.props.ready}
            modalOpen={this.props.ready}
            modalWidthPct={90}
        >
        <div className="form-std">
            <div className="modal-body" style={{textAlign: 'left'}}>
                <h4>
                    Fields marked in a <span style={{backgroundColor: this.state.backgroundGreen}}>green background</span> are specifically relevant to this Criteria Code.
                </h4>
                <Form submitHandler={this.submitNewEvidence} formClassName="form-horizontal form-std">
                {this.inputs()}
                <div className="row">&nbsp;<br />&nbsp;</div>
                <div className='modal-footer'>
                <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                    <Input type="submit" inputClassName="btn-default btn-inline-spacer btn-primary" title="Submit" id="submit" />
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
