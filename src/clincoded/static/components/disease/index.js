"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import ModalComponent from '../../libs/bootstrap/modal';
import { FormMixin, Input } from '../../libs/bootstrap/form';
import { RestMixin } from '../rest';

/**
 * Input component to display a text input field with a button to the right,
 * which can be clicked to invoke a modal.
 * This is referred to as an "input-group" in Bootstrap.
 * Usage: <InputDisease {...props} />
 * See 'InputDisease.propTypes' for props details.
 */
const AddDisease = module.exports.AddDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        gdm: PropTypes.object, // For editing disease (passed to Modal)
        updateDiseaseObj: PropTypes.func,
        error: PropTypes.string
    },

    getInitialState() {
        return {
            gdm: this.props.gdm,
            error: this.props.error,
            diseaseTerm: '',
            diseaseTermType: 'none',
            diseaseName: null,
            diseaseDescription: null,
            phenotypes: '',
            diseaseFreeTextConfirm: false,
            diseaseObj: {}
        };
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.gdm) {
            this.setState({gdm: nextProps.gdm}, () => {
                let gdm = this.state.gdm;
                if (gdm && gdm.disease) { this.setState({diseaseTerm: gdm.disease}) };
                if (gdm && gdm.diseaseType) { this.setState({diseaseTermType: gdm.diseaseType}) };
                if (gdm && gdm.diseaseName) { this.setState({diseaseName: gdm.diseaseName}) };
                if (gdm && gdm.diseaseDescription) { this.setState({diseaseDescription: gdm.diseaseDescription}) };
                if (gdm && gdm.diseaseFreeTextConfirm) { this.setState({diseaseFreeTextConfirm: gdm.diseaseFreeTextConfirm}) };
                if (gdm && gdm.phenotypes) { this.setState({phenotypes: gdm.phenotypes}) };
            });
        }
        if (nextProps.error) {
            this.setState({gdm: nextProps.error});
        }
    },

    passDataToParent(term, type, name, description, hpoids, confirm) {
        let diseaseObj = this.state.diseaseObj;
        if (term) {
            diseaseObj['diseaseTerm'] = term;
            this.setState({diseaseTerm: term});
        }
        if (type) {
            diseaseObj['diseaseTermType'] = type;
            this.setState({diseaseTermType: type});
        }
        if (name) {
            diseaseObj['diseaseName'] = name;
            this.setState({diseaseName: name});
        }
        if (description) {
            diseaseObj['diseaseDescription'] = description;
            this.setState({diseaseDescription: description});
        } else {
            if (diseaseObj['diseaseDescription']) { delete diseaseObj['diseaseDescription'] };
            this.setState({diseaseDescription: null});
        }
        if (hpoids) {
            diseaseObj['phenotypes'] = hpoids;
            this.setState({phenotypes: hpoids});
        } else {
            if (diseaseObj['phenotypes']) { delete diseaseObj['phenotypes'] };
            this.setState({phenotypes: ''});
        }
        if (confirm) {
            diseaseObj['diseaseFreeTextConfirm'] = true;
            this.setState({diseaseFreeTextConfirm: true});
        } else {
            if (diseaseObj['diseaseFreeTextConfirm']) { delete diseaseObj['diseaseFreeTextConfirm'] };
            this.setState({diseaseFreeTextConfirm: false});
        }
        this.setState({diseaseObj: diseaseObj}, () => {
            // Pass data object back to parent
            this.props.updateDiseaseObj(this.state.diseaseObj);
        });
    },

    render() {
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseTermType = this.state.diseaseTermType;
        let diseaseName = this.state.diseaseName;
        let diseaseDescription = this.state.diseaseDescription;
        let diseaseFreeTextConfirm = this.state.diseaseFreeTextConfirm;
        let phenotypes = this.state.phenotypes;
        let addDiseaseModalBtn = diseaseName ? <span>Disease<i className="icon icon-pencil"></i></span> : <span>Disease<i className="icon icon-plus-circle"></i></span>;
        let error = this.state.error;

        return (
            <div className="form-group add-disease-group">
                <label htmlFor="add-disease" className="col-sm-5 control-label"><span>Please add disease:<span className="required-field"> *</span><span className="control-label-note">OLS</span></span></label>
                <div className="col-sm-7 add-disease inline-button-wrapper clearfix" id="add-disease">
                    <div ref="diseaseName" className={diseaseName ? "disease-name col-sm-8" : "disease-name"}>
                        {error ?
                            <span className="form-error">{error}</span>
                            :
                            <span>{diseaseName}</span>
                        }
                    </div>
                    <AddDiseaseModal
                        addDiseaseModalBtn={addDiseaseModalBtn}
                        diseaseTerm={diseaseTerm}
                        diseaseTermType={diseaseTermType}
                        diseaseName={diseaseName}
                        diseaseDescription={diseaseDescription}
                        diseaseFreeTextConfirm={diseaseFreeTextConfirm}
                        phenotypes={phenotypes}
                        passDataToParent={this.passDataToParent}
                        addDiseaseModalBtnLayoutClass={diseaseName || error ? ' pull-right' : ''}
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
        diseaseTerm: PropTypes.string,
        diseaseTermType: PropTypes.string,
        diseaseName: PropTypes.string,
        diseaseDescription: PropTypes.string,
        diseaseFreeTextConfirm: PropTypes.bool,
        phenotypes: PropTypes.string,
        passDataToParent: PropTypes.func, // function to call upon pressing the Save button
        addDiseaseModalBtnLayoutClass: PropTypes.string
    },

    getInitialState() {
        return {
            diseaseTerm: this.props.diseaseTerm, // Value for disease term input field (types of 'text' or 'textarea')
            diseaseTermType: this.props.diseaseTermType, // Selected option for disease term type (e.g. Orphanet ID, free text)
            diseaseName: this.props.diseaseName,
            diseaseDescription: this.props.diseaseDescription,
            phenotypes: this.props.phenotypes,
            diseaseFreeTextConfirm: this.props.diseaseFreeTextConfirm,
            queryResourceDisabled: true, // Flag to disable the get OLS data button
            queryResourceBusy: false, // Flag to indicate the input button's 'busy' state
            resourceFetched: false, // Flag to indicate that a response from the resource has been obtained
            tempResource: {}, // Temporary object to hold the resource response
            submitResourceBusy: false // Flag to indicate that the modal's submit button is in a 'busy' state (creating local db entry)
        };
    },

    componentDidMount() {
        if (this.state.diseaseTermType && this.refs['diseaseTermType']) {
            this.refs['diseaseTermType'].setValue(this.state.diseaseTermType);
        }
        if (this.state.diseaseTermType && this.state.diseaseTerm && this.refs[this.state.diseaseTermType]) {
            this.refs[this.state.diseaseTermType].setValue(this.state.diseaseTerm);
        }
        if (this.state.diseaseName) {
            this.renderResourceResult();
        }
    },

    componentWillReceiveProps(nextProps)  {
        if (nextProps.diseaseTerm) {
            this.setState({diseaseTerm: nextProps.diseaseTerm});
        }
        if (nextProps.diseaseTermType) {
            this.setState({diseaseTermType: nextProps.diseaseTermType});
        }
        if (nextProps.diseaseName) {
            this.setState({diseaseName: nextProps.diseaseName});
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
        errors['diseaseTermType'] = '';
        if (!this.state.submitResourceBusy) {
            if (trigger && trigger === 'cancel') {
                this.setState({
                    formErrors: errors,
                    diseaseTermType: this.props.diseaseTermType,
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

    // Called when disease type pull-down selection is changed
    handleDiseaseTermTypeChange() {
        this.setState({
            diseaseTermType: this.refs['diseaseTermType'].getValue(),
            diseaseTerm: '',
            diseaseName: null,
            diseaseDescription: null,
            diseaseFreeTextConfirm: false,
            phenotypes: '',
            formErrors: {},
            resourceFetched: false,
            tempResource: {}
        }, () => {
            if (this.refs[this.state.diseaseTermType] && this.refs[this.state.diseaseTermType].getValue()) {
                this.refs[this.state.diseaseTermType].resetValue();
            }
        });
    },

    // Called when the value in the disease term input field is changed
    handleDiseaseTermChange(e) {
        if (this.refs[this.state.diseaseTermType]) {
            let tempResourceId = this.refs[this.state.diseaseTermType].getValue();
            this.setState({diseaseTerm: tempResourceId, resourceFetched: false, tempResource: {}});
            if (this.refs[this.state.diseaseTermType].getValue().length > 0) {
                this.setState({queryResourceDisabled: false});
            } else {
                this.setState({queryResourceDisabled: true});
            }
        }
    },

    // Called to select/deselect free text disease confirmation checkbox
    handleDiseaseFreeTextConfirmChange(e) {
        this.setState({diseaseFreeTextConfirm: !this.state.diseaseFreeTextConfirm});
    },

    // Called when the value in the disease free text input field is changed
    handleDiseaseFreeTextDescChange(e) {
        if (this.refs['freetext']) {
            let diseaseFreeText = this.refs['freetext'].getValue();
            this.setState({diseaseTerm: diseaseFreeText && diseaseFreeText.length ? diseaseFreeText : ''});
        }
    },

    // Invoked when the 'Retrieve...' button is pressed in the modal
    queryResource(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({queryResourceBusy: true, resourceFetched: false}, () => {
            queryResourceById.call(this, this.state.diseaseTermType);
        });
    },

    // Called when the button to save the disease term (ID or free text) to the main form is pressed
    submitResource(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        if (this.state.diseaseTermType === 'freetext') {
            if (!this.state.diseaseFreeTextConfirm) {
                this.setFormErrors('diseaseFreeTextConfirmation', 'Required for free text disease');
                return;
            }
            this.setState({
                phenotypes: this.refs['diseaseFreeTextPhenoTypes'] && this.refs['diseaseFreeTextPhenoTypes'].getValue() ? this.refs['diseaseFreeTextPhenoTypes'].getValue() : ''
            }, () => {
                this.props.passDataToParent(
                    this.state.diseaseTerm,
                    this.state.diseaseTermType,
                    this.state.diseaseTerm,
                    null,
                    this.state.phenotypes,
                    this.state.diseaseFreeTextConfirm
                );
            });
        } else {
            this.setState({
                diseaseName: this.state.tempResource['label'] ? this.state.tempResource['label'] : '',
                diseaseDescription: this.state.tempResource['description'] ? this.state.tempResource['description'][0] : ''
            }, () => {
                this.props.passDataToParent(
                    this.state.diseaseTerm,
                    this.state.diseaseTermType,
                    this.state.diseaseName,
                    this.state.diseaseDescription,
                    '',
                    false
                );
            });
        }
        this.handleModalClose();
    },

    // Method to render JSX when a disease term result is returned
    renderResourceResult(type, term) {
        // Set OLS linkout given the disease term type
        let url;
        let id = term.match(/[0-9]*$/);
        switch(type) {
            case 'orphanetid':
                url = 'https://www.ebi.ac.uk/ols/ontologies/ordo/terms?iri=http://www.orpha.net/ORDO/Orphanet_';
                break;
            case 'doid':
                url = 'https://www.ebi.ac.uk/ols/ontologies/doid/terms?iri=http://purl.obolibrary.org/obo/DOID_';
                break;
            case 'omimid':
                url = 'https://www.ebi.ac.uk/ols/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/OMIM_';
                break;
            case 'ncitid':
                url = 'https://www.ebi.ac.uk/ols/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/NCIT_C';
                break;
        }

        return(
            <div className="resource-metadata">
                <p>Below are the data from OLS for the ID you submitted. Select "Save" below if it is the correct disease, otherwise revise your search above:</p>
                <div className="panel panel-default">
                    <span className="p-break disease-label"><a href={url + id} target="_blank">{this.state.tempResource['label']}</a></span>
                    {this.state.tempResource['description'] ?
                        <span className="p-break disease-description">{this.state.tempResource['description']}</span>
                    : null}
                </div>
            </div>
        );
    },

    renderDiseaseIdInput(diseaseTermType) {
        let diseaseIdInputLabel, placeholderText;
        switch (diseaseTermType) {
            case 'orphanetid':
                diseaseIdInputLabel = 'Enter Orphanet ID:';
                placeholderText = 'e.g. ORPHA:15';
                break;
            case 'doid':
                diseaseIdInputLabel = 'Enter DO ID:';
                placeholderText = 'e.g. DOID:7081';
                break;
            case 'omimid':
                diseaseIdInputLabel = 'Enter OMIM ID:';
                placeholderText = 'e.g. OMIM:133780';
                break;
            case 'ncitid':
                diseaseIdInputLabel = 'Enter NCIt ID:';
                placeholderText = 'e.g. NCIT:C9038';
                break;
        }

        return (
            <div className="form-group disease-id-input">
                <Input type="text" ref={diseaseTermType} label={diseaseIdInputLabel} handleChange={this.handleDiseaseTermChange} value={this.state.diseaseTerm}
                    error={this.getFormError(diseaseTermType)} clearError={this.clrFormErrors.bind(null, diseaseTermType)}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input"
                    placeholder={placeholderText} />
                <Input type="button-button" title="Retrieve from OLS" 
                    inputClassName={(this.state.queryResourceDisabled ? "btn-default" : "btn-primary") + " pull-right btn-query-ols"} 
                    clickHandler={this.queryResource} submitBusy={this.state.queryResourceBusy} inputDisabled={this.state.queryResourceDisabled}/>
                <div className="row">&nbsp;<br />&nbsp;</div>
                {this.state.resourceFetched ? this.renderResourceResult(diseaseTermType, this.state.diseaseTerm) : null}
            </div>
        );
    },

    renderDiseaseFreeTextInput(diseaseTermType) {
        return (
            <div className="form-group disease-freetext-input">
                <Input type="checkbox" ref="diseaseFreeTextConfirmation" label="Confirm there is no known Orphanet, Disease Ontology, OMIM or NCIt ID for this disease:"
                    error={this.getFormError('diseaseFreeTextConfirmation')} clearError={this.clrFormErrors.bind(null, 'diseaseFreeTextConfirmation')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-confirm"
                    checked={this.state.diseaseFreeTextConfirm} defaultChecked="false" handleChange={this.handleDiseaseFreeTextConfirmChange} required />
                <Input type="textarea" ref={diseaseTermType} label="Rich text description disease" handleChange={this.handleDiseaseFreeTextDescChange}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-desc"
                    value={this.state.diseaseTerm} rows="2" required />
                <Input type="textarea" ref="diseaseFreeTextPhenoTypes" label="Phenotype(s) (HPO ID(s))" defaultValue={this.state.phenotypes}
                    error={this.getFormError('diseaseFreeTextPhenoTypes')} clearError={this.clrFormErrors.bind(null, 'diseaseFreeTextPhenoTypes')} rows="1"
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-phenotypes" />
            </div>
        );
    },

    render() {
        let diseaseTerm = this.state.diseaseTerm;
        let pattern = /^(orphanetid|doid|omimid|ncitid)$/i;
        let diseaseTermType = this.state.diseaseTermType;

        return (
            <ModalComponent modalTitle="Add Disease" modalClass="modal-default" modalWrapperClass={"add-disease-modal" + this.props.addDiseaseModalBtnLayoutClass}
                bootstrapBtnClass="btn btn-primary " actuatorClass="input-group-btn-disease-term" actuatorTitle={this.props.addDiseaseModalBtn} onRef={ref => (this.child = ref)}>
                <div className="form-std">
                    <div className="modal-body">
                        <div className="row">
                            <div>
                                <p>OLS (Ontology Lookup Service) is the provider of terminology data.</p>
                            </div>
                            <Input type="select" ref="diseaseTermType" label="Select disease terminology:"
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input"
                                value={diseaseTermType} handleChange={this.handleDiseaseTermTypeChange}>
                                <option value="none">No Selection</option>
                                <option value="orphanetid">Orphanet ID</option>
                                <option value="doid">DO ID</option>
                                <option value="omimid">OMIM ID</option>
                                <option value="ncitid">NCIt ID</option>
                                <option value="freetext">Free text</option>
                            </Input>
                            {diseaseTermType.match(pattern) ? this.renderDiseaseIdInput(diseaseTermType) : null}
                            {diseaseTermType.indexOf('freetext') > -1 ? this.renderDiseaseFreeTextInput(diseaseTermType) : null}
                        </div>
                    </div>
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                        <Input
                            type="button-button"
                            title="Save"
                            clickHandler={this.submitResource}
                            inputDisabled={!diseaseTerm}
                            submitBusy={this.state.submitResourceBusy}
                            inputClassName={this.getFormError(diseaseTermType) === null || this.getFormError(diseaseTermType) === undefined || this.getFormError(diseaseTermType) === '' ?
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
function validateDiseaseTermInput(diseaseTermType) {
    // validating the field for user-entered disease term
    let valid = this.validateDefault();
    let diseaseTerm = this.getFormValue(diseaseTermType);

    if (valid) {
        if (diseaseTerm && diseaseTerm.length) {
            /*
            if (diseaseTerm.match(/^[0-9]*$/)) {
                valid = false;
                this.setFormErrors(diseaseTermType, 'Please enter valid ID');
            }
            
            if (!diseaseTerm.match(/^(ORPHA|DOID|OMIM|NCIT)/)) {
                valid = false;
                this.setFormErrors(diseaseTermType, 'Please enter valid ID');
            }
            */
        } else {
            valid = false;
            this.setFormErrors(diseaseTermType, 'Please enter an ID');
        }
    }

    return valid;
}

/**
 * Method to make OLS REST API call given the user-selected ID type
 */
function queryResourceById(diseaseTermType) {
    let term = this.state.diseaseTerm;
    let id = term.match(/[0-9]*$/);
    this.saveFormValue(diseaseTermType, id);
    if (validateDiseaseTermInput.call(this, diseaseTermType)) {
        // Set OLS REST API endpoint given the disease term type
        let url;
        switch(diseaseTermType) {
            case 'orphanetid':
                url = 'https://www.ebi.ac.uk/ols/api/ontologies/ordo/terms?iri=http://www.orpha.net/ORDO/Orphanet_';
                break;
            case 'doid':
                url = 'https://www.ebi.ac.uk/ols/api/ontologies/doid/terms?iri=http://purl.obolibrary.org/obo/DOID_';
                break;
            case 'omimid':
                url = 'https://www.ebi.ac.uk/ols/api/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/OMIM_';
                break;
            case 'ncitid':
                url = 'https://www.ebi.ac.uk/ols/api/ontologies/mondo/terms?iri=http://purl.obolibrary.org/obo/NCIT_C';
                break;
        }
        // Make the API call
        return this.getRestData(url + id).then(response => {
            let termLabel = response['_embedded']['terms'][0]['label'];
            let termIri = response['_embedded']['terms'][0]['iri'];
            if (termLabel && termIri) {
                // Disease ID is found at OLS
                this.setState({queryResourceBusy: false, tempResource: response['_embedded']['terms'][0], resourceFetched: true});
            } else {
                // Disease ID not found at OLS
                this.setFormErrors(diseaseTermType, 'Requested ID not found at OLS.');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        }).catch(err => {
            // error handling for disease query
            this.setFormErrors(diseaseTermType, 'Unable to retrieve data from OLS.');
            this.setState({queryResourceBusy: false, resourceFetched: false});
            console.warn('OLS terminology fetch error :: %o', err);
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}

