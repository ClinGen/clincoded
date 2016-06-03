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
        formTitle: React.PropTypes.string, // the title of this form section
        renderedFormContent: React.PropTypes.func, // the function that returns the rendering of the form items
        extraData: React.PropTypes.object, // any extra data that is passed from the parent page
        formDataUpdater: React.PropTypes.func // the function that updates the rendered form with data from extraData
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            submitBusy: false,
            extraData: null
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // upon receiving props, call the formDataUpdater with the nextProps to update the forms, if applicable
        this.setState({extraData: nextProps.extraData});
        if (this.props.formDataUpdater) {
            this.props.formDataUpdater.call(this, nextProps);
        }
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true});

        // Save all form values from the DOM.
        this.saveAllFormValues();
        var type = this.getFormValue('formType');

        this.setState({submitBusy: false});
    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    {this.props.formTitle ?
                        <h4>Evaluation Criteria</h4>
                    : null}
                    {this.props.renderedFormContent.call(this)}
                </div>
                <div className="curation-submit clearfix">
                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                </div>
            </Form>
        );
    }
});
