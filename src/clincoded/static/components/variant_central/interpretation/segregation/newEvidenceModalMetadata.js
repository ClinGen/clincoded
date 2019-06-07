// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

// shared lib
import { Form, FormMixin, Input } from '../../../../libs/bootstrap/form';
import ModalComponent from '../../../../libs/bootstrap/modal';
import { parsePubmed } from '../../../../libs/parse-pubmed';

// Internal lib
import { extraEvidence } from './segregationData';

import { RestMixin } from '../../../rest';
import { external_url_map } from '../../../globals';
import { PmidSummary } from '../../../curator';
import { ContextualHelp } from '../../../../libs/bootstrap/contextual_help';

let NewEvidenceModalMetadata = createReactClass({
    mixins: [FormMixin, RestMixin],
    propTypes: {
        evidenceType: PropTypes.string,      // Evidence source type
        metadataDone: PropTypes.func,        // Function to call when input metadata modal is done; either Next or Cancel.
        data: PropTypes.object,              // Metadata - If null, adding.  Otherwise, editing.
        isNew: PropTypes.bool,               // If we are adding a new piece of evidence or editing an existing piece
        useIcon: PropTypes.bool,             // Use an icon instead of text as link text
        disableActuator: PropTypes.bool      // Disable the actuator or not
    },
    getInitialState() {
        return {
            loadNextModal: false,
            data: this.props.data,
            pmidResult: null,
            pmidLookupBusy: false,
            pmidPreviewDisabled: true,
            isNextDisabled: this.props.isNew ? true : false
        };
    },

    /**
     * Return the modal title for the given evidence type
     *
     * @param {string} evidenceType   // evidence source type
     */
    title(evidenceType) {
        if (evidenceType && evidenceType in extraEvidence.typeMapping) {
            if (this.props.isNew) {
                return `Add ${extraEvidence.typeMapping[evidenceType]['name']} Evidence`;
            } else {
                return `Edit ${extraEvidence.typeMapping[evidenceType]['name']} Evidence`;
            }
        }
        return null;
    },

    /**
     * Enable/Disable buttons depending on user changes
     *
     * @param {string} ref  // data field name
     * @param {object} e    // event
     */
    handleChange(ref, e) {
        // ref is the name, since that's how we defined it
        let data = this.state.data;
        data[ref] = e.target.value;
        let disabled = false;
        let pmidDisabled = true;

        // Check if requried fields have value, then enable Next button.
        // If not, disable it.
        extraEvidence.typeMapping[this.props.evidenceType].fields.forEach(pair => {
            if (pair.required) {
                let name = pair.name;
                if (!(name in data)) {
                    disabled = true;
                } else if (data[name] === undefined || data[name] === null || data[name] === '') {
                    disabled = true;
                }
            }
        });

        // If PMID field has value, enable Preview Pubmed Article button
        // but disable Next button.
        if (ref === 'pmid' && data[ref] && data[ref] !== '') {
            pmidDisabled = false;
            disabled = true;
        }

        this.setState({
            pmidPreviewDisabled: pmidDisabled,
            isNextDisabled: disabled,
            data: data
        });
    },

    /**
     * Display input fields for the selected evidence type
     */
    additionalEvidenceInputFields() {
        let key = this.props.evidenceType;
        if (key && key in extraEvidence.typeMapping) {
            let nodes = [];
            extraEvidence.typeMapping[key]['fields'].forEach(obj => {
                let lbl = [<span key={`span_${obj['name']}`}>{obj['description']}</span>];
                if (obj.identifier) {
                    let help = <span key={`span_help_${obj['name']}`}> <ContextualHelp content="This field will be used as an identifier for this piece of evidence."></ContextualHelp></span>;
                    lbl.push(help);
                }
                let disableInput = !this.props.isNew && obj['required'] ? true : false;
                let node = [<div key={obj['name']} style={{textAlign: 'left'}}>
                        <Input
                            type="text"
                            label={lbl}
                            id={obj['name']}
                            name={obj['name']}
                            value = { this.getInputValue(obj.name) }
                            ref={obj['name']}
                            required={obj['required']}
                            handleChange={ this.handleChange }
                            error={this.getFormError('resourceId')}
                            clearError={this.clrFormErrors.bind(null, 'resourceId')}
                            inputDisabled = {disableInput}
                        />
                    </div>];
                if (key === 'PMID') {
                    node.push(<Input
                            type = "button-button"
                            inputClassName = {(this.state.pmidPreviewDisabled ? "btn-default" : "btn-primary") + " btn-inline-spacer pull-right"}
                            clickHandler = {this.searchPMID}
                            title = "Preview PubMed Article"
                            submitBusy = {this.state.pmidLookupBusy}
                            inputDisabled = {this.state.pmidPreviewDisabled}
                            required
                        />);
                }
                nodes.push(node);
            });
            return nodes;
        } else {
            return null;
        }
    },

    /**
     * Return the value of the given field if available
     *
     * @param {string} name     // field name
     */
    getInputValue(name) {
        if (!this.props.isNew && this.props.data) {
            return this.props.data[name];
        }
        return '';
    },

    /**
     * Check if the given PMID is valid.  Return true if valid, otherwise, set form error.
     *
     * @param {string} id    PMID to be validated
     */
    validatePMID(id) {
        let valid = true;
        let pmid = id;
        // Valid if input has a prefix like "PMID:" (which is removed before validation continues)
        if (pmid.match(/:/)) {
            if (pmid.match(/^PMID\s*:/i)) {
                pmid = pmid.replace(/^PMID\s*:\s*(\S*)$/i, '$1');

                if (!pmid) {
                    valid = false;
                    this.setFormErrors('resourceId', 'Please include a PMID');
                    this.setState({
                        pmidLookupBusy: false,
                        pmidResult: null
                    });
                }
            } else {
                valid = false;
                this.setFormErrors('resourceId', 'Invalid PMID');
                this.setState({
                    pmidLookupBusy: false,
                    pmidResult: null
                });
            }
        }
        // valid if input isn't zero-filled
        if (valid && pmid.match(/^0+$/)) {
            valid = false;
            this.setFormErrors('resourceId', 'This PMID does not exist');
            this.setState({
                pmidLookupBusy: false,
                pmidResult: null
            });
        }
        // valid if input isn't zero-leading
        if (valid && pmid.match(/^0+/)) {
            valid = false;
            this.setFormErrors('resourceId', 'Please re-enter PMID without any leading 0\'s');
            this.setState({
                pmidLookupBusy: false,
                pmidResult: null
            });
        }
        // valid if the input only has numbers
        if (valid && !pmid.match(/^[0-9]*$/)) {
            valid = false;
            this.setFormErrors('resourceId', 'PMID should contain only numbers');
            this.setState({
                pmidLookupBusy: false,
                pmidResult: null
            });
        }
        return valid;
    },

    /**
     * Retrieve Pubmed article if provided PMID is valid.
     * Otherwise, display error.
     *
     * @param {object}  e   // event
     */
    searchPMID(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.saveAllFormValues();
        let formValues = this.getAllFormValues();
        let pmid = formValues['pmid'];
        if (pmid) {
            this.setState({
                pmidLookupBusy: true
            }, () => {
                if (this.validatePMID(pmid)) {
                    const id = pmid.replace(/^PMID\s*:\s*(\S*)$/i, '$1');
                    this.getRestData('/articles/' + id).then(article => {
                        // article already exists in db
                        this.setState({
                            pmidResult: article,
                            isNextDisabled: false
                        });
                    }, () => {
                        // PubMed article not in our DB; go out to PubMed itself to retrieve it as XML
                        this.getRestDataXml(external_url_map['PubMedSearch'] + id).then(xml => {
                            var data = parsePubmed(xml);
                            if (data.pmid) {
                                // found the result we want
                                this.setState({
                                    pmidResult: data,
                                    isNextDisabled: false
                                });
                            } else {
                                // no result from ClinVar
                                this.setState({
                                    pmidResult: null
                                });
                                this.setFormErrors('resourceId', 'PMID not found');
                            }
                        });
                    })
                    .then(() => {
                        this.setState({
                            pmidLookupBusy: false
                        });
                    })
                    .catch(e => {
                        // error handling for PubMed query
                        console.error(e);
                        this.setFormErrors('resourceId', 'Error in looking up PMID');
                    });
                }
            });
        }
        else {
            this.setFormErrors('resourceId', 'Please enter a PMID');
        }
    },

    /**
     * Next button is clicked, call function to save provided metadata.
     * 
     * @param {object} e    // event
     */
    submitAdditionalEvidenceHandler(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        this.saveAllFormValues();
        let formValues = this.getAllFormValues();

        formValues['_kind_title'] = extraEvidence.typeMapping[this.props.evidenceType]['name'];
        formValues['_kind_key'] = this.props.evidenceType;
        this.handleModalClose();
        this.resetAllFormValues();
        this.setState({
            pmidResult: null,
            isNextDisabled: this.props.isNew ? true : false
        });
        this.props.metadataDone(true, formValues);
    },

    /**
     * Display the Pubmed article
     */
    renderPMIDResult() {
        if (!this.state.pmidResult) {
            return null;
        } 
        return (
            <div>
                <span className="col-sm-10 col-sm-offset-1">
                    <PmidSummary
                        article={this.state.pmidResult}
                        displayJournal
                        pmidLinkout
                    />
                </span>
            </div>
        )
    },

    /**
     * Cancel button is clicked.  Close modal and reset form data.
     */
    cancel() {
        this.props.metadataDone(false, null);
        this.handleModalClose();
        let errors = this.state.formErrors;
        errors['resourceId'] = '';
        this.setState({
            pmidResult: null,
            pmidLookupBusy: false,
            formErrors: errors,
            data: this.props.data,
            isNextDisabled: this.props.isNew ? true : false
        });
    },

    handleModalClose() {
        this.child.closeModal();
    },

    /**
     * Return the actuator title, which can be an icon,  to be used.
     */
    actuatorTitle() {
        if (this.props.isNew) {
            return 'Add Evidence';
        }
        // If for editing, check if using icon or text.
        if (this.props.useIcon) {
            return <i className="icon icon-pencil"></i>;
        } else {
            return 'Edit';
        }

    },

    /**
     * Check if the actuator should be disabled
     */
    isActuatorDisabled() {
        if (!this.props.evidenceType) {
            return true;
        } else if (this.props.evidenceType.length === 0) {
            return true;
        } else if (this.props.disableActuator === true) {
            return true;
        }
        return false;
    },

    render() {
        const additionalEvidenceFields = this.additionalEvidenceInputFields();
        const modalWrapperClass = "input-inline";
        const bootstrapBtnClass = this.props.useIcon ? "btn " : "btn btn-default ";
        const actuatorClass = this.props.useIcon ? "" : "btn-primary";
        return (
            <ModalComponent 
                    modalTitle={this.title(this.props.evidenceType)}
                    modalClass="modal-default"
                    modalWrapperClass={modalWrapperClass}
                    bootstrapBtnClass={bootstrapBtnClass}
                    onRef={ref => (this.child = ref)}
                    actuatorDisabled={this.isActuatorDisabled()}
                    actuatorTitle={this.actuatorTitle()}
                    actuatorClass={actuatorClass}
                >
                <div className="form-std">
                    <div className="modal-body">
                        <Form submitHandler={this.submitAdditionalEvidenceHandler} formClassName="form-horizontal form-std">
                            {additionalEvidenceFields}
                            {this.renderPMIDResult()}
                            <div className="row">&nbsp;<br />&nbsp;</div>
                            <div className='modal-footer'>
                                <Input type="submit" inputClassName="btn-default btn-inline-spacer btn-primary" title="Next" id="submit" inputDisabled={this.state.isNextDisabled}/>
                                <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancel} title="Cancel" />
                            </div>
                        </Form>
                    </div>
                </div>
            </ModalComponent>
        )
    }
});

module.exports = {
    NewEvidenceModalMetadata: NewEvidenceModalMetadata
};
