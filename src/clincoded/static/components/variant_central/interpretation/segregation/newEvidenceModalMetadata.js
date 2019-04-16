// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

// shared lib
import { Form, FormMixin, Input } from 'libs/bootstrap/form';
import ModalComponent from 'libs/bootstrap/modal';
import { parsePubmed } from 'libs/parse-pubmed';

// Internal lib
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';

import { RestMixin } from 'components/rest';
import { external_url_map } from 'components/globals';
import { PmidSummary } from 'components/curator';
import { ContextualHelp } from 'libs/bootstrap/contextual_help';

let NewEvidenceModalMetadata = createReactClass({
    mixins: [FormMixin, RestMixin],
    propTypes: {
        data: PropTypes.object,
        evidenceType: PropTypes.string,
        metadataDone: PropTypes.func,
        isNew: PropTypes.bool,
        disableActuator: PropTypes.bool
    },
    getInitialState() {
        return {
            loadNextModal: false,
            data: this.props.data,
            pmidResult: null,
            pmidLookupBusy: false,
            isNextDisabled: this.props.isNew ? true : false
        };
    },

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

    handleChange(ref, e) {
        // ref is the name, since that's how we defined it
        let data = this.state.data;
        data[ref] = e.target.value;
        let disabled = false;

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

        this.setState({
            isNextDisabled: disabled,
            data: data
        });
    },

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
                let node = [<div key={obj['name']}>
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
                            inputClassName = "btn-default btn-inline-spacer pull-right"
                            clickHandler = {this.searchPMID}
                            title = "Preview PubMed Article"
                            submitBusy = {this.state.pmidLookupBusy}
                            inputDisabled = {this.state.isNextDisabled}
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

    getInputValue(name) {
        if (!this.props.isNew && this.props.data) {
            return this.props.data[name];
        }
        return '';
    },

    searchPMID(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.saveAllFormValues();
        let formValues = this.getAllFormValues();
        let pmid = formValues['pmid'];
        if (pmid) {
            this.setState({
                pmidLookupBusy: true
            }, () => {
                const id = pmid.replace(/^PMID\s*:\s*(\S*)$/i, '$1');
                this.getRestData('/articles/' + id).then(article => {
                    // article already exists in db
                    this.setState({
                        pmidResult: article
                    });
                }, () => {
                    // PubMed article not in our DB; go out to PubMed itself to retrieve it as XML
                    this.getRestDataXml(external_url_map['PubMedSearch'] + id).then(xml => {
                        var data = parsePubmed(xml);
                        if (data.pmid) {
                            // found the result we want
                            this.setState({
                                pmidResult: data
                            });
                        } else {
                            // no result from ClinVar
                            this.setState({
                                pmidResult: {}
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
            });
        }
        else {
            this.setFormErrors('resourceId', 'Please enter a PMID');
        }
    },

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

    actuatorTitle() {
        if (this.props.isNew) {
            return 'Add Evidence';
        }
        return 'Edit';
    },

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
        return (
            <div>
                <ModalComponent 
                        modalTitle={this.title(this.props.evidenceType)}
                        modalClass="modal-default"
                        modalWrapperClass="input-inline add-resource-id-modal"
                        onRef={ref => (this.child = ref)}
                        actuatorDisabled={this.isActuatorDisabled()}
                        actuatorTitle={this.actuatorTitle()}
                        actuatorClass="btn btn-default btn-primary"
                    >
                    <div className="form-std">
                        <div className="modal-body">
                            <Form submitHandler={this.submitAdditionalEvidenceHandler} formClassName="form-horizontal form-std">
                                {additionalEvidenceFields}
                                {this.renderPMIDResult()}
                                <div className="row">&nbsp;<br />&nbsp;</div>
                                <div className='modal-footer'>
                                    <Input type="submit" inputClassName="btn-default btn-inline-spacer" title="Next" id="submit" inputDisabled={this.state.isNextDisabled}/>
                                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancel} title="Cancel" />
                                </div>
                            </Form>
                        </div>
                    </div>
                </ModalComponent>
            </div>
        )
    }
});

module.exports = {
    NewEvidenceModalMetadata: NewEvidenceModalMetadata
};
