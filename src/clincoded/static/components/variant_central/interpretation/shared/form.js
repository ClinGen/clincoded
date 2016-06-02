'use strict';
var React = require('react');
var form = require('../../../../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Form component to be re-used by various tabs
var CurationInterpretationForm = module.exports.CurationInterpretationForm = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        formContent: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            submitBusy: false
        };
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();
        this.setState({submitBusy: true});
        var type = this.getFormValue('formType');
        console.log(type);

        this.setState({submitBusy: false});

    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    <h4>Evaluation Criteria</h4>
                    {this.props.formContent.call(this)}
                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                </div>
            </Form>
        );
    }
});
