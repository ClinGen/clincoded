'use strict';
import React, { Component } from 'react';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { RestMixin } from './rest';
import { curator_page } from './globals';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { Panel } from '../libs/bootstrap/panel';
import { parseAndLogError } from './mixins';

var AddDisease = createReactClass({
    mixins: [FormMixin, RestMixin],

    getInitialState: function() {
        return {
            errorMsg: '', // Error message to display 
            submitBusy: false, // REST operation in progress
            diseaseUuid: '',
            diseaseId: '',
            diseaseTerm: ''
        };
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        return valid;
    },

    // Called 
    handleChange: function(ref, e) {
        this.setState({errorMsg: ''});

        if (ref === 'disease_uuid') {
            this.setState({diseaseUuid: this.refs[ref].getValue()});
        }
        if (ref === 'disease_id') {
            this.setState({diseaseId: this.refs[ref].getValue()});
        }
        if (ref === 'disease_term') {
            this.setState({diseaseTerm: this.refs[ref].getValue()});
        }
        
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            // Get the free-text values for the Orphanet ID and the Gene ID to check against the DB
            let uuid = this.getFormValue('disease_uuid');
            let diseaseId = this.getFormValue('disease_id');
            let term = this.getFormValue('disease_term');
            let description = this.getFormValue('disease_description');
            let ontology = diseaseId.substr(0, diseaseId.indexOf('_')).toUpperCase();
            let synonyms = [];
            synonyms = this.getFormValue('disease_synonyms') && this.getFormValue('disease_synonyms').length ? this.getFormValue('disease_synonyms').split(', ') : [];

            // First see if there's a matching record, and give an error if there is.

            // Get the disease and gene objects corresponding to the given Orphanet and Gene IDs in parallel.
            // If either error out, set the form error fields
            this.getRestData(
                '/diseases/?uuid=' + uuid + '&diseaseId=' + diseaseId
            ).then(data => {
                if (data.total === 0) {
                    // No matching record; make a new user
                    let newDisease = {
                        "uuid": uuid,
                        "diseaseId": diseaseId,
                        "term": term,
                        "description": description && description.length ? description : '',
                        "ontology": ontology,
                        "synonyms": synonyms
                    };
                    return this.postRestData('/diseases/', newDisease).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                } else {
                    // Found matching record; don't allow
                    throw {statusText: 'A matching disease already exists'};
                }
            }).then(newUser => {
                this.setState({
                    submitBusy: false,
                    errorMsg: 'Disease ' + diseaseId + ' successfully added'
                });
            }).catch(e => {
                if (!e.statusText) {
                    e.statusText = 'An unexpected error occurred.';
                } else if (e.statusText === 'Conflict') {
                    e.statusText = 'A disease with the same id exists';
                }
                this.setState({
                    submitBusy: false,
                    errorMsg: e.statusText
                });
            });
        }
    },

    render: function() {
        var submitErrClass = 'submit-err pull-right' + (this.state.errorMsg ? '' : ' hidden');

        return (
            <div className="container">
                <h1>{this.props.context.title}</h1>
                <div className="col-md-8 col-md-offset-2 col-sm-9 col-sm-offset-1 form-create-gene-disease">
                    <Panel panelClassName="panel-add-disease">
                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                            <div className="row">
                                <Input type="text" ref="disease_uuid" label="UUID" handleChange={this.handleChange} value={this.state.diseaseUuid}
                                    error={this.getFormError('disease_uuid')} clearError={this.clrFormErrors.bind(null, 'disease_uuid')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <Input type="text" ref="disease_id" label="MonDO Clique Leader ID" handleChange={this.handleChange} value={this.state.diseaseId}
                                    error={this.getFormError('disease_id')} clearError={this.clrFormErrors.bind(null, 'disease_id')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <Input type="text" ref="disease_term" label="Disease Term" handleChange={this.handleChange} value={this.state.diseaseTerm}
                                    error={this.getFormError('disease_term')} clearError={this.clrFormErrors.bind(null, 'disease_term')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <Input type="textarea" ref="disease_description" label="Disease Definition" handleChange={this.handleChange}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" />
                                <Input type="textarea" ref="disease_synonyms" label="Disease Synonyms" handleChange={this.handleChange}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" />
                                <div className="curation-submit clearfix">
                                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                    <div className={submitErrClass}>{this.state.errorMsg}</div>
                                </div>
                            </div>
                        </Form>
                    </Panel>
                </div>
            </div>
        );
    }
});

curator_page.register(AddDisease, 'curator_page', 'add-disease');
