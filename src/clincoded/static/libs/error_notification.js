import React from 'react';
import { toast } from 'react-toastify';

const defaultMessage = <span>Something went wrong! Help us improve your experience by sending an error report to <a href="mailto:clingen-helpdesk@lists.stanford.edu">clingen-helpdesk@lists.stanford.edu</a></span>;
const defaultOptions = {
    type: 'error', // 'default', 'sucess', 'info', 'warning', 'error'
    autoClose: 5000, // How long until the notification dismisses. Default is 5000. Set to false to disable autoClose
    hideProgressBar: true,
    pauseOnHover: true,
    bodyClassName: 'toast-body',
};

/**
 * 
 * @param {string | node} message A string or React element for what to display within the notification
 * @param {object} options https://www.npmjs.com/package/react-toastify/v/4.5.1 to see what the available options are
 */
const showErrorNotification = (message = defaultMessage, options = defaultOptions) => {
    const combinedOptions = Object.assign({}, defaultOptions, options);
    toast(message, combinedOptions);
};

export { showErrorNotification };