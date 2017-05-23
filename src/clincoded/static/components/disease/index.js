"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import ModalComponent from '../../libs/bootstrap/modal';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { RestMixin } from '../rest';
import { external_url_map } from '../globals';

var curator = require('../curator');
var _ = require('underscore');

/**
 * Input component to display a text input field with a button to the right,
 * which can be clicked to invoke a modal.
 * This is referred to as an "input-group" in Bootstrap.
 * Usage: <AddDisease {...props} />
 * See 'AddDisease.propTypes' for props details.
 */
const AddDisease = module.exports.AddDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: PropTypes.object, // For editing disease (passed to Modal)
        updateDiseaseObj: PropTypes.func,
        error: PropTypes.string,
        session: PropTypes.object
    },

    getInitialState() {
        return {
            gdm: this.props.gdm,
            error: this.props.error,
            diseaseId: '',
            diseaseTerm: null,
            diseaseOntology: null,
            diseaseDescription: null,
            synonyms: [],
            phenotypes: [],
            diseaseFreeTextConfirm: false,
            diseaseObj: {}
        };
    },

    componentDidMount() {
        let gdm = this.state.gdm;
        if (gdm && gdm.disease) {
            let disease = gdm.disease;
            if (disease.id) { this.setState({diseaseId: disease.id}) };
            if (disease.term) { this.setState({diseaseTerm: disease.term}) };
            if (disease.ontology) { this.setState({diseaseOntology: disease.ontology}) };
            if (disease.description) { this.setState({diseaseDescription: disease.description}) };
            if (disease.synonyms) { this.setState({synonyms: disease.synonyms}) };
            if (disease.phenotypes) { this.setState({phenotypes: disease.phenotypes}) };
            if (disease.freetext) { this.setState({diseaseFreeTextConfirm: disease.freetext}) };
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.gdm) {
            this.setState({gdm: nextProps.gdm}, () => {
                let gdm = this.state.gdm;
                if (gdm && gdm.disease) {
                    let disease = gdm.disease;
                    if (disease.id) { this.setState({diseaseId: disease.id}) };
                    if (disease.term) { this.setState({diseaseTerm: disease.term}) };
                    if (disease.ontology) { this.setState({diseaseOntology: disease.ontology}) };
                    if (disease.description) { this.setState({diseaseDescription: disease.description}) };
                    if (disease.synonyms) { this.setState({synonyms: disease.synonyms}) };
                    if (disease.phenotypes) { this.setState({phenotypes: disease.phenotypes}) };
                    if (disease.freetext) { this.setState({diseaseFreeTextConfirm: disease.freetext}) };
                }
            });
        }
        if (nextProps.error) {
            this.setState({gdm: nextProps.error});
        }
    },

    passDataToParent(id, term, ontology, description, synonyms, phenotypes, freetext) {
        let diseaseObj = this.state.diseaseObj;
        if (id) {
            /**
             * Changing colon to underscore in id string for database
             */
            diseaseObj['id'] = id.replace(':', '_');
            this.setState({diseaseId: id});
        }
        if (term) {
            diseaseObj['term'] = term;
            this.setState({diseaseTerm: term});
        }
        if (ontology) {
            diseaseObj['ontology'] = ontology;
            this.setState({diseaseOntology: ontology});
        }
        if (description) {
            diseaseObj['description'] = description;
            this.setState({diseaseDescription: description});
        } else {
            if (diseaseObj['description']) { delete diseaseObj['description'] };
            this.setState({diseaseDescription: null});
        }
         if (synonyms) {
            diseaseObj['synonyms'] = synonyms;
            this.setState({synonyms: synonyms});
        } else {
            if (diseaseObj['synonyms']) { delete diseaseObj['synonyms'] };
            this.setState({synonyms: []});
        }
        if (phenotypes) {
            diseaseObj['phenotypes'] = phenotypes;
            this.setState({phenotypes: phenotypes});
        } else {
            if (diseaseObj['phenotypes']) { delete diseaseObj['phenotypes'] };
            this.setState({phenotypes: []});
        }
        if (freetext) {
            diseaseObj['freetext'] = true;
            this.setState({diseaseFreeTextConfirm: true});
        } else {
            if (diseaseObj['freetext']) { delete diseaseObj['freetext'] };
            this.setState({diseaseFreeTextConfirm: false});
        }
        this.setState({diseaseObj: diseaseObj}, () => {
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
        });
    },

    renderDiseaseData(id, term, desc, hpo, freetext) {
        let source = !freetext ? id : this.props.session.user_properties.title;
        if (term && term.length) {
            return (
                <span>
                    <span className="data-view disease-name">{term + ' (' + source + ')'}</span>
                    {desc && desc.length ? <span className="data-view disease-desc">{desc}</span> : null}
                    {hpo && hpo.length ? <span className="data-view disease-phenotypes">{hpo.join(', ')}</span> : null}
                </span>
            );
        }
    },

    render() {
        let diseaseId = this.state.diseaseId;
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseOntology = this.state.diseaseOntology;
        let diseaseDescription = this.state.diseaseDescription;
        let diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm;
        let phenotypes = this.state.phenotypes;
        let synonyms = this.state.synonyms;
        let addDiseaseModalBtn = diseaseTerm ? <span>Disease<i className="icon icon-pencil"></i></span> : <span>Disease<i className="icon icon-plus-circle"></i></span>;
        let error = this.state.error;
        let inputLabel = diseaseFreeTextConfirm ? <span>Non-ID term:</span> : <span>Select disease:</span>;

        return (
            <div className="form-group add-disease-group">
                <label htmlFor="add-disease" className="col-sm-5 control-label">
                    <span>{inputLabel}<span className="required-field"> *</span><span className="control-label-note">Search <a href={external_url_map['Mondo']} target="_blank">MonDO</a></span></span>
                </label>
                <div className="col-sm-7 add-disease inline-button-wrapper clearfix" id="add-disease">
                    <div ref="diseaseName" className={diseaseTerm ? "disease-name col-sm-8" : "disease-name"}>
                        {error ?
                            <span className="form-error">{error}</span>
                            :
                            <span>
                                {this.renderDiseaseData(diseaseId, diseaseTerm, diseaseDescription, phenotypes, diseaseFreeTextConfirm)}
                            </span>
                        }
                    </div>
                    <AddDiseaseModal
                        addDiseaseModalBtn={addDiseaseModalBtn}
                        diseaseId={diseaseId}
                        diseaseTerm={diseaseTerm}
                        diseaseOntology={diseaseOntology}
                        diseaseDescription={diseaseDescription}
                        diseaseFreeTextConfirm={diseaseFreeTextConfirm}
                        phenotypes={phenotypes}
                        synonyms={synonyms}
                        passDataToParent={this.passDataToParent}
                        addDiseaseModalBtnLayoutClass={diseaseTerm || error ? ' pull-right' : ''}
                    />
                </div>
            </div>
        );
    }
});

/**
 * Modal dialog box for adding disease (either by ID or free text)
 */
const AddDiseaseModal = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        addDiseaseModalBtn: PropTypes.object.isRequired,
        diseaseId: PropTypes.string,
        diseaseTerm: PropTypes.string,
        diseaseOntology: PropTypes.string,
        diseaseDescription: PropTypes.string,
        diseaseFreeTextConfirm: PropTypes.bool,
        phenotypes: PropTypes.array,
        synonyms: PropTypes.array,
        passDataToParent: PropTypes.func, // function to call upon pressing the Save button
        addDiseaseModalBtnLayoutClass: PropTypes.string
    },

    getInitialState() {
        return {
            diseaseId: this.props.diseaseId, // Value for disease id input field (types of 'text' or 'textarea')
            diseaseTerm: this.props.diseaseTerm, // Name of the disease
            diseaseOntology: this.props.diseaseOntology, // Orphanet, DOID, OMIM, NCIt, etc.
            diseaseDescription: this.props.diseaseDescription, // Description/definition of the disease
            phenotypes: this.props.phenotypes, // HPO IDs
            synonyms: this.props.synonyms, // Disease synonyms
            diseaseFreeTextConfirm: this.props.diseaseFreeTextConfirm, // User confirmation of entering free text for disease
            queryResourceDisabled: true, // Flag to disable the get OLS data button
            queryResourceBusy: false, // Flag to indicate the input button's 'busy' state
            resourceFetched: false, // Flag to indicate that a response from the resource has been obtained
            tempResource: {}, // Temporary object to hold the resource response
            submitResourceDisabled: true, // Flag to disable the modal save button
            submitResourceBusy: false // Flag to indicate that the modal's submit button is in a 'busy' state (creating local db entry)
        };
    },

    componentDidMount() {
        if (this.state.diseaseId && this.refs['diseaseId']) {
            this.refs['diseaseId'].setValue(this.state.diseaseId);
            this.setState({submitResourceDisabled: false});
        }
        if (this.state.diseaseTerm && this.refs['diseaseTerm']) {
            this.refs['diseaseTerm'].setValue(this.state.diseaseTerm);
            this.setState({submitResourceDisabled: false});
        }
        if (this.state.diseaseTerm && this.refs['diseaseId']) {
            this.renderResourceResult();
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.diseaseId) {
            this.setState({diseaseId: nextProps.diseaseId, submitResourceDisabled: false});
        }
        if (nextProps.diseaseTerm) {
            this.setState({diseaseTerm: nextProps.diseaseTerm, submitResourceDisabled: false});
        }
        if (nextProps.diseaseOntology) {
            this.setState({diseaseOntology: nextProps.diseaseOntology});
        }
        if (nextProps.diseaseDescription) {
            this.setState({diseaseDescription: nextProps.diseaseDescription});
        }
        if (nextProps.diseaseFreeTextConfirm) {
            this.setState({diseaseFreeTextConfirm: nextProps.diseaseFreeTextConfirm});
        }
        if (nextProps.phenotypes) {
            this.setState({phenotypes: nextProps.phenotypes});
        }
        if (nextProps.synonyms) {
            this.setState({synonyms: nextProps.synonyms});
        }
    },

    // Called when the modal form's cancel button is clicked. Just closes the modal like
    // nothing happened.
    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        this.handleModalClose('cancel');
    },

    /************************************************************************************************/
    /* Resetting the formErrors for selected input and other states was not needed previously       */
    /* because the previous MixIn implementation allowed the actuator (button to show the modal)    */
    /* to be defined outside of this component and closing the modal would delete this component    */
    /* from virtual DOM, along with the states.                                                     */
    /* The updated/converted implementation (without MixIn) wraps the actuator in the modal         */
    /* component and thus this component always exists in the virtual DOM as long as the actuator   */
    /* needs to be rendered in the UI. As a result, closing the modal does not remove the component */
    /* and the modified states are retained.                                                        */
    /* The MixIn function this.props.closeModal() has been replaced by this.child.closeModal(),     */
    /* which is way to call a function defined in the child component from the parent component.    */
    /* The reference example is at: https://jsfiddle.net/frenzzy/z9c46qtv/                          */
    /************************************************************************************************/
    handleModalClose(trigger) {
        let errors = this.state.formErrors;
        errors['diseaseId'] = '';
        errors['diseaseTerm'] = '';
        if (!this.state.submitResourceBusy) {
            if (trigger && trigger === 'cancel') {
                this.setState({
                    formErrors: errors,
                    diseaseId: this.props.diseaseId,
                    diseaseTerm: this.props.diseaseTerm,
                    diseaseFreeTextConfirm: this.props.diseaseFreeTextConfirm,
                    queryResourceDisabled: true,
                    resourceFetched: false,
                    tempResource: {}
                });
            }
            this.child.closeModal();
        }
    },

    // Called when the value in the disease id input field is changed
    handleDiseaseIdChange(e) {
        if (this.refs['diseaseId']) {
            let tempResourceId = this.refs['diseaseId'].getValue();
            this.setState({diseaseId: tempResourceId, resourceFetched: false, tempResource: {}});
            if (tempResourceId.length > 0) {
                this.setState({queryResourceDisabled: false});
            } else {
                this.setState({queryResourceDisabled: true});
            }
        }
    },

    // Called to select/deselect free text disease confirmation checkbox
    handleDiseaseFreeTextConfirmChange(e) {
        this.setState({
            diseaseFreeTextConfirm: !this.state.diseaseFreeTextConfirm,
            diseaseId: '',
            diseaseTerm: null,
            diseaseOntology: null,
            diseaseDescription: null,
            phenotypes: [],
            synonyms: [],
            formErrors: {},
            resourceFetched: false,
            tempResource: {}
        }, () => {
            if (this.refs['diseaseId'] && this.refs['diseaseId'].getValue()) {
                this.refs['diseaseId'].resetValue();
            }
            if (this.refs['diseaseFreeTextTerm'] && this.refs['diseaseFreeTextTerm'].getValue()) {
                this.refs['diseaseFreeTextTerm'].resetValue();
            }
        });
    },

    // Called when the value in the disease free text input field is changed
    handleDiseaseFreeTextTermChange(e) {
        if (this.refs['diseaseFreeTextTerm']) {
            let diseaseFreeTextTerm = this.refs['diseaseFreeTextTerm'].getValue();
            this.setState({diseaseTerm: diseaseFreeTextTerm && diseaseFreeTextTerm.length ? diseaseFreeTextTerm : ''}, () => {
                if (this.state.diseaseTerm.length > 0) {
                    this.setState({submitResourceDisabled: false});
                } else {
                    this.setState({SubmitResourceDisabled: true});
                }
            });
        }
    },

    // Invoked when the 'Retrieve...' button is pressed in the modal
    queryResource(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({queryResourceBusy: true, resourceFetched: false}, () => {
            queryResourceById.call(this, this.state.diseaseId);
        });
    },

    // Called when the button to save the disease term (ID or free text) to the main form is pressed
    submitResource(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        if (this.state.diseaseFreeTextConfirm) {
            if (this.refs['diseaseFreeTextTerm'] && !this.refs['diseaseFreeTextTerm'].getValue()) {
                this.setFormErrors('diseaseFreeTextTerm', 'Required for free text disease');
                return;
            }
            if (this.refs['diseaseFreeTextPhenoTypes'] && this.refs['diseaseFreeTextPhenoTypes'].getValue()) {
                let hpoids = curator.capture.hpoids(this.getFormValue('diseaseFreeTextPhenoTypes'));
                let formError = false;
                // Check HPO ID format
                if (hpoids && hpoids.length && _(hpoids).any(id => { return id === null; })) {
                    // HPOID list is bad
                    formError = true;
                    this.setFormErrors('diseaseFreeTextPhenoTypes', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                    return;
                }
            }
            this.setState({
                diseaseDescription: this.refs['diseaseFreeTextDesc'] && this.refs['diseaseFreeTextDesc'].getValue() ? this.refs['diseaseFreeTextDesc'].getValue() : null,
                phenotypes: this.refs['diseaseFreeTextPhenoTypes'] && this.refs['diseaseFreeTextPhenoTypes'].getValue() ? this.refs['diseaseFreeTextPhenoTypes'].getValue().split(', ') : []
            }, () => {
                this.props.passDataToParent(
                    'FREETEXT:' + getRandomInt(10000000, 99999999), // Set free text disease id
                    this.state.diseaseTerm,
                    null, // No ontology for free text
                    this.state.diseaseDescription,
                    [], // No synonyms for free text
                    this.state.phenotypes,
                    this.state.diseaseFreeTextConfirm
                );
            });
        } else {
            let diseaseId = this.state.diseaseId;
            this.setState({
                diseaseTerm: this.state.tempResource['label'] ? this.state.tempResource['label'] : null,
                diseaseOntology: diseaseId ? diseaseId.substr(0, diseaseId.indexOf(':')).toUpperCase() : null,
                diseaseDescription: this.state.tempResource['annotation']['definition'] ? this.state.tempResource['annotation']['definition'][0] : null,
                synonyms: this.state.tempResource['annotation']['has_exact_synonym'] ? this.state.tempResource['annotation']['has_exact_synonym'] : []
            }, () => {
                this.props.passDataToParent(
                    this.state.diseaseId,
                    this.state.diseaseTerm,
                    this.state.diseaseOntology,
                    this.state.diseaseDescription,
                    this.state.synonyms,
                    null, // No phenotypes (applicable to free text only)
                    false // Free text confirmation not selected
                );
            });
        }
        this.handleModalClose();
    },

    // Method to render JSX when a disease term result is returned
    renderResourceResult(id) {
        return(
            <div className="resource-metadata">
                <p>Below are the data from OLS for the ID you submitted. Select "Save" below if it is the correct disease, otherwise revise your search above:</p>
                <div className="panel panel-default">
                    <span className="p-break disease-label"><a href={external_url_map['MondoSearch'] + id.replace(':', "_")} target="_blank">{this.state.tempResource['label']}</a></span>
                    {this.state.tempResource['annotation']['definition'] ?
                        <span className="p-break disease-description">{this.state.tempResource['annotation']['definition']}</span>
                    : null}
                </div>
            </div>
        );
    },

    renderDiseaseIdInput() {
        return (
            <div className="form-group disease-id-input clearfix">
                <Input type="text" ref="diseaseId" handleChange={this.handleDiseaseIdChange} value={this.state.diseaseId}
                    label={<span>Enter the term "id" <span className="label-note">(Term "id" can be found in the "Term info" box displayed on the right hand side on the term page of the OLS)</span>:</span>}
                    error={this.getFormError("diseaseId")} clearError={this.clrFormErrors.bind(null, "diseaseId")}
                    labelClassName="col-sm-12 control-label" wrapperClassName="col-sm-12" groupClassName="form-group resource-input clearfix"
                    placeholder="e.g. OMIM:100800, DOID:0050776" required />
                <Input type="button-button" title="Retrieve from OLS" 
                    inputClassName={(this.state.queryResourceDisabled ? "btn-default" : "btn-primary") + " pull-right btn-query-ols"} 
                    clickHandler={this.queryResource} submitBusy={this.state.queryResourceBusy} inputDisabled={this.state.queryResourceDisabled}/>
                <div className="row">&nbsp;<br />&nbsp;</div>
                {this.state.resourceFetched ?
                    this.renderResourceResult(this.state.diseaseId)
                :
                <div className="disease-freetext-confirm-input-group clearfix">
                    <p>Note: We strongly encourage use of a MonDO ontology term and therefore specific database identifier for a disease. If you have searchedand
                        there is no appropriate database identifier you may contact us at <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> and/or
                        create a term using free text.</p>
                    <div className="panel panel-default">
                        <Input type="checkbox" ref="diseaseFreeTextConfirmation" label="Select this checkbox to find free text option:"
                            labelClassName="col-sm-7 control-label" wrapperClassName="col-sm-5" groupClassName="form-group resource-input disease-freetext-confirm clearfix"
                            checked={this.state.diseaseFreeTextConfirm} defaultChecked="false" handleChange={this.handleDiseaseFreeTextConfirmChange} />
                    </div>
                </div>
                }
            </div>
        );
    },

    renderDiseaseFreeTextInput() {
        let phenotypes = this.state.phenotypes, hpoids;
        if (phenotypes.length) {
            hpoids = phenotypes.join(', ');
        } else {
            hpoids = ''
        }

        return (
            <div className="form-group disease-freetext-input clearfix">
                <Input type="text" ref="diseaseFreeTextTerm" label="Rich text disease name:" handleChange={this.handleDiseaseFreeTextTermChange}
                    error={this.getFormError("diseaseFreeTextTerm")} clearError={this.clrFormErrors.bind(null, "diseaseFreeTextTerm")}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-name clearfix"
                    value={this.state.diseaseTerm ? this.state.diseaseTerm : ''} maxLength="200" required />
                <Input type="textarea" ref="diseaseFreeTextDesc" label="Disease description:" handleChange={this.handleDiseaseFreeTextDescChange}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-desc clearfix"
                    value={this.state.diseaseDescription ? this.state.diseaseDescription : ''} rows="2" />
                <Input type="textarea" ref="diseaseFreeTextPhenoTypes" label="Phenotype(s) (HPO ID(s)):" value={hpoids} placeholder="e.g. HP:0010704, HP:0030300"
                    error={this.getFormError('diseaseFreeTextPhenoTypes')} clearError={this.clrFormErrors.bind(null, 'diseaseFreeTextPhenoTypes')} rows="1"
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-phenotypes clearfix" />
            </div>
        );
    },

    render() {
        let diseaseId = this.state.diseaseId;
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm;

        return (
            <ModalComponent modalTitle="Add Disease" modalClass="modal-default" modalWrapperClass={"add-disease-modal" + this.props.addDiseaseModalBtnLayoutClass}
                bootstrapBtnClass="btn btn-primary " actuatorClass="input-group-btn-disease-term" actuatorTitle={this.props.addDiseaseModalBtn} onRef={ref => (this.child = ref)}>
                <div className="form-std">
                    <div className="modal-body">
                        <div className="row">
                            <div className="ontology-lookup-note">
                                <p>Search <a href={external_url_map['Mondo']} target="_blank">MonDO</a> using the <a href={external_url_map['OLS']} target="_blank">OLS</a> (Ontology Lookup Service).</p>
                            </div>
                            {!diseaseFreeTextConfirm ? this.renderDiseaseIdInput() : null}
                            {diseaseFreeTextConfirm ? this.renderDiseaseFreeTextInput() : null}
                        </div>
                    </div>
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                        <Input
                            type="button-button"
                            title="Save"
                            clickHandler={this.submitResource}
                            inputDisabled={this.state.submitResourceDisabled}
                            submitBusy={this.state.submitResourceBusy}
                            inputClassName={this.getFormError(diseaseId) === null || this.getFormError(diseaseId) === undefined || this.getFormError(diseaseId) === '' ?
                            "btn-primary btn-inline-spacer" : "btn-primary btn-inline-spacer disabled"}
                        />
                    </div>
                </div>
            </ModalComponent>
        );
    }
});

/**
 * Method to validate user-entered input value to satisfy 2 criteria:
 * 1) numeric values only
 * 2) empty string not allowed
 */
function validateDiseaseIdInput(id) {
    // validating the field for user-entered disease id
    let valid = this.validateDefault();

    if (valid) {
        if (id && id.length) {
            // Expect a semicolon (':') in the id and it is not at the start of the id string
            // Such as 'DOID:7081' or 'Orphanet:777'
            if (id.indexOf(':') < 1) {
                valid = false;
                this.setFormErrors('diseaseId', 'Please enter a valid ID');
            }
        } else {
            valid = false;
            this.setFormErrors('diseaseId', 'Please enter a valid ID');
        }
    }

    return valid;
}

/**
 * Method to make OLS REST API call given the user-selected ID type
 */
function queryResourceById(id) {
    this.saveFormValue('diseaseId', id);
    if (validateDiseaseIdInput.call(this, id)) {
        // Make the OLS REST API call
        return this.getRestData(external_url_map['MondoApi'] + id.replace(':', '_')).then(response => {
            let termLabel = response['_embedded']['terms'][0]['label'];
            let termIri = response['_embedded']['terms'][0]['iri'];
            if (termLabel && termIri) {
                // Disease ID is found at OLS
                this.setState({
                    queryResourceBusy: false,
                    submitResourceDisabled: false,
                    tempResource: response['_embedded']['terms'][0],
                    resourceFetched: true
                });
            } else {
                // Disease ID not found at OLS
                this.setFormErrors('diseaseId', 'Requested ID not found at OLS.');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        }).catch(err => {
            // error handling for disease query
            this.setFormErrors('diseaseId', 'Unable to retrieve data from OLS.');
            this.setState({queryResourceBusy: false, resourceFetched: false});
            console.warn('OLS terminology fetch error :: %o', err);
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}

/**
 * Method to randomly generate 8-digit integer number for free text id
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}
