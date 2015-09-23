'use strict';
var React = require('react');
var _ = require('underscore');
var curator = require('./curator');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');

var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

var DEFAULT_VALUE = module.exports.DEFAULT_VALUE = 'Not Assessed';


// Object to track and maintain a single assessment. If you pass null/undefined in 'assessment',
// provide all parameters from 'gdm' and after to properly initialize new assessment, if possible.
class AssessmentTracker {
    constructor(assessment, user, evidenceType) {
        this.original = assessment ? _.clone(assessment) : null; // Original assessment -- the existing one for a parent object
        this.updated = null; // Updated assessment that's been saved to DB.
        this.type = assessment ? assessment.evidence_type : evidenceType;
        this.user = user; // User object for currently logged-in user.
        this.currentVal = assessment ? assessment.value : DEFAULT_VALUE;
    }

    // Does this assessment show it has been assessed?
    isAssessed() {
        return  !!this.original && this.original.value !== DEFAULT_VALUE;
    }

    // Get the current (non-saved) value of the assessment; normally from the page's assessment form
    getCurrentVal() {
        return this.currentVal;
    }

    // Set the current (non-saved) value of the assessment; normally from the page's assessment form.
    // Automatically called when the component sets the current state of the assessment value on
    // the assessment form's value change.
    setCurrentVal(value) {
        this.currentVal = value;
    }
}

module.exports.Assessment = AssessmentTracker;


// Mixin to handle React states for assessments
var AssessmentMixin = module.exports.AssessmentMixin = {
    // Do not call; called by React.
    getInitialState: function() {
        return {
            currentAssessmentVal: '' // Currently chosen assessment value in the form
        };
    },

    // Sets the current component's assessment value state. Call at load and when assessment form value changes.
    // Also assigns the value to the given assessment object. If no value's given; then the current value
    // is taken from the given assessment object.
    setAssessmentValue: function(assessmentTracker, value) {
        if (!value) {
            // No value given; get it from the given assessment object
            value = assessmentTracker.getCurrentVal();
        } else {
            // There was a value given; assign it to the given assessment object in addition to setting
            // the component state.
            assessmentTracker.setCurrentVal(value);
        }

        // Set the component state to cause a rerender
        this.setState({currentAssessmentVal: value});
    },

    // When the user changes the assessment value, this gets called
    updateAssessmentValue: function(assessmentTracker, value) {
        this.setAssessmentValue(assessmentTracker, value);
    },

    // Write the assessment for the given pathogenicity to the DB, and pass the new assessment in the promise, along
    // With a boolean indicating if this is a new assessment or if we updated one. If we don't write an assessment
    // (either because we had already written the assessment, and the new assessment's value is no different; or
    // because we haven't written an assessment, and the current assessment's value is default), the the promise has
    // a null assessment.
    // For new assessments, pass in the assessment tracking object, the current GDM object, or null if you know you
    // have an assessment already and want to use its existing GDM reference. Also pass in the current evidence object.
    // If you don't yet have it, pass nothing or null, but make sure you update with that later. If you want to write
    // an existing assessment, pass that in the 'assessment' parameter. This is useful for when you've written the
    // assessment without an evidence_id, but now have it. In that case, pass the assessment tracker, null for the
    // GDM (use the existing one), the evidence object, and the assessment object to write with the new evidence ID.
    saveAssessment: function(assessmentTracker, gdm, evidence, assessment) {
        // Flatten the original assessment if any; will modify with updated values
        var newAssessment = assessment ? curator.flatten(assessment) : (assessmentTracker.original ? curator.flatten(assessmentTracker.original, 'assessment') : {});
        newAssessment.value = assessmentTracker.currentVal;
        if (evidence) {
            newAssessment.evidence_id = evidence.uuid;
            newAssessment.evidence_type = evidence['@type'][0];
        }
        if (gdm) {
            newAssessment.evidence_gdm = gdm.uuid;
        }
        newAssessment.active = true;

        // Start a write of the record to the DB, returning a promise object with:
        //   assessment: fleshed-out assessment as written to the DB.
        //   update: true if an existing object was updated, false if a new object was written.
        return new Promise(function(resolve, reject) {
            var assessmentPromise;

            if (assessment || (assessmentTracker.original && (newAssessment.value !== assessmentTracker.original.value))) {
                var assessmentUuid = assessment ? assessment.uuid : assessmentTracker.original.uuid;

                // Updating an existing assessment, and the value of the assessment has changed
                assessmentPromise = this.putRestData('/assessments/' + assessmentUuid, newAssessment).then(data => {
                    return Promise.resolve({assessment: data['@graph'][0], update: true});
                });
            } else if (!assessmentTracker.original && newAssessment.value !== DEFAULT_VALUE) {
                // New assessment and form has non-default value; write it to the DB.
                assessmentPromise = this.postRestData('/assessments/', newAssessment).then(data => {
                    return Promise.resolve({assessment: data['@graph'][0], update: false});
                });
            } else {
                // Not writing an assessment
                assessmentPromise = Promise.resolve({assessment: null, update: false});
            }

            // Pass to the next THEN, with null if we didn't write an assessment
            resolve(assessmentPromise);
        }.bind(this));
    }
};


var AssessmentPanel = module.exports.AssessmentPanel = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        assessmentTracker: React.PropTypes.object, // Current value of assessment
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
        var value = this.props.assessmentTracker && this.props.assessmentTracker.currentVal;

        return (
            <div>
                {this.props.assessmentTracker ?
                    <Panel title={panelTitle}>
                        <div className="row">
                            <Input type="select" ref="assessment" label={label + ':'} defaultValue="Not Assessed" value={value} handleChange={this.handleChange}
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
                : null}
            </div>
        );
    }
});


// Return the assessment from the given array of assessments that's owned by the curator with the
// given UUID. The returned assessment is a clone of the original object, so it can be modified
// without side effects.
module.exports.userAssessment = function(assessments, curatorUuid) {
    if (curatorUuid) {
        return _.chain(assessments).find(function(assessment) {
            return assessment.submitted_by.uuid === curatorUuid;
        }).clone().value();
    }
    return null;
};
