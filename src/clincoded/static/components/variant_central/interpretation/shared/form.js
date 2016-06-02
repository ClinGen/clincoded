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

    render: function() {
        return (
            <Form submitHandler={this.props.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    <h4>Evaluation Criteria</h4>
                    {this.props.formContent.call(this)}
                </div>
            </Form>
        );
    }
});
