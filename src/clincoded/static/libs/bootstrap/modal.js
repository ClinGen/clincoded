"use strict";
import React from 'react';
import ReactDOM from 'react-dom';


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


export default class ModalComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = { isModalOpen: false };
    }

    componentDidMount() {
        this.props.onRef(this);
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
        return (
            <div className={this.props.modalWrapperClass}>
                {this.props.actuatorTitle ?
                    <a className={"btn btn-default " + this.props.actuatorClass} onClick={() => this.openModal()}>{this.props.actuatorTitle}</a>
                : null}
                <Modal isOpen={this.state.isModalOpen}>
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
    modalTitle: React.PropTypes.string, // Title in modal's header
    modalClass: React.PropTypes.string, // CSS class for modal header
    modalWrapperClass: React.PropTypes.string, // CSS class for modal DOM wrapper
    actuatorClass: React.PropTypes.string, // CSS class for link/button to invoke modal
    actuatorTitle: React.PropTypes.oneOfType([ // Text for link/button to invoke modal
        React.PropTypes.object,
        React.PropTypes.string
    ]),
    children: React.PropTypes.node // JSX such as input field(s), dropdown(s), buttons
};

class Modal extends React.Component {
    render() {
        if (this.props.isOpen === false) {
            return null;
        }

        return (
            <div className="modal-wrapper">
                <div className="modal" style={{display: 'block'}}>
                    <div className="modal-dialog">
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
