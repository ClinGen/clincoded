// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

// shared lib
import { Form, FormMixin, Input } from 'libs/bootstrap/form';
import ModalComponent from 'libs/bootstrap/modal';

// Internal lib
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';
 
let NewEvidenceModalMetadata = createReactClass({
    mixins: [FormMixin],
    propTypes: {
        data: PropTypes.object,
        evidenceType: PropTypes.string,
        metadataDone: PropTypes.func,
        isNew: PropTypes.bool
    },
    getInitialState() {
        return {
            loadNextModal: false,
            data: this.props.data
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
            return extraEvidence.typeMapping[key]['fields'].map(pair => 
                <div key={pair['name']}>
                    <Input 
                        type="text"
                        label={pair['description']}
                        id={pair['name']}
                        name={pair['name']}
                        handleChange={this.handleAdditionalEvidenceInputChange}
                        value={this.props.isNew ? '' : this.state.data[pair['name']]}
                        ref={pair['name']}
                        required
                    />
                </div>
            )
        } else {
            return null;
        }
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
        this.props.metadataDone(true, formValues);
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
