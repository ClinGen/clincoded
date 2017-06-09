// Use this module when you have a form with input fields and an optional submit button.
// It supplies an Input component used for all types of form fields (e.g. text fields,
// drop-downs, etc.).

"use strict";
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

var _ = require('underscore');

var FormComponent = module.exports.FormComponent = React.createClass({
    formValues: {},

    // Do not call; called by React.
    getInitialState() {
        this.formValues = {};
        return {
            formErrors: {},
            isValid: true
        };
    },

    // Create a map of traversed inputs and register inputs from the children
    componentWillMount() {
        this.formValues = {};
        this.inputs = {};
        this.registerInputs(this.props.children);
    },

    // Add 'id' property to any Input elements. Make it a copy of the Input's ref. Run through all children
    // of the form, and any children of those children, recursively.
    registerInputs(children) {
        let processedChildren = React.Children.map(children, child => {
            if (child) {
                let props = {};

                if (child.ref) {
                    // Copy ref to new id property.
                    props.id = child.ref;
                    // Attach a method for the input to register itself to the form
                    props.attachToForm = this.attachToForm;
                    // Attach a method for the input to detach itself from the form
                    props.detachFromForm = this.detachFromForm;

                    props.getFormError = this.getFormError;
                    props.clrFormErrors = this.clrFormErrors;
                    props.validateDefault = this.validateDefault;
                }

                // If the current child has children, process them recursively and assign the result to the new children property
                if (child.props && child.props.children) {
                    props.children = this.registerInputs(child.props.children);
                }

                // If we made new properties, clone the child and assign the properties to the clone
                return Object.keys(props).length ? React.cloneElement(child, props) : child;
            }
            return null;

        });
        return processedChildren;
    },

    // All methods defined are bound to the component by React JS, so it is safe to use "this"
    // even though we did not bind it. Add the input component to our inputs map.
    attachToForm: function (component) {
        this.inputs[component.ref] = component;

        // We add the value from the component to our model, using the
        // name of the component as the key. This ensures that we
        // grab the initial value of the input
        this.formValues[component.ref] = component.state.value;
    },

    // Remove the input component from the inputs map
    detachFromForm: function (component) {
        delete this.inputs[component.ref];

        // We of course have to delete the model property
        // if the component is removed
        delete this.formValues[component.ref];
    },

    // Retrieves the saved value of the Input with the given 'ref' value. saveFormValue
    // must already have been called with this Input's value.
    getFormValue(ref) {
        return this.formValues[ref];
    },

    // Retrieves the saved value of the Input with the given 'ref' value, and the Input
    // value must be numeric. If the Input had no entered value at all, the empty string is
    // returned. If the Input had an entered value but it wasn't numeric, null is returned.
    // If the Input had a proper numberic value, a Javascript 'number' type is returned
    // with the entered value.
    getFormValueNumber(ref) {
        var value = this.getFormValue(ref);
        if (value) {
            var numericValue = value.match(/^\s*(\d*)\s*$/);
            if (numericValue) {
                return parseInt(numericValue[1], 10);
            }
            return null;
        }
        return '';
    },

    // Normally used after the submit button is clicked. Call this to save the value
    // from the Input with the given 'ref' value and the value itself. This does
    // NOT modify the form input values; it just saves them for later processing.
    saveFormValue(ref, value) {
        this.formValues[ref] = value;
    },

    // Call this to avoid calling 'saveFormValue' for every form item. It goes through all the
    // form items with refs (should be all of them) and saves a formValue property with the
    // corresponding value from the DOM.
    saveAllFormValues() {
        if (this.refs && Object.keys(this.refs).length) {
            Object.keys(this.refs).map(ref => {
                this.saveFormValue(ref, this.refs[ref].getValue());
            });
        }
    },

    resetAllFormValues() {
        if (this.refs && Object.keys(this.refs).length) {
            Object.keys(this.refs).map(ref => {
                this.refs[ref].resetValue();
            });
        }
        this.formValues = {};
    },

    // Get the saved form error for the Input with the given 'ref' value.
    getFormError(ref) {
        return this.state.formErrors[ref];
    },

    // Save a form error for the given Input's 'ref' value for later retrieval with getFormError.
    // The message that should be displayed to the user is passed in 'msg'.
    setFormErrors(ref, msg) {
        var formErrors = this.state.formErrors;
        formErrors[ref] = msg;
        this.setState({formErrors: formErrors});
    },

    // Clear error state from the Input with the given 'ref' value. This should be passed to
    // Input components in the 'clearError' property so that it can be called when an Input's
    // value changes.
    clrFormErrors(ref) {
        var errors = this.state.formErrors;
        errors[ref] = '';
        this.setState({formErrors: errors});
    },

    // Clear errors at multiple Inputs at the same time
    // When data entered in one Input, error messages in all related Inputs will be cleared.
    clrMultiFormErrors(refs) {
        var errors = this.state.formErrors;
        refs.forEach(function(ref){
            errors[ref] = '';
        });
        this.setState({formErrors: errors});
    },

    // clears errors form all form inputs
    clrAllFormErrors() {
        var errors = this.state.formErrors;
        if (this.refs && Object.keys(this.refs).length) {
            Object.keys(this.refs).map(ref => {
                errors[ref] = '';
            });
        }
        this.setState({formErrors: errors});
    },

    // Return true if the form's current state shows any Input errors. Return false if no
    // errors are indicated. This should be called in the render function so that the submit
    // form function will have had a chance to record any errors.
    anyFormErrors() {
        var formErrors = Object.keys(this.state.formErrors);

        if (formErrors.length) {
            return _(formErrors).any(errKey => {
                return this.state.formErrors[errKey];
            });
        }
        return false;
    },

    // Do form validation on the required fields. Each field checked must have a unique ref,
    // and the boolean 'required' field set if it's required. All the Input's values must
    // already have been collected with saveFormValue. Returns true if all required fields
    // have values, or false if any do not. It also sets any empty required Inputs error
    // to the 'Required' message so it's displayed on the next render.
    validateDefault(component) {
        if (!component.props.validations) {
            return;
        }
        let valid = true;
        var props = component.props;
        var val = this.getFormValue(component);
        val = (props.type === 'select' && val === 'none') ? null : val;
        if (props.required && !val) {
            // Required field has no value. Set error state to render
            // error, and remember to return false.
            this.setFormErrors(component, 'Required');
            valid = false;
        } else if (props.type === 'number') {
            // Validate that type="number" fields have a valid number in them
            var numVal = this.getFormValueNumber(component);
            if (numVal === null) {
                if (props.inputClassName && props.inputClassName === 'integer-only') {
                    this.setFormErrors(component, 'Non-decimal values only');
                    valid = false;
                } else if (!this.getFormValue(component).match(/^\d+\.\d+$/)) {
                    this.setFormErrors(component, 'Number only');
                    valid = false;
                }
            } else if (numVal !== '' && ((props.minVal && numVal < props.minVal) || (props.maxVal && numVal > props.maxVal))) {
                valid = false;
                if (props.minVal && props.maxVal) {
                    this.setFormErrors(component, 'The range of allowed values is ' + props.minVal + ' to ' + props.maxVal);
                } else if (props.minVal) {
                    this.setFormErrors(component, 'The minimum allowed value is ' + props.minVal);
                } else {
                    this.setFormErrors(component, 'The maximum allowed value is ' + props.maxVal);
                }
            }
        }
        component.setState({isValid: valid});
    },

    submit(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.state.isValid) {
            this.props.submitHandler();
        }
    },

    render() {
        // Before rendering, copy any refs on any elements in the form to each element's id property
        var children = this.registerInputs(this.props.children);
        return (
            <form onSubmit={this.submit} className={this.props.formClassName}>
                {children}
            </form>
        );
    }
});


// Handles most form inputs, like text fields and dropdowns. The different Bootstrap styles of
// inputs can be handled through the labelClassName, groupClassName, and wrapperClassName properties.
var InputComponent = module.exports.InputComponent = React.createClass({
    propTypes: {
        type: PropTypes.string.isRequired, // Type of input
        label: PropTypes.oneOfType([ // <label> for input; string or another React component
            PropTypes.string,
            PropTypes.object
        ]),
        placeholder: PropTypes.string, // <input> placeholder text
        maxLength: PropTypes.string, // maxlength for labels
        error: PropTypes.string, // Error message to display below input
        labelClassName: PropTypes.string, // CSS classes to add to labels
        groupClassName: PropTypes.string, // CSS classes to add to control groups (label/input wrapper div)
        wrapperClassName: PropTypes.string, // CSS classes to add to wrapper div around inputs
        inputClassName: PropTypes.string, // CSS classes to add to input elements themselves
        rows: PropTypes.string, // Number of rows in textarea
        value: PropTypes.oneOfType([ // Value to pre-fill input with
            PropTypes.string,
            PropTypes.number
        ]),
        defaultValue: PropTypes.string, // Default value for <select>
        required: PropTypes.bool, // T to make this a required field
        clickHandler: PropTypes.func, // Called to handle button click
        submitHandler: PropTypes.func, // Called to handle submit button click
        cancelHandler: PropTypes.func, // Called to handle cancel button click
        submitBusy: PropTypes.bool, //
        onBlur: PropTypes.func,
        minVal: PropTypes.number, // Minimum value for a number formatted input
        maxVal: PropTypes.number // Maximum value for a number formatted input
    },

    getInitialState: function() {
        return {
            value: this.props.value || ''
        };
    },

    componentWillMount: function () {
        this.props.attachToForm(this); // Attaching the component to the form
    },

    componentWillUnmount: function () {
        this.props.detachFromForm(this); // Detaching if unmounting
    },

    // Get the text the user entered from the text-type field. Meant to be called from
    // parent components.
    getValue: function() {
        if (this.props.type === 'text' || this.props.type === 'email' || this.props.type === 'number' || this.props.type === 'textarea') {
            return ReactDOM.findDOMNode(this.refs.input).value.trim();
        } else if (this.props.type === 'select') {
            return this.getSelectedOption().trim();
        } else if (this.props.type === 'checkbox') {
            return this.props.checked;
        }
    },

    // Toggles value for checkboxes
    toggleValue: function() {
        if (this.props.type === 'checkbox') {
            if (this.props.checked === true) {
                return false;
            }
            else {
                return true;
            }
        }
    },

    // Set the value of an input
    setValue: function(val) {
        if (this.props.type === 'text' || this.props.type === 'email' || this.props.type === 'textarea' || this.props.type === 'number') {
            ReactDOM.findDOMNode(this.refs.input).value = val;
            this.setState({value: val}, () => {this.props.validateDefault(this);});
        } else if (this.props.type === 'select') {
            this.setSelectedOption(val);
        } else if (this.props.type === 'checkbox') {
            ReactDOM.findDOMNode(this.refs.input).checked = val;
            this.setState({value: val}, () => {this.props.validateDefault(this);});
        }
    },

    resetValue: function() {
        if (this.props.type === 'text' || this.props.type === 'email' || this.props.type === 'textarea') {
            ReactDOM.findDOMNode(this.refs.input).value = '';
        } else if (this.props.type === 'select') {
            this.resetSelectedOption();
        } else if (this.props.type === 'checkbox') {
            this.resetSelectedCheckbox();
        }
    },

    // Reset <select> to default option
    resetSelectedOption: function() {
        var selectNode = this.refs.input;
        var optionNodes = selectNode.getElementsByTagName('option');
        if (optionNodes && optionNodes.length) {
            selectNode.value = optionNodes[0].value;
        }
    },

    // Reset checkbox
    resetSelectedCheckbox: function() {
        var selectNode = this.refs.input;
        selectNode.checked = false;
    },

    setSelectedOption: function(val) {
        var select = this.refs.input;
        select.value = val;
    },

    // Get the selected option from a <select> list
    getSelectedOption: function() {
        var optionNodes = this.refs.input.getElementsByTagName('option');

        // Get the DOM node for the selected <option>
        var selectedOptionNode = _(optionNodes).find(function(option) {
            return option.selected;
        });

        // Get the selected options value, or its text if it has no value
        if (selectedOptionNode) {
            var valAttr = selectedOptionNode.getAttribute('value');
            return valAttr === null ? selectedOptionNode.innerHTML : valAttr;
        }

        // Nothing selected
        return '';
    },

    // Called when any input's value changes from user input
    handleChange(ref, e) {
        this.setState({value: e.target.value});
        if (this.props.getFormError(ref)) {
            this.props.clrFormErrors(ref);
        }
        if (this.props.handleChange) {
            this.props.handleChange(ref, e);
        }
    },

    render: function() {
        var input, inputClasses, title;
        var groupClassName = 'form-group' + this.props.groupClassName ? ' ' + this.props.groupClassName : '';

        switch (this.props.type) {
            case 'text':
            case 'email':
            case 'number':
                var inputType = this.props.type === 'number' ? 'text' : this.props.type;
                inputClasses = 'form-control' + (this.props.getFormError(this.props.id) ? ' error' : '') + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                var innerInput = (
                    <span>
                        <input className={inputClasses} type={inputType} id={this.props.id} name={this.props.id} placeholder={this.props.placeholder} ref="input" value={this.state.value} onChange={this.handleChange.bind(null, this.props.id)} onBlur={this.props.onBlur} maxLength={this.props.maxLength} disabled={this.props.inputDisabled} />
                        <div className="form-error">{this.props.getFormError(this.props.id) ? <span>{this.props.getFormError(this.props.id)}</span> : <span>&nbsp;</span>}</div>
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
                inputClasses = 'form-control' + (this.props.error ? ' error' : '') + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                input = (
                    <div className={this.props.groupClassName}>
                        {this.props.label ? <label htmlFor={this.props.id} className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                        <div className={this.props.wrapperClassName}>
                            <select className={inputClasses} ref="input" onChange={this.handleChange.bind(null, this.props.id)} onBlur={this.props.onBlur} defaultValue={this.props.hasOwnProperty('value') ? this.props.value : this.props.defaultValue} disabled={this.props.inputDisabled}>
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
                            <textarea className={inputClasses} id={this.props.id} name={this.props.id} ref="input" defaultValue={this.props.value} placeholder={this.props.placeholder} onChange={this.handleChange.bind(null, this.props.id)} onBlur={this.props.onBlur} disabled={this.props.inputDisabled} rows={this.props.rows} />
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

            case 'button':
                // Requires properties:
                //   title: Label to put into button
                //   clickHandler: Method to call when button is clicked
                inputClasses = 'btn' + (this.props.inputClassName ? ' ' + this.props.inputClassName : '') + (this.props.submitBusy ? ' submit-busy' : '');
                input = (
                    <span className={this.props.wrapperClassName}>
                        <input className={inputClasses} type={this.props.type} value={this.props.title} onClick={this.props.clickHandler} disabled={this.props.inputDisabled || this.props.submitBusy} />
                    </span>
                );
                break;

            case 'button-button':
                // Requires properties:
                //   title: Label to put into button
                //   clickHandler: Method to call when button is clicked
                inputClasses = 'btn' + (this.props.inputClassName ? ' ' + this.props.inputClassName : '') + (this.props.submitBusy ? ' submit-busy' : '');
                input = (
                    <span className={this.props.wrapperClassName}>
                        <button className={inputClasses} onClick={this.props.clickHandler} disabled={this.props.inputDisabled || this.props.submitBusy}>
                        {this.props.submitBusy ? <span className="submit-spinner"><i className="icon icon-spin icon-cog"></i></span> : null}{this.props.title}</button>
                    </span>
                );
                break;

            case 'checkbox':
                input = (
                    <div className={this.props.groupClassName}>
                        {this.props.label ? <label htmlFor={this.props.id} className={this.props.labelClassName}><span>{this.props.label}{this.props.required ? ' *' : ''}</span></label> : null}
                        <div className={this.props.wrapperClassName}>
                            <input className={inputClasses} ref="input" type={this.props.type} onChange={this.handleChange.bind(null, this.props.id)} disabled={this.props.inputDisabled} checked={this.props.checked} />
                            <div className="form-error">{this.props.error ? <span>{this.props.error}</span> : <span>&nbsp;</span>}</div>
                        </div>
                    </div>
                );
                break;

            case 'submit':
                title = this.props.title ? this.props.title : 'Submit';
                inputClasses = 'btn' + (this.props.inputClassName ? ' ' + this.props.inputClassName : '') + (this.props.submitBusy ? ' submit-busy' : '');
                input = (
                    <span className={this.props.wrapperClassName}>
                        <button className={inputClasses} onClick={this.props.submitHandler} disabled={this.props.inputDisabled || this.props.submitBusy}>
                        {this.props.submitBusy ? <span className="submit-spinner"><i className="icon icon-spin icon-cog"></i></span> : null}{title}</button>
                    </span>
                );
                break;

            case 'cancel':
                title = this.props.title ? this.props.title : 'Cancel';
                inputClasses = 'btn' + (this.props.inputClassName ? ' ' + this.props.inputClassName : '');
                input = (
                    <span className={this.props.wrapperClassName}>
                        <button className={inputClasses} onClick={this.props.cancelHandler} disabled={this.props.inputDisabled}>{title}</button>
                    </span>
                );
                break;

            default:
                break;
        }

        return <span>{input}</span>;
    }
});
