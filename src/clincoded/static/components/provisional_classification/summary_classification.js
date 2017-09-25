'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { RestMixin } from '../rest';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import * as CuratorHistory from '../curator_history';
import { queryKeyValue, editQueryValue, addQueryKey } from '../globals';
import * as curator from '../curator';

const GeneDiseaseSummaryClassification = module.exports.GeneDiseaseSummaryClassification = createReactClass({
    mixins: [FormMixin, RestMixin, CuratorHistory],

    propTypes: {
        gdm: PropTypes.object,
        provisional: PropTypes.object,
        user: PropTypes.string,
        totalScore: PropTypes.string,
        autoClassification: PropTypes.string,
        replicatedOverTime: PropTypes.bool,
        contradictingEvidence: PropTypes.object,
        editKey: PropTypes.string,
        calculateKey: PropTypes.string
    },

    getInitialState() {
        return {
            user: this.props.user, // login user uuid
            gdm: this.props.gdm, // current gdm object, must be null initially.
            provisional: this.props.provisional, // login user's existing provisional object, must be null initially.
            provisionalClassificationStatus: 'In progress',
            provisionalClassificationStatusChecked: false,
            alteredClassification: 'No Selection',
            reasons: '',
            evidenceSummary: ''
        };
    },

    componentDidMount() {
        if (Object.keys(this.state.provisional).length) {
            const provisional = this.state.provisional;
            this.setState({
                alteredClassification: provisional.alteredClassification,
                reasons: provisional.reasons,
                provisionalClassificationStatus: provisional.hasOwnProperty('provisionalClassificationStatus') ? provisional.provisionalClassificationStatus : 'In progress',
                provisionalClassificationStatusChecked: provisional.provisionalClassificationStatus !== 'In progress' ? true : false,
                evidenceSummary: provisional.hasOwnProperty('evidenceSummary') ? provisional.evidenceSummary : ''
            }, () => {
                this.refs['alteredClassification'].setValue(this.state.alteredClassification);
                this.refs['reasons'].setValue(this.state.reasons);
                this.refs['classification-evidence-summary'].setValue(this.state.evidenceSummary);
            });
        }
    },

    submitForm: function(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        // Save all form values from the DOM.
        this.saveAllFormValues();
        if (this.validateDefault()) {
            var newProvisional = this.state.provisional.uuid ? curator.flatten(this.state.provisional) : {};
            newProvisional.totalScore = Number(this.props.totalScore);
            newProvisional.autoClassification = this.props.autoClassification;
            newProvisional.alteredClassification = this.state.alteredClassification;
            newProvisional.reasons = this.state.reasons;
            newProvisional.replicatedOverTime = this.props.replicatedOverTime;
            newProvisional.contradictingEvidence = this.props.contradictingEvidence;
            newProvisional.provisionalClassificationStatus = this.state.provisionalClassificationStatus;
            newProvisional.evidenceSummary = this.state.evidenceSummary;

            // check required item (reasons)
            var formErr = false;
            if (!newProvisional.reasons && newProvisional.alteredClassification !== 'No Selection') {
                formErr = true;
                this.setFormErrors('reasons', 'Required when changing classification.');
            }
            if (!formErr) {
                if (this.state.provisional.uuid) { // edit existing provisional
                    this.putRestData('/provisional/' + this.state.provisional.uuid, newProvisional).then(data => {
                        var provisionalClassification = data['@graph'][0];

                        // Record provisional classification history
                        var meta = {
                            provisionalClassification: {
                                gdm: this.state.gdm['@id'],
                                alteredClassification: provisionalClassification.alteredClassification
                            }
                        };
                        this.recordHistory('modify', provisionalClassification, meta);

                        /*
                        this.setState({provisionalClassificationSaved: true}, () => {
                            this.props.updateGdmObj();
                            if (queryKeyValue('edit', this.props.href)) {
                                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'edit', 'false'));
                            } else {
                                window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'edit', 'false'));
                            }
                            if (queryKeyValue('calculate', this.props.href)) {
                                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'calculate', null));
                            }
                        });
                        */
                        window.location.replace('/provisional-classification/?gdm=' + this.state.gdm.uuid);
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = : %o', e);
                    });
                } else { // save a new calculation and provisional classification
                    this.postRestData('/provisional/', newProvisional).then(data => {
                        return data['@graph'][0];
                    }).then(savedProvisional => {
                        // Record provisional classification history
                        var meta = {
                            provisionalClassification: {
                                gdm: this.state.gdm['@id'],
                                alteredClassification: savedProvisional.alteredClassification
                            }
                        };
                        this.recordHistory('add', savedProvisional, meta);

                        var theGdm = curator.flatten(this.state.gdm);
                        if (theGdm.provisionalClassifications) {
                            theGdm.provisionalClassifications.push(savedProvisional['@id']);
                        }
                        else {
                            theGdm.provisionalClassifications = [savedProvisional['@id']];
                        }

                        return this.putRestData('/gdm/' + this.state.gdm.uuid, theGdm).then(data => {
                            return data['@graph'][0];
                        });
                    }).then(savedGdm => {
                        /*
                        this.setState({provisionalClassificationSaved: true}, () => {
                            this.props.updateGdmObj();
                            if (queryKeyValue('edit', this.props.href)) {
                                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'edit', 'false'));
                            } else {
                                window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'edit', 'false'));
                            }
                            if (queryKeyValue('calculate', this.props.href)) {
                                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'calculate', null));
                            }
                        });
                        */
                        window.location.replace('/provisional-classification/?gdm=' + this.state.gdm.uuid);
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = %o', e);
                    });
                }
            }
        }
    },

    cancelForm(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        window.history.go(-1);
    },

    editForm(e) {
        // window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'edit', 'true'));
        window.location.replace('/provisional-classification/?gdm=' + this.state.gdm.uuid + '&edit=true');
    },

    viewEvidenceSummary(e) {
        window.open('/gene-disease-evidence-summary/?gdm=' + this.state.gdm.uuid, '_blank');
    },

    handleChange(ref, e) {
        if (ref === 'alteredClassification') {
            this.setState({alteredClassification: this.refs[ref].getValue()});
        } else if (ref === 'reasons') {
            this.setState({reasons: this.refs[ref].getValue()});
        } else if (ref === 'classification-evidence-summary') {
            this.setState({evidenceSummary: this.refs[ref].getValue()});
        } else if (ref === 'classification-status') {
            this.setState({provisionalClassificationStatusChecked: !this.state.provisionalClassificationStatusChecked}, () => {
                if (this.state.provisionalClassificationStatusChecked) {
                    this.setState({provisionalClassificationStatus: 'Provisional'});
                } else {
                    this.setState({provisionalClassificationStatus: 'In progress'});
                }
            });
        }
    },

    render() {
        let gdm = this.state.gdm ? this.state.gdm : null;
        let autoClassification = this.props.autoClassification;
        let edit = this.props.editKey && this.props.editKey === 'true' ? true : false;
        let calculate = this.props.calculateKey && this.props.calculateKey === 'yes' ? true : false;
        // set the 'Current Classification' appropriately only if previous provisional exists
        let provisional = this.state.provisional;
        let currentClassification = 'None';
        if (provisional.last_modified) {
            if (provisional.alteredClassification && provisional.alteredClassification !== 'No Selection') {
                currentClassification = provisional.alteredClassification;
            } else {
                currentClassification = provisional.autoClassification ? provisional.autoClassification : this.props.autoClassification;
            }
        }

        return (
            <Form formClassName="form-horizontal form-std">
                <div className="provisional-classification-wrapper">
                    <table className="summary-matrix">
                        <tbody>
                            <tr>
                                <td colSpan="5">
                                    <div className="col-md-12 classification-form-content-wrapper">
                                        <div className="col-xs-12 col-sm-6">
                                            <div className="altered-classfication">
                                                <Input type="select" ref="alteredClassification"
                                                    label={<strong>Modify <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</strong>}
                                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group"
                                                    defaultValue={this.state.alteredClassification} handleChange={this.handleChange} inputDisabled={edit || calculate ? false : true}>
                                                    <option value="No Selection">No Selection</option>
                                                    {autoClassification === 'Definitive' ? null : <option value="Definitive">Definitive</option>}
                                                    {autoClassification === 'Strong' ? null : <option value="Strong">Strong</option>}
                                                    {autoClassification === 'Moderate' ? null : <option value="Moderate">Moderate</option>}
                                                    {autoClassification === 'Limited' ? null : <option value="Limited">Limited</option>}
                                                    <option value="Disputed">Disputed</option>
                                                    <option value="Refuted">Refuted</option>
                                                    <option value="No Reported Evidence">No Reported Evidence (calculated score is based on Experimental evidence only)</option>
                                                </Input>
                                            </div>
                                            <div className="altered-classification-reasons">
                                                <Input type="textarea" ref="reasons" rows="5" label="Explain Reason(s) for Change" labelClassName="col-sm-5 control-label"
                                                    wrapperClassName="col-sm-7" groupClassName="form-group" error={this.getFormError('reasons')} value={this.state.reasons}
                                                    clearError={this.clrFormErrors.bind(null, 'reasons')} handleChange={this.handleChange} inputDisabled={edit || calculate ? false : true} />
                                            </div>
                                        </div>
                                        <div className="col-xs-12 col-sm-6">
                                            <div className="classification-status">
                                                <span>Mark status as "Provisional Classification" <i>(optional)</i>:</span>
                                                <Input type="checkbox" ref="classification-status" checked={this.state.provisionalClassificationStatusChecked} handleChange={this.handleChange}
                                                    labelClassName="col-sm-6 control-label" wrapperClassName="col-sm-1" groupClassName="form-group" inputDisabled={edit || calculate ? false : true} />
                                            </div>
                                            <div className="classification-evidence-summary">
                                                <Input type="textarea" ref="classification-evidence-summary" label="Evidence Summary:"
                                                    value={this.state.evidenceSummary} handleChange={this.handleChange} inputDisabled={edit || calculate ? false : true}
                                                    placeholder="Summary of the evidence and rationale for the clinical validity classification (optional)." rows="5"
                                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                {(this.props.editKey && this.props.editKey === 'true') || (this.props.calculateKey && this.props.calculateKey === 'yes') ?
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                        <Input type="button" inputClassName={(currentClassification && currentClassification !== 'None' ? "btn-info" : "btn-primary") + " btn-inline-spacer pull-right submit"}
                            clickHandler={this.submitForm} title={currentClassification && currentClassification !== 'None' ? 'Update' : 'Save'} />
                    </div>
                    :
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.editForm} title="Edit" />
                        <Input type="button" inputClassName="btn-primary btn-inline-spacer pull-right" clickHandler={this.viewEvidenceSummary} title="View Evidence Summary" />
                    </div>
                }
            </Form>
        );
    }
});