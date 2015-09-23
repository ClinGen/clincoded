'use strict';
var React = require('react');
var _ = require('underscore');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');

var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

module.exports.DEFAULT_VALUE = 'Not Assessed';


var AssessmentPanel = module.exports.AssessmentPanel = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        currVal: React.PropTypes.string, // Current value of assessment
        panelTitle: React.PropTypes.string, // Title of Assessment panel; 'Assessment' default
        label: React.PropTypes.string, // Label for dropdown; 'Assessment' default
        note: React.PropTypes.string, // Note to display below the dropdown
        updateValue: React.PropTypes.func.isRequired // Parent function to call when dropdown changes
    },

    // Called when the dropdown value changes
    handleChange: function(ref, e) {
        var value = this.refs['assessment'].getValue();
        this.props.updateValue(value);
    },

    render: function() {
        var panelTitle = this.props.panelTitle ? this.props.panelTitle : 'Assessment';
        var label = this.props.label ? this.props.label : 'Assessment';

        return (
            <Panel title={panelTitle}>
                <div className="row">
                    <Input type="select" ref="assessment" label={label + ':'} defaultValue="Not Assessed" value={this.props.currVal} handleChange={this.handleChange}
                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                        <option>Not Assessed</option>
                        <option disabled="disabled"></option>
                        <option>Supports</option>
                        <option>Review</option>
                        <option>Contradicts</option>
                    </Input>
                    {this.props.note ?
                        <p className="col-sm-7 col-sm-offset-5">{this.props.note}</p>
                    : null}
                </div>
            </Panel>
        );
    }
});


// Return the assessment from the given array of assessments that's owned by the curator with the
// given UUID.
module.exports.findAssessment = function(assessments, curatorUuid) {
    return _(assessments).find(function(assessment) {
        return assessment.submitted_by.uuid === curatorUuid;
    });
};
