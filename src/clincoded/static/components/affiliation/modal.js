'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

class AffiliationModal extends Component {
    render() {
        // Render nothing if the "show" prop is false
        if (!this.props.show) {
            return null;
        }

        return (
            <div className="affiliation-modal-wrapper">
                <div className="affiliation-modal-overlay"></div>
                <div className="affiliation-modal-center">
                    <div className="affiliation-modal-container">
                        <div className="affiliation-modal">
                            {this.props.children}
                            <div className="affiliation-modal-footer">
                                {this.props.hasCancelButton ?
                                    <button onClick={this.props.onCancel} className="btn btn-default btn-inline-spacer">Cancel</button>
                                    : null}
                                <button onClick={this.props.onClose} disabled={this.props.buttonDisabled} className="btn btn-primary btn-inline-spacer pull-right">Continue</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

AffiliationModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onCancel: PropTypes.func,
    show: PropTypes.bool,
    children: PropTypes.node,
    buttonDisabled: PropTypes.bool,
    hasCancelButton: PropTypes.bool
};

export default AffiliationModal;