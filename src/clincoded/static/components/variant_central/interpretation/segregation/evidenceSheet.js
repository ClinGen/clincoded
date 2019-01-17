'use strict';

// stdlib
import React from 'react';
import PropTypes from 'prop-types';;
import createReactClass from 'create-react-class';

// third-party lib
import ModalComponent from 'libs/bootstrap/modal';
import { Form, FormMixin, Input } from 'libs/bootstrap/form';

// Internal lib
import { extraEvidence } from 'components/variant_central/interpretation/segregation/segregationData';

let EvidenceSheet = createReactClass({
    mixins: [FormMixin],

    propTypes: {
        evidenceCollectionDone: PropTypes.func,
        ready: PropTypes.bool
    },

    getInitialState: function() {
        return {

        };
    },

    handleModalClose() {
        this.child.closeModal();
    },

    cancel() {
        this.props.evidenceCollectionDone(false, null);
        this.handleModalClose();
    },

    submitNewEvidence(e) {
        e.preventDefault();
        e.stopPropagation();

        this.saveAllFormValues();
        const formValues = this.getAllFormValues();
        this.handleModalClose();
        this.props.evidenceCollectionDone(true, formValues);
    },

    inputs() {
        let i = 0;
        return extraEvidence.evidenceInputs.map(inpt => 
            <div key = {i++}>
                <Input
                    type = {inpt.kind}
                    label = {inpt.label}
                    name = {inpt.name}
                    ref = {inpt.name}
                />
            </div>
            );
    },

    render() {
        return  <ModalComponent
            modalTitle="Add Evidence Details"
            modalClass="modal-default"
            modalWrapperClass="input-inline add-resource-id-modal"
            onRef={ref => (this.child = ref)}
            disabled={!this.props.ready}
            modalOpen={this.props.ready}
        >
        <div className="form-std">
            <div className="modal-body">
                <Form submitHandler={this.submitNewEvidence} formClassName="form-horizontal form-std">
                {this.inputs()}
                <div className="row">&nbsp;<br />&nbsp;</div>
                <div className='modal-footer'>
                    <Input type="submit" inputClassName="btn-default btn-inline-spacer" title="Submit" id="submit" />
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancel} title="Cancel" />
                </div>
                </Form>
            </div>
        </div>
        </ModalComponent>
    }
});

module.exports = {
    EvidenceSheet: EvidenceSheet
};
