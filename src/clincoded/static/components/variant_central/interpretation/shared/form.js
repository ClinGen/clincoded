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

    render: function() {
        return (
            <Form formClassName="form-horizontal form-std">
                <div className="evaluation">
                    <h4>Evaluation Criteria</h4>
                    <Input type="select" ref="evaluation" label="Does this meet your criteria?" defaultValue="No Selection"
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option value="No Selection">No Selection</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </Input>
                    <Input type="textarea" ref="evaluation-desc" label="Description:" rows="5" placeholder="e.g. free text"
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                </div>
            </Form>
        );
    }
});
