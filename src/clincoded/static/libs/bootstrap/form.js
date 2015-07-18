"use strict";
// Use this module when you have a form with input fields and an optional submit button.
// It supplies an Input component used for all types of form fields (e.g. text fields,
// drop-downs, etc.). The component that includes the form must also include the InputMixin
// mixin that handles standard form things like saving and retrieving form values, and
// handling validation errors.

var React = require('react/addons');
var _ = require('underscore');


// Surround Input elements with the Form element
var Form = module.exports.Form = React.createClass({
    render: function() {
        // Before rendering, copy any refs on any elements in the form to each element's id property
        var children = this.props.children;
        return (
            <form onSubmit={this.props.submitHandler} className={this.props.formClassName}>
                {children}
            </form>
        );
    }
});


var FormMixin = module.exports.FormMixin = {
    formValues: {},

    // Do not call; called by React.
    getInitialState: function() {
        return {formErrors: {}};
    },

    // Retrieves the saved value of the Input with the given 'ref' value. setFormValue
    // must already have been called with this Input's value.
    getFormValue: function(ref) {
        return this.formValues[ref];
    },

    // Normally used after the submit button is clicked. Call this to save the value
    // from the Input with the given 'ref' value and the value itself. This does
    // NOT modify the form input values; it just saves them for later processing.
    setFormValue: function(ref, value) {
        this.formValues[ref] = value;
    },

    // Get the saved form error for the Input with the given 'ref' value.
    getFormError: function(ref) {
        return this.state.formErrors[ref];
    },

    // Save a form error for the given Input's 'ref' value for later retrieval with getFormError.
    // The message that should be displayed to the user is passed in 'msg'.
    setFormErrors: function(ref, msg) {
        var formErrors = this.state.formErrors;
        formErrors[ref] = msg;
        this.setState({formErrors: formErrors});
    },

    // Clear error state from the Input with the given 'ref' value. This should be passed to
    // Input components in the 'clearError' property so that it can be called when an Input's
    // value changes.
    clrFormErrors: function(ref) {
        var errors = this.state.formErrors;
        errors[ref] = '';
        this.setState({formErrors: errors});
    },

    // Do form validation on the required fields. Each field checked must have a unique ref,
    // and the boolean 'required' field set if it's required. All the Input's values must
    // already have been collected with setFormValue. Returns true if all required fields
    // have values, or false if any do not. It also sets any empty required Inputs error
    // to the 'Required' message so it's displayed on the next render.
    validateRequired: function() {
        var valid = true;
        Object.keys(this.refs).forEach(ref => {
            if (this.refs[ref].props.required && !this.getFormValue(ref)) {
                // Required field has no value. Set error state to render
                // error, and remember to return false.
                this.setFormErrors(ref, 'Required');
                valid = false;
            }
        });
        return valid;
    }
};


// Handles most form inputs, like text fields and dropdowns. The different Bootstrap styles of
// inputs can be handled through the labelClassName, groupClassName, and wrapperClassName properties.
var Input = module.exports.Input = React.createClass({
    propTypes: {
        type: React.PropTypes.string.isRequired, // Type of input
        label: React.PropTypes.oneOfType([
            React.PropTypes.string,
            React.PropTypes.object
        ]), // <label> for input; string or another React component
        placeholder: React.PropTypes.string, // <input> placeholder text
        error: React.PropTypes.string, // Error message to display below input
        labelClassName: React.PropTypes.string, // CSS classes to add to labels
        groupClassName: React.PropTypes.string, // CSS classes to add to control groups (label/input wrapper div)
        wrapperClassName: React.PropTypes.string, // CSS classes to add to wrapper div around inputs
        inputClassName: React.PropTypes.string, // CSS classes to add to input elements themselves
        rows: React.PropTypes.string, // Number of rows in textarea
        value: React.PropTypes.string, // Value to pre-fill input with
        defaultValue: React.PropTypes.string, // Default value for <select>
        required: React.PropTypes.bool, // T to make this a required field
        cancelHandler: React.PropTypes.func // Called to handle cancel button click
    },

    // Get the text the user entered from the text-type field. Meant to be called from
    // parent components.
    getValue: function() {
        return this.refs.input.getDOMNode().value;
    },

    // Get the selected option from a <select> list
    getSelectedOption: function() {
        var optionNodes = this.refs.input.getDOMNode().getElementsByTagName('option');

        // Get the DOM node for the selected <option>
        var selectedOptionNode = _(optionNodes).find(function(option) {
            return option.selected;
        });

        // Get the selected options value, or its text if it has no value
        if (selectedOptionNode) {
            return selectedOptionNode.getAttribute('value') || selectedOptionNode.innerHtml;
        }

        // Nothing selected
        return '';
    },

    render: function() {
        var input, inputClasses;
        var groupClassName = 'form-group' + this.props.groupClassName ? ' ' + this.props.groupClassName : '';

        switch (this.props.type) {
            case 'text':
            case 'email':
                inputClasses = 'form-control' + (this.props.error ? ' error' : '') + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                var innerInput = (
                    <span>
                        <input className={inputClasses} type={this.props.type} id={this.props.id} name={this.props.id} placeholder={this.props.placeholder} ref="input" value={this.props.value} onChange={this.props.clearError} />
                        <div className="form-error">{this.props.error ? <span>{this.props.error}</span> : <span>&nbsp;</span>}</div>
                    </span>
                );
                input = (
                    <div className={this.props.groupClassName}>
                        {this.props.label ? <label htmlFor={this.props.id} className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                        {this.props.wrapperClassName ? <div className={this.props.wrapperClassName}>{innerInput}</div> : <span>{innerInput}</span>}
                    </div>
                );
                break;

            case 'select':
                input = (
                    <div className={this.props.groupClassName}>
                        {this.props.label ? <label htmlFor={this.props.id} className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                        <div className={this.props.wrapperClassName}>
                            <select className="form-control" ref="input" onChange={this.props.clearError} defaultValue={this.props.defaultValue}>
                                {this.props.children}
                            </select>
                            <div className="form-error">{this.props.error ? <span>{this.props.error}</span> : <span>&nbsp;</span>}</div>
                        </div>
                    </div>
                );
                break;

            case 'textarea':
                inputClasses = 'form-control' + (this.props.error ? ' error' : '') + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                input = (
                    <div className={this.props.groupClassName}>
                        {this.props.label ? <label htmlFor={this.props.id} className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                        <div className={this.props.wrapperClassName}>
                            <textarea className={inputClasses} id={this.props.id} name={this.props.id} ref="input" value={this.props.value} onChange={this.props.clearError} rows={this.props.rows} />
                            <div className="form-error">{this.props.error ? <span>{this.props.error}</span> : <span>&nbsp;</span>}</div>
                        </div>
                    </div>
                );
                break;

            case 'text-range':
                input = (
                    <div className={this.props.groupClassName}>
                        {this.props.label ? <label className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                        <div className={this.props.wrapperClassName}>
                            {this.props.children}
                        </div>
                    </div>
                );
                break;

            case 'submit':
                var title = this.props.title ? this.props.title : 'Submit';
                inputClasses = 'btn' + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                input = (
                    <input className={inputClasses} type={this.props.type} value={title} onClick={this.props.submitHandler} />
                );
                break;

            case 'cancel':
                title = this.props.title ? this.props.title : 'Cancel';
                inputClasses = 'btn' + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                input = (
                    <button className={inputClasses} onClick={this.props.cancelHandler}>{title}</button>
                );
                break;

            default:
                break;
        }

        return <span>{input}</span>;
    }
});
