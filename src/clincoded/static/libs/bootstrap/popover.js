"use strict";
import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';


// Display a popover that shows descriptive text content until the user dismisses it.
// The typical format looks like:
//
// <PopOverComponent {...this.props}>
//     // Render JSX...
// </PopOverComponent>
//
// This component has been written in similar way to the rewritten modal component.
//
// <PopOverComponent> usage details:
// See 'PopOverComponent.propTypes' for details


export default class PopOverComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isPopOverOpen: false
        };
        this.handlePopOver = this.handlePopOver.bind(this);
        this.closePopOver = this.closePopOver.bind(this);
    }

    componentDidMount() {
        this.props.popOverRef(this);
    }

    componentWillUnmount() {
        this.props.popOverRef(null);
    }

    // Called by the actuator (link/button to toggle the popover)
    handlePopOver() {
        this.setState({ isPopOverOpen: !this.state.isPopOverOpen });
    }

    // Called by the popover's own Close button defined in the "PopOver" component
    closePopOver() {
        this.setState({ isPopOverOpen: false });
    }

    render() {
        return (
            <div className={'popover-component ' + this.props.popOverWrapperClass}>
                {this.props.actuatorTitle ?
                    <a className="popover-actuator" onClick={() => this.handlePopOver()}>{this.props.actuatorTitle}</a>
                    : null}
                <PopOver isPopOverOpen={this.state.isPopOverOpen} closePopOver={this.closePopOver} popOverStyleClass={this.props.popOverStyleClass}>
                    {this.props.children}
                </PopOver>
            </div>
        );
    }
}

PopOverComponent.propTypes = {
    popOverWrapperClass: PropTypes.string, // CSS class for popover DOM wrapper
    popOverStyleClass: PropTypes.string, // CSS class for popover style (e.g. alert-info, alert-warning)
    actuatorTitle: PropTypes.oneOfType([ // Text for link to invoke popover
        PropTypes.object,
        PropTypes.string
    ]),
    children: PropTypes.node // JSX such as input field(s), dropdown(s), buttons, or text string
};

class PopOver extends React.Component {
    render() {
        if (this.props.isPopOverOpen === false) {
            return null;
        }

        return (
            <div className={'popover-wrapper ' + this.props.popOverStyleClass} style={{display: 'block'}}>
                <a className="closePopOver" aria-label="Close" onClick={this.props.closePopOver}>
                    <span aria-hidden="true"><i className="icon icon-times"></i></span>
                </a>
                <div className="popover-content">
                    {this.props.children}
                </div>
            </div>
        );
    }
}

PopOver.propTypes = {
    closePopOver: PropTypes.func,
    isPopOverOpen: PropTypes.bool,
    popOverStyleClass: PropTypes.string
};