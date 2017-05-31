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
 * Modal dialog box for adding disease (either by ID or free text)
 */
const DiseaseModal = module.exports.DiseaseModal = React.createClass({
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
            hasFreeTextDiseaseDescription: false, // True if disease description for free text is present
            hasFreeTextDiseasePhenotypes: false, // True if phenotypes for free text is present
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
        if (this.state.diseaseFreeTextConfirm) {
            // Set boolean state on 'required' prop for free text disease description
            if (this.state.diseaseDescription && this.state.diseaseDescription.length) {
                this.setState({hasFreeTextDiseaseDescription: true});
            } else {
                this.setState({hasFreeTextDiseaseDescription: false});
            }
            // Set boolean state on 'required' prop for free text disease phenotypes
            if (this.state.phenotypes && this.state.phenotypes.length) {
                this.setState({hasFreeTextDiseasePhenotypes: true});
            } else {
                this.setState({hasFreeTextDiseasePhenotypes: false});
            }
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.diseaseId) {
            this.setState({
                diseaseId: nextProps.diseaseId, 
                submitResourceDisabled: false,
                queryResourceDisabled: false
            });
        }
        if (nextProps.diseaseTerm) {
            this.setState({
                diseaseTerm: nextProps.diseaseTerm,
                submitResourceDisabled: false,
                queryResourceDisabled: false
            });
        }
        if (nextProps.diseaseOntology) {
            this.setState({diseaseOntology: nextProps.diseaseOntology});
        }
        if (nextProps.diseaseDescription) {
            this.setState({diseaseDescription: nextProps.diseaseDescription, hasFreeTextDiseaseDescription: true});
        }
        if (nextProps.diseaseFreeTextConfirm) {
            this.setState({diseaseFreeTextConfirm: nextProps.diseaseFreeTextConfirm});
        }
        if (nextProps.phenotypes) {
            this.setState({phenotypes: nextProps.phenotypes}, () => {
                if (this.state.phenotypes.length) {
                    this.setState({hasFreeTextDiseasePhenotypes: true});
                }
            });
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
                    diseaseDescription: this.props.diseaseDescription,
                    diseaseOntology: this.props.diseaseOntology,
                    phenotypes: this.props.phenotypes,
                    synonyms: this.props.synonyms,
                    diseaseFreeTextConfirm: this.props.diseaseFreeTextConfirm,
                    queryResourceDisabled: this.state.diseaseId ? false : true,
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

    /**
     * Method to ensure either (or both) free text disease description or phenotypes are present
     */
    handleDiseaseFreeTextDescChange(e) {
        if (this.refs['diseaseFreeTextDesc'] && !this.refs['diseaseFreeTextDesc'].getValue()) {
            this.setState({hasFreeTextDiseaseDescription: false});
        } else {
            this.setState({hasFreeTextDiseaseDescription: true}, () => {this.clrFormErrors('diseaseFreeTextPhenoTypes')});
        }
    },

    /**
     * Method to ensure either (or both) free text disease description or phenotypes are present
     */
    handleDiseaseFreeTextPhenotypesChange(e) {
        if (this.refs['diseaseFreeTextPhenoTypes'] && !this.refs['diseaseFreeTextPhenoTypes'].getValue()) {
            this.setState({hasFreeTextDiseasePhenotypes: false});
        } else {
            this.setState({hasFreeTextDiseasePhenotypes: true}, () => {this.clrFormErrors('diseaseFreeTextDesc')});
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
        let formError = false;

        if (this.state.diseaseFreeTextConfirm) {
            if (this.refs['diseaseFreeTextTerm'] && !this.refs['diseaseFreeTextTerm'].getValue()) {
                this.setFormErrors('diseaseFreeTextTerm', 'Required for free text disease');
                return;
            }
            if (this.refs['diseaseFreeTextDesc'] && !this.refs['diseaseFreeTextDesc'].getValue()) {
                if (!this.refs['diseaseFreeTextPhenoTypes'].getValue()) {
                    formError = true;
                    this.setFormErrors('diseaseFreeTextDesc', 'A description or HPO IDs (e.g. HP:0000001) are required');
                }
            }
            if (this.refs['diseaseFreeTextPhenoTypes'] && !this.refs['diseaseFreeTextPhenoTypes'].getValue()) {
                if (!this.refs['diseaseFreeTextDesc'].getValue()) {
                    formError = true;
                    this.setFormErrors('diseaseFreeTextPhenoTypes', 'A description or HPO IDs (e.g. HP:0000001) are required');
                }
            }
            if (this.refs['diseaseFreeTextPhenoTypes'] && this.refs['diseaseFreeTextPhenoTypes'].getValue()) {
                let hpoids = curator.capture.hpoids(this.getFormValue('diseaseFreeTextPhenoTypes'));
                // Check HPO ID format
                if (hpoids && hpoids.length && _(hpoids).any(id => { return id === null; })) {
                    // HPOID list is bad
                    formError = true;
                    this.setFormErrors('diseaseFreeTextPhenoTypes', 'Use HPO IDs (e.g. HP:0000001) separated by commas');
                }
            }
            if (!formError) {
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
                    this.handleModalClose();
                });
            }
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
                this.handleModalClose();
            });
        }
    },

    renderDiseaseDescription() {
        let tempResource = this.state.tempResource,
            diseaseDescription = this.state.diseaseDescription;

        if (Object.keys(tempResource).length && tempResource['annotation']['definition']) {
            return (
                <span className="p-break disease-description">{tempResource['annotation']['definition']}</span>
            );
        } else if (diseaseDescription && diseaseDescription.length) {
            return (
                <span className="p-break disease-description">{diseaseDescription}</span>
            );
        }
    },

    // Method to render JSX when a disease term result is returned
    renderResourceResult() {
        let diseaseId = this.state.diseaseId,
            diseaseTerm = this.state.diseaseTerm,
            tempResource = this.state.tempResource;
        
        return(
            <div className="resource-metadata">
                <p>Below are the data from OLS for the ID you submitted. Select "Save" below if it is the correct disease, otherwise revise your search above:</p>
                <div className="panel panel-default">
                    <span className="p-break disease-label">
                        <a href={external_url_map['MondoSearch'] + diseaseId.replace(':', "_")} target="_blank">
                            {Object.keys(tempResource).length && tempResource['label'] ? tempResource['label'] : diseaseTerm}
                        </a>
                    </span>
                    {this.renderDiseaseDescription()}
                </div>
            </div>
        );
    },

    renderDiseaseIdInput() {
        let diseaseId = this.state.diseaseId,
            diseaseTerm = this.state.diseaseTerm,
            diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm,
            resourceFetched = this.state.resourceFetched;

        return (
            <div className="form-group disease-id-input clearfix">
                <Input type="text" ref="diseaseId" handleChange={this.handleDiseaseIdChange} value={diseaseId.replace('_', ':')}
                    label={<span>Enter the term "id" <span className="label-note">(Term "id" can be found in the "Term info" box displayed on the right hand side on the term page of the OLS)</span>:</span>}
                    error={this.getFormError("diseaseId")} clearError={this.clrFormErrors.bind(null, "diseaseId")}
                    labelClassName="col-sm-12 control-label" wrapperClassName="col-sm-12" groupClassName="form-group resource-input clearfix"
                    inputClassName="disease-id-input" placeholder="e.g. Orphanet:93545, DOID:0050776 OR OMIM:100800" required />
                <Input type="button-button" title="Retrieve from OLS" 
                    inputClassName={(this.state.queryResourceDisabled ? "btn-default" : "btn-primary") + " pull-right btn-query-ols"} 
                    clickHandler={this.queryResource} submitBusy={this.state.queryResourceBusy} inputDisabled={this.state.queryResourceDisabled}/>
                <div className="row">&nbsp;<br />&nbsp;</div>
                {resourceFetched || diseaseTerm ?
                    this.renderResourceResult()
                :
                    <div className="disease-freetext-confirm-input-group clearfix">
                        <p className="alert alert-warning">Note: We strongly encourage use of a MonDO ontology term and therefore specific database identifier for a disease. If you have searched and
                            there is no appropriate database identifier you may contact us at <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a> and/or
                            create a term using free text.</p>
                        <div className="panel panel-default">
                            <Input type="checkbox" ref="diseaseFreeTextConfirmation" label={<span>Check this box <i>only</i> if you were unable to find a suitable ontology term and need to enter a free text term:</span>}
                                labelClassName="col-sm-10 control-label" wrapperClassName="col-sm-2" groupClassName="form-group resource-input disease-freetext-confirm clearfix"
                                checked={diseaseFreeTextConfirm} defaultChecked="false" handleChange={this.handleDiseaseFreeTextConfirmChange} />
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
                <p className="alert alert-warning">Use of free text could result in different terms being used for the same disease. Please make certain there is no
                    appropriate ontology term before applying a free text disease name.</p>
                <Input type="text" ref="diseaseFreeTextTerm" label="Disease name:" handleChange={this.handleDiseaseFreeTextTermChange}
                    error={this.getFormError("diseaseFreeTextTerm")} clearError={this.clrFormErrors.bind(null, "diseaseFreeTextTerm")}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-name clearfix"
                    value={this.state.diseaseTerm ? this.state.diseaseTerm : ''} maxLength="100" placeholder="Short phrase (max 100 characters)" required />
                <p>Either a definition or HPO term(s) is required to describe this disease (both fields may be used).</p>
                <Input type="textarea" ref="diseaseFreeTextDesc" label="Disease definition:" handleChange={this.handleDiseaseFreeTextDescChange}
                    error={this.getFormError('diseaseFreeTextDesc')} clearError={this.clrFormErrors.bind(null, 'diseaseFreeTextDesc')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-desc clearfix"
                    value={this.state.diseaseDescription ? this.state.diseaseDescription : ''} rows="2" placeholder="Describe this disease"
                    required={!this.state.hasFreeTextDiseasePhenotypes} />
                <Input type="textarea" ref="diseaseFreeTextPhenoTypes" label="Phenotype(s) (HPO ID(s)):" handleChange={this.handleDiseaseFreeTextPhenotypesChange}
                    error={this.getFormError('diseaseFreeTextPhenoTypes')} clearError={this.clrFormErrors.bind(null, 'diseaseFreeTextPhenoTypes')}
                    value={hpoids} placeholder="e.g. HP:0010704, HP:0030300" rows="1" required={!this.state.hasFreeTextDiseaseDescription}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-phenotypes clearfix" />
            </div>
        );
    },

    render() {
        let diseaseId = this.state.diseaseId;
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm;

        return (
            <ModalComponent modalTitle={diseaseTerm ? "Edit Disease" : "Add Disease"} modalClass="modal-default" modalWrapperClass={"add-disease-modal" + this.props.addDiseaseModalBtnLayoutClass}
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
            /**
             * Disallow OMIA IDs
             */
            if (id.indexOf('OMIA') > -1) {
                valid = false;
                this.setFormErrors('diseaseId', 'OMIA IDs are not supported');
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
