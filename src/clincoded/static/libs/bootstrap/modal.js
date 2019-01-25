"use strict";
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';


// Display a modal dialog box that blocks all other page input until the user dismisses it. The
// typical format looks like:
//
// <ModalComponent {...this.props}>
//     // Render JSX...
// </ModalComponent>
//
// This component has been rewritten due to the React v15.4.0 upgrade from v0.14.8.
// The previous modal component used MixIn that resulted in the use of non-standard DOM attribute
// when implementing the modal component along with the actuator (link/button to invoke the modal).
// 'Unknown props warnings' are now flagged in React v15.4.0:
// https://facebook.github.io/react/warnings/unknown-prop.html
//
// <ModalComponent> usage details:
// See 'ModalComponent.propTypes' for details


export default class ModalComponent extends Component {
    constructor(props) {
        super(props);
        this.state = { isModalOpen: false };
    }

    componentDidMount() {
        this.props.onRef(this);
        if (this.props.modalOpen === true) {
            this.openModal();
        }
    }

    componentWillUnmount() {
        this.props.onRef(null);
    }

    // Called by the actuator (link/button to invoke the modal)
    openModal() {
        this.setState({ isModalOpen: true });

        // Add class to body element to make modal-backdrop div visible
        document.body.classList.add('modal-open');
    }

    // Called by the modal's Cancel' button defined in the parent component
    closeModal() {
        this.setState({ isModalOpen: false });

        // Remove class from body element to make modal-backdrop div visible
        document.body.classList.remove('modal-open');
    }

    render() {
        const disabled = this.props.actuatorDisabled ? true : false;
        const className = this.props.bootstrapBtnClass ? this.props.bootstrapBtnClass + this.props.actuatorClass : "btn btn-default " + this.props.actuatorClass;
        return (
            <div className={this.props.modalWrapperClass}>
                {this.props.actuatorTitle ?
                    <a  className={className}
                        onClick={() => this.openModal()}
                        disabled={disabled}
                        >
                        {this.props.actuatorTitle}
                    </a>
                : null}
                <Modal isOpen={this.state.isModalOpen} modalWidthPct={this.props.modalWidthPct}>
                    {this.props.modalTitle ?
                        <div className={"modal-header " + this.props.modalClass}>
                            <h4 className="modal-title">{this.props.modalTitle}</h4>
                        </div>
                    : null}
                    {this.props.children}
                </Modal>
            </div>
        );
    }
}

ModalComponent.propTypes = {
    modalTitle: PropTypes.string, // Title in modal's header
    modalClass: PropTypes.string, // CSS class for modal header
    modalWidthPct: PropTypes.number, // Percentage width of screen, e.g. `90` for 90% width
    modalWrapperClass: PropTypes.string, // CSS class for modal DOM wrapper
    bootstrapBtnClass: PropTypes.string, // Bootstrap class for button (e.g. btn-default, btn-primary)
    actuatorClass: PropTypes.string, // CSS class for link/button to invoke modal
    actuatorDisabled: PropTypes.bool,  // If the link/button is disabled
    actuatorTitle: PropTypes.oneOfType([ // Text for link/button to invoke modal
        PropTypes.object,
        PropTypes.string
    ]),
    children: PropTypes.node // JSX such as input field(s), dropdown(s), buttons
};

export class Modal extends Component {
    render() {
        if (this.props.isOpen === false) {
            return null;
        }
        let style = {};
        if (this.props.modalWidthPct) {
            style['width'] = `${this.props.modalWidthPct}%`;
        }

        return (
            <div className="modal-wrapper">
                <div className="modal" style={{display: 'block'}}>
                    <div className="modal-dialog" style={style}>
                        <div className="modal-content">
                            {this.props.children}
                        </div>
                    </div>
                </div>
                <div className="modal-backdrop in"></div>
            </div>
        );
    }
}
