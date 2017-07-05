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

var fetched = require('./fetched');

var AddCurator = createReactClass({
    mixins: [FormMixin, RestMixin],

    getInitialState: function() {
        return {
            errorMsg: '', // Error message to display 
            submitBusy: false // REST operation in progress
        };
    },

    // Form content validation
    validateForm: function() {
        // Start with default validation
        var valid = this.validateDefault();

        return valid;
    },

    // Called 
    handleChange: function(e) {
        this.setState({errorMsg: ''});
    },

    // When the form is submitted...
    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            // Get the free-text values for the Orphanet ID and the Gene ID to check against the DB
            var firstName = this.getFormValue('first_name');
            var lastName = this.getFormValue('last_name');
            var curatorEmail = this.getFormValue('curator_email');

            // First see if there's a matching record, and give an error if there is.

            // Get the disease and gene objects corresponding to the given Orphanet and Gene IDs in parallel.
            // If either error out, set the form error fields
            this.getRestData(
                '/users/?email=' + curatorEmail + '&first_name=' + firstName + '&last_name=' + lastName
            ).then(data => {
                if (data.total === 0) {
                    // No matching record; make a new user
                    var newUser = {
                        email: curatorEmail,
                        first_name: firstName,
                        last_name: lastName,
                        groups: ["curator"],
                        job_title: "ClinGen Curator",
                        lab: '/labs/curator/',
                        submits_for: ['/labs/curator/'],
                        timezone: 'US/Pacific'
                    };
                    return this.postRestData('/users/', newUser).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                } else {
                    // Found matching record; don't allow
                    throw {statusText: 'A matching curator exists'};
                }
            }).then(newUser => {
                this.setState({
                    submitBusy: false,
                    errorMsg: 'Curator ' + curatorEmail + ' successfully added'
                });
            }).catch(e => {
                if (!e.statusText) {
                    e.statusText = 'An unexpected error occurred.';
                } else if (e.statusText === 'Conflict') {
                    e.statusText = 'A curator with the same email exists';
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
                    <Panel panelClassName="panel-create-gene-disease">
                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                            <div className="row">
                                <Input type="text" ref="first_name" label="First Name" handleChange={this.handleChange}
                                    error={this.getFormError('first_name')} clearError={this.clrFormErrors.bind(null, 'first_name')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <Input type="text" ref="last_name" label="Last Name" handleChange={this.handleChange}
                                    error={this.getFormError('last_name')} clearError={this.clrFormErrors.bind(null, 'last_name')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
                                <Input type="email" ref="curator_email" label="Email Address" handleChange={this.handleChange}
                                    error={this.getFormError('curator_email')} clearError={this.clrFormErrors.bind(null, 'curator_email')}
                                    labelClassName="col-sm-4 control-label" wrapperClassName="col-sm-8" groupClassName="form-group" required />
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

curator_page.register(AddCurator, 'curator_page', 'add-curator');
