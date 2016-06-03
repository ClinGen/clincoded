'use strict';
var React = require('react');
var _ = require('underscore');
var form = require('../../../../libs/bootstrap/form');
var RestMixin = require('../../../rest').RestMixin;

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Form component to be re-used by various tabs
var CurationInterpretationForm = module.exports.CurationInterpretationForm = React.createClass({
    mixins: [RestMixin, FormMixin],

    propTypes: {
        formContent: React.PropTypes.func
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            submitBusy: false
        };
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true});

        // Save all form values from the DOM.
        this.saveAllFormValues();
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
                </div>
                <div className="curation-submit clearfix">
                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                </div>
            </Form>
        );
    }
});
