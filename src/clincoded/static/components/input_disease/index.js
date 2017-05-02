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
const InputDisease = module.exports.InputDisease = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        diseaseTerm: PropTypes.string,
        diseaseTermType: PropTypes.string, // Orphanet, DO, OMIM or NCit ID, or free text
        diseaseName: PropTypes.string,
        diseaseDescription: PropTypes.string,
        phenotypes: PropTypes.string,
        initialFormValue: PropTypes.string, // specify the initial value of the resource, in case of editing (passed to Modal)
        updateGdmDiseaseInput: PropTypes.func
    },

    getInitialState() {
        return {
            diseaseTerm: this.props.diseaseTerm,
            diseaseTermType: this.props.diseaseTermType,
            diseaseName: this.props.diseaseName,
            diseaseDescription: this.props.diseaseDescription,
            phenotypes: this.props.phenotypes
        };
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
        if (nextProps.phenotypes) {
            this.setState({phenotypes: nextProps.phenotypes});
        }
    },

    updateParentDiseaseInput(term, type, name, description, hpoids) {
        this.setState({
            diseaseTerm: term ? term : '',
            diseaseTermType: type ? type : 'none',
            diseaseName: name ? name : '',
            diseaseDescription: description ? description : '',
            phenotypes: hpoids ? hpoids : ''
        }, () => {
            let diseaseObj ={
                diseaseTerm: this.state.diseaseTerm,
                diseaseTermType: this.state.diseaseTermType,
                diseaseName: this.state.diseaseName,
                diseaseDescription: this.state.diseaseDescription,
                phenotypes: this.state.phenotypes
            };
            this.props.updateGdmDiseaseInput(diseaseObj);
            this.refs['diseaseTermInputGroup'].setValue(term);
        });
    },

    render() {
        let diseaseTerm = this.state.diseaseTerm;
        let diseaseTermType = this.state.diseaseTermType;
        let diseaseName = this.state.diseaseName;
        let diseaseDescription = this.state.diseaseDescription;
        let phenotypes = this.state.phenotypes;
        let inputGroupBtn = diseaseTerm ? <i className="icon icon-pencil"></i> : <i className="icon icon-search"></i>;

        return (
            <Input
                type="input-group"
                ref="diseaseTermInputGroup"
                label="Enter disease"
                placeholder="Orphanet, DO, OMIM or NCit ID"
                value={diseaseTerm}
                error={this.getFormError('diseaseTerm')}
                clearError={this.clrFormErrors.bind(null, 'diseaseTerm')}
                hasModal={true}
                inputGroupBtn={<AddDiseaseModal
                                    inputGroupBtn={inputGroupBtn}
                                    diseaseTerm={diseaseTerm}
                                    diseaseTermType={diseaseTermType}
                                    diseaseName={diseaseName}
                                    diseaseDescription={diseaseDescription}
                                    phenotypes={phenotypes}
                                    updateParentDiseaseInput={this.updateParentDiseaseInput}
                                />}
                labelClassName="col-sm-5 control-label"
                wrapperClassName="col-sm-7"
                groupClassName="form-group"
                required
            />
        );
    }
});

/**
 * Modal dialog box for adding disease (either by ID or free text)
 */
const AddDiseaseModal = React.createClass({
    mixins: [FormMixin, RestMixin],

    propTypes: {
        inputGroupBtn: PropTypes.object.isRequired,
        diseaseTerm: PropTypes.string,
        diseaseTermType: PropTypes.string,
        diseaseName: PropTypes.string,
        diseaseDescription: PropTypes.string,
        phenotypes: PropTypes.string,
        updateParentDiseaseInput: PropTypes.func // function to call upon pressing the Save button
    },

    getInitialState() {
        return {
            diseaseTerm: this.props.diseaseTerm, // Value for disease term input field (types of 'text' or 'textarea')
            diseaseTermType: this.props.diseaseTermType, // Selected option for disease term type (e.g. Orphanet ID, free text)
            diseaseName: this.props.diseaseName,
            diseaseDescription: this.props.diseaseDescription,
            phenotypes: this.props.phenotypes,
            diseaseFreeTextConfirm: false,
            queryResourceDisabled: true, // Flag to disable the input button
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
                    diseaseTermType: 'none',
                    diseaseTerm: '',
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
            phenotypes: '',
            formErrors: {},
            resourceFetched: false,
            tempResource: {}
        }, () => {
            this.refs[this.state.diseaseTermType].resetValue();
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
        this.setState({
            diseaseName: this.state.tempResource['label'] ? this.state.tempResource['label'] : '',
            diseaseDescription: this.state.tempResource['description'] ? this.state.tempResource['description'] : '',
            phenotypes: this.refs['diseaseFreeTextPhenoTypes'] && this.refs['diseaseFreeTextPhenoTypes'].getValue() ? this.refs['diseaseFreeTextPhenoTypes'].getValue() : ''
        })
        this.props.updateParentDiseaseInput(this.state.diseaseTerm, this.state.diseaseTermType, this.state.diseaseName, this.state.diseaseDescription, this.state.phenotypes);
        this.handleModalClose();
    },

    // Method to render JSX when a disease term result is returned
    renderResourceResult() {
        return(
            <div className="resource-metadata">
                <p>Below are the data from OLS for the ID you submitted. Select "Save" below if it is the correct disease, otherwise revise your search above:</p>
                <div className="panel panel-default">
                    <span className="p-break disease-label">{this.state.tempResource['label']}</span>
                    <span className="p-break disease-linkout"><a href={this.state.tempResource['iri']} target="_blank">{this.state.tempResource['iri']}</a></span>
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
                diseaseIdInputLabel = 'Enter NCit ID:';
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
                {this.state.resourceFetched ? this.renderResourceResult() : null}
            </div>
        );
    },

    renderDiseaseFreeTextInput(diseaseTermType) {
        return (
            <div className="form-group disease-freetext-input">
                <Input type="checkbox" ref="diseaseFreeTextConfirmation" label="Confirm there is no known Orphanet, Disease Ontology, OMIM or NCit ID for this disease:"
                    error={this.getFormError('diseaseFreeTextConfirmation')} clearError={this.clrFormErrors.bind(null, 'diseaseFreeTextConfirmation')}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-confirm"
                    checked={this.state.diseaseFreeTextConfirm} defaultChecked="false" handleChange={this.handleDiseaseFreeTextConfirmChange} required />
                <Input type="textarea" ref={diseaseTermType} label="Rich text description disease" handleChange={this.handleDiseaseFreeTextDescChange} value={this.state.diseaseTerm}
                    error={this.getFormError(diseaseTermType)} clearError={this.clrFormErrors.bind(null, diseaseTermType)} rows="2"
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input disease-freetext-desc" required />
                <Input type="textarea" ref="diseaseFreeTextPhenoTypes" label="Phenotype(s) (HPO ID(s))" value={this.state.phenotypes}
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
            <ModalComponent modalTitle="Add Disease" modalClass="modal-default" modalWrapperClass="add-disease-modal"
                actuatorClass="input-group-btn-disease-term" actuatorTitle={this.props.inputGroupBtn} onRef={ref => (this.child = ref)}>
                <div className="form-std">
                    <div className="modal-body">
                        <div className="row">
                            <Input type="select" ref="diseaseTermType" label="Select disease type:"
                                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group resource-input"
                                value={diseaseTermType} handleChange={this.handleDiseaseTermTypeChange}>
                                <option value="none">No Selection</option>
                                <option value="orphanetid">Orphanet ID</option>
                                <option value="doid">DO ID</option>
                                <option value="omimid">OMIM ID</option>
                                <option value="ncitid">NCit ID</option>
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
                            inputDisabled={!this.state.diseaseTerm}
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
                this.setFormErrors(diseaseTermType, 'Requested ID not found');
                this.setState({queryResourceBusy: false, resourceFetched: false});
            }
        }).catch(e => {
            // error handling for disease query
            this.setFormErrors(diseaseTermType, 'Error querying OLS. Please check your input and try again.');
            this.setState({queryResourceBusy: false, resourceFetched: false});
            console.log(e);
        });
    } else {
        this.setState({queryResourceBusy: false});
    }
}

