'use strict';

// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

// third party lib
import { Input } from '../../../../libs/bootstrap/form';
import ModalComponent from '../../../../libs/bootstrap/modal';

/**
 * Modal to confirm before deleting an evidence.
 */

let ConfirmDelete = createReactClass({
    propTypes: {
        evidence: PropTypes.object,     // Selected evidence row to be deleted
        deleteEvidence: PropTypes.func  // Function to call to delete the evidence row
    },

    handleModalClose() {
        this.confirm.closeModal();
    },

    cancel() {
        this.handleModalClose();
    },

    clickConfirm() {
        this.props.deleteEvidence(this.props.evidence);
        this.handleModalClose();
    },

    render() {
        return (
            <ModalComponent
                    modalTitle="Confirm evidence deletion"
                    modalClass="modal-default"
                    modalWrapperClass="confirm-interpretation-delete-evidence pull-right"
                    bootstrapBtnClass="btn btn-danger "
                    actuatorClass="interpretation-delete-evidence-btn"
                    actuatorTitle="Delete"
                    onRef={ref => (this.confirm = ref)}
                >
                <div>
                    <div className="modal-body">
                        <p>
                            Are you sure you want to delete this evidence?
                        </p>
                    </div>
                    <div className='modal-footer'>
                        <Input type="button" inputClassName="btn-primary btn-inline-spacer" clickHandler={this.clickConfirm} title="Confirm" />
                        <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancel} title="Cancel" />
                    </div>
                </div>
            </ModalComponent>
        );
    }
});

module.exports = {
    ConfirmDelete: ConfirmDelete
}

