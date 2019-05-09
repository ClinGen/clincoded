'use strict';
  
// stdlib
import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';

// third party lib
import { Input } from 'libs/bootstrap/form';
import ModalComponent from 'libs/bootstrap/modal';

/**
 * Modal to confirm before deleting an evidence.
 * Mainly for case segregation tab.
 */
let DeleteEvidenceModal = createReactClass({
    propTypes: {
        row: PropTypes.object,          // Selected evidence row to be deleted
        useIcon: PropTypes.bool,        // Use icon as button title
        deleteEvidence: PropTypes.func  // Function to call to delete the evidence row
    },
    
    handleModalClose() {
        this.child.closeModal();
    },

    cancel() {
        this.handleModalClose();
    },

    /**
     * Confirm button is clicked.  Delete given evidence row
     */
    clickConfirm() {
        this.props.deleteEvidence(this.props.row);
        this.handleModalClose();
    },
    
    render() {
        const title = this.props.useIcon ? <i className="icon icon-trash-o"></i> : "Delete";
        const modalWrapperClass = this.props.useIcon ? "input-inline pull-right" : "";
	    const bootstrapBtnClass = this.props.useIcon ? "btn pull-right" : "btn btn-danger ";
        return (
            <ModalComponent
                    modalTitle="Confirm evidence deletion"
                    modalClass="modal-default"
                    modalWrapperClass={modalWrapperClass}
                    bootstrapBtnClass={bootstrapBtnClass}
                    actuatorTitle={title}
                    onRef={ref => (this.child = ref)}
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
    DeleteEvidenceModal: DeleteEvidenceModal
}
