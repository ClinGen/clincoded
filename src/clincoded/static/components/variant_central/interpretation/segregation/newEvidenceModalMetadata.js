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
 
let NewEvidenceModalMetadata = createReactClass({
    mixins: [FormMixin, RestMixin],
    propTypes: {
        data: PropTypes.object,
        evidenceType: PropTypes.string,
        metadataDone: PropTypes.func,
        isNew: PropTypes.bool
    },
    getInitialState() {
        return {
            loadNextModal: false,
            data: this.props.data,
            pmidResult: null
        };
    },

    title(evidenceType) {
        if (evidenceType && evidenceType in extraEvidence.typeMapping) {
            return `Add ${extraEvidence.typeMapping[evidenceType]['name']} Evidence`;
        }
        return null;
    },

    additionalEvidenceInputFields() {
        let key = this.props.evidenceType;
        if (key && key in extraEvidence.typeMapping) {
            let nodes = [];
            extraEvidence.typeMapping[key]['fields'].forEach(pair => {
                    let node = [<div key={pair['name']}>
                            <Input 
                                type="text"
                                label={pair['description']}
                                id={pair['name']}
                                name={pair['name']}
                                handleChange={this.handleAdditionalEvidenceInputChange}
                                value = { this.getInputValue(pair.name) }
                                ref={pair['name']}
                                required
                            />
                        </div>];
                    if (key === 'PMID') {
                        node.push(<Input
                                type="button"
                                inputClassName="btn-default btn-inline-spacer pull-right"
                                clickHandler={this.searchPMID}
                                title="Preview PubMed Article"
                            />);
                    }
                    nodes.push(node);
                }
            );
            return nodes;
        } else {
            return null;
        }
    },

    getInputValue(name) {
        if (this.props.isNew) {
            return '';
        }
        return this.props.data[name];
    },

    searchPMID() {
        this.saveAllFormValues();
        let formValues = this.getAllFormValues();
        let pmid = formValues['pmid'];

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
                        pmidResult: 'error'
                    });
                }
            });
        }).catch(e => {
            // error handling for PubMed query
            console.error(e);
        });
    },

    handleAdditionalEvidenceInputChange(ref, event) {
        this.setState({
            errorMsg: ''
        });
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
            pmidResult: null
        });
        this.props.metadataDone(true, formValues);
    },

    renderPMIDResult() {
        if (!this.state.pmidResult) {
            return null;
        } 
        return <div>
                    <span className="col-sm-10 col-sm-offset-1">
                        <PmidSummary
                            article={this.state.pmidResult}
                            displayJournal
                            pmidLinkout
                        />
                    </span>
                </div>
    },

    cancel() {
        this.props.metadataDone(false, null);
        this.handleModalClose();
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
        } else if (this.props.evidenceType.length == 0) {
            return true;
        }
        return false;
    },

    render() {
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
                                {this.additionalEvidenceInputFields()}
                                {this.renderPMIDResult()}
                                <div className="row">&nbsp;<br />&nbsp;</div>
                                <div className='modal-footer'>
                                    <Input type="submit" inputClassName="btn-default btn-inline-spacer" title="Next" id="submit"/>
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
