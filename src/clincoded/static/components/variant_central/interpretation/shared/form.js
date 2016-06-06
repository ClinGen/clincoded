'use strict';
var React = require('react');
var _ = require('underscore');
var form = require('../../../../libs/bootstrap/form');
var RestMixin = require('../../../rest').RestMixin;
var curator = require('../../../curator');

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
        formDataUpdater: React.PropTypes.func, // the function that updates the rendered form with data from extraData
        variantUuid: React.PropTypes.string,
        interpretation: React.PropTypes.object
    },

    contextTypes: {
        fetch: React.PropTypes.func // Function to perform a search
    },

    getInitialState: function() {
        return {
            submitBusy: false,
            submitDisabled: true,
            extraData: null,
            interpretation: null
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // upon receiving props, call the formDataUpdater with the nextProps to update the forms, if applicable
        this.setState({interpretation: nextProps.interpretation});
        this.setState({extraData: nextProps.extraData});
        if (this.props.formDataUpdater) {
            this.props.formDataUpdater.call(this, nextProps);
        }
    },

    handleChange: function(ref, e) {
        if (ref === 'value') {
            if (this.refs[ref].getValue() == 'No Selection') {
                this.setState({submitDisabled: true});
            } else {
                this.setState({submitDisabled: false});
            }
        }
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler
        this.setState({submitBusy: true});

        // Save all form values from the DOM.
        this.saveAllFormValues();
        var evaluation = {};
        evaluation.variant = this.props.variantUuid;
        evaluation.criteria = this.getFormValue('criteria');
        evaluation.value = this.getFormValue('value');
        evaluation.description = this.getFormValue('description');

        console.log(evaluation);
        console.log(this.state.interpretation);

        var existingEvaluationUuid = null;
        var flatInterpretation = null;
        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(freshInterpretation => {
            flatInterpretation = curator.flatten(freshInterpretation);
            // get fresh update of interpretation object so we have newest evaluation list
            // check existing evaluations to see if one exists for the current criteria
            if (freshInterpretation.evaluations) {
                freshInterpretation.evaluations.map(function(freshEvaluation, i) {
                    if (freshEvaluation.criteria == evaluation.criteria) {
                        existingEvaluationUuid = freshEvaluation.uuid;
                    }
                });
            }

            if (existingEvaluationUuid) {
                // evaluation for criteria exists; update the existing evaluation
                return this.putRestData('/evaluation/' + existingEvaluationUuid, evaluation).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            } else {
                // evaluation for criteria does not exist; create new evaluation
                return this.postRestData('/evaluation/', evaluation).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            }
        }).then(newEvaluation => {
            console.log('new evaluation uuid:');
            console.log(newEvaluation.uuid);
            if (!('evaluations' in this.state.interpretation)) {
                this.state.interpretation.evaluations = [];
            }
            this.state.interpretation.evaluations.push('/evaluations/' + newEvaluation.uuid);

            return this.putRestData('/interpretation/' + this.props.interpretationUuid, this.state.interpretation).then(data => {
                return Promise.resolve(data['@graph'][0]);
            });
        }).catch(error => {
            console.log(error);
        });


        //this.getRestData('/search/?type=evaluation&disease.orphaNumber=')


    },

    render: function() {
        return (
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <div className="evaluation">
                    {this.props.formTitle ?
                        <h4>{this.props.formTitle}</h4>
                    : null}
                    {this.props.renderedFormContent.call(this)}
                </div>
                <div className="curation-submit clearfix">
                    <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} inputDisabled={this.state.submitDisabled} />
                </div>
            </Form>
        );
    }
});
