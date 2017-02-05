"use strict";
import React from 'react';
import ReactDOM from 'react-dom';

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

    openModal() {
        this.setState({ isModalOpen: true });

        // Add class to body element to make modal-backdrop div visible
        document.body.classList.add('modal-open');
    }

    closeModal() {
        this.setState({ isModalOpen: false });

        // Remove class from body element to make modal-backdrop div visible
        document.body.classList.remove('modal-open');
    }

    render() {
        return (
            <div className={this.props.modalWrapperClass}>
                <a className={"btn btn-default " + this.props.actuatorClass} onClick={() => this.openModal()}>{this.props.actuatorTitle}</a>
                <Modal isOpen={this.state.isModalOpen}>
                    <div className={"modal-header " + this.props.modalClass}>
                        <h4 className="modal-title">{this.props.modalTitle}</h4>
                    </div>
                    {this.props.children}
                </Modal>
            </div>
        );
    }
}

ModalComponent.propTypes = {
    modalTitle: React.PropTypes.string.isRequired, // Title in modal's header
    modalClass: React.PropTypes.string, // CSS class for modal header
    modalWrapperClass: React.PropTypes.string,
    actuatorClass: React.PropTypes.string,
    actuatorTitle: React.PropTypes.string,
    children: React.PropTypes.node
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
