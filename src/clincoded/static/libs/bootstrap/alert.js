'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

const AlertMessage = ({visible, message, type, customClasses}) => {
    let defaultClasses = 'feedback-message alert';
    // Config visibility class
    let visibilityClass = 'isHidden';
    if (visible) {
        visibilityClass = 'isVisible';
    } else {
        visibilityClass = 'isHidden';
    }

    let componentClasses = [defaultClasses, type, visibilityClass, customClasses];

    return (
        <div className={componentClasses.join(' ')}>
            <span className="feedback-message-text">{message}</span>
        </div>
    );
};

AlertMessage.propTypes = {
    visible: PropTypes.bool.isRequired,
    type: PropTypes.string, // 'alert-success', 'alert-info', alert-warning', 'alert-danger'
    message: PropTypes.oneOfType([
        PropTypes.object,
        PropTypes.string
    ]),
    customClasses: PropTypes.string
};

export default AlertMessage;
