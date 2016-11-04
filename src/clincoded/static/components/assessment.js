'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var curator = require('./curator');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');

var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

var DEFAULT_VALUE = module.exports.DEFAULT_VALUE = 'Not Assessed';

var experimentalTypes = [
    'Biochemical Function',
    'Protein Interactions',
    'Expression',
    'Functional Alteration',
    'Model Systems',
    'Rescue'
];

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

module.exports.AssessmentTracker = AssessmentTracker;


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
    saveAssessment: function(assessmentTracker, gdmUuid, evidenceUuid, assessment, historyLabel) {
        // Flatten the original assessment if any; will modify with updated values
        //var newAssessment = assessment ? curator.flatten(assessment) : (assessmentTracker.original ? curator.flatten(assessmentTracker.original, 'assessment') : {});
        var newAssessment = assessment ? curator.flatten(assessment) : (assessmentTracker.original ? curator.flatten(assessmentTracker.original, 'assessment') : {});
        newAssessment.value = assessmentTracker.currentVal;
        if (evidenceUuid) {
            newAssessment.evidence_id = evidenceUuid;
        }
        if (gdmUuid) {
            newAssessment.evidence_gdm = gdmUuid;
        }
        newAssessment.evidence_type = assessmentTracker.type;
        newAssessment.active = true;

        // Start a write of the record to the DB, returning a promise object with:
        //   assessment: fleshed-out assessment as written to the DB.
        //   update: true if an existing object was updated, false if a new object was written.
        return new Promise((resolve, reject) => {
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
        });
    },

    saveAssessmentHistory: function(assessment, gdm, evidence, update) {
        var meta;

        if (!assessment) {
            return Promise.resolve(null);
        }

        if (experimentalTypes.indexOf(assessment.evidence_type) >= 0) {
            // Experimental assessment
            meta = {
                assessment: {
                    operation: 'experimental',
                    value: assessment.value,
                    experimental: evidence['@id']
                }
            };
        } else if (assessment.evidence_type === 'Segregation') {
            // Family segregation assessment
            meta = {
                assessment: {
                    operation: 'segregation',
                    value: assessment.value,
                    family: evidence['@id']
                }
            };
        } else if (assessment.evidence_type === 'Pathogenicity') {
            // Variant pathogenicity assessment
            var variant = (typeof evidence.variant === 'string') ? evidence.variant : evidence.variant['@id'];

            meta = {
                assessment: {
                    operation: 'pathogenicity',
                    value: assessment.value,
                    gdm: gdm['@id'],
                    pathogenicity: evidence['@id'],
                    variant: variant
                }
            };
        } else {
            // Something's gone wrong
        }

        // Write assessment history if ready
        if (meta) {
            return this.recordHistory(update ? 'modify' : 'add', assessment, meta);
        }
        return Promise.resolve(null);
    }
};


var AssessmentPanel = module.exports.AssessmentPanel = React.createClass({
    mixins: [FormMixin],

    propTypes: {
        ownerNotAssessed: React.PropTypes.bool, // true if evidence assessed already by its creator
        noSeg: React.PropTypes.bool, // true if evidence is family and there is no segregation data exist.
        assessmentTracker: React.PropTypes.object, // Current value of assessment
        //disabled: React.PropTypes.bool, // TRUE to make assessment dropdown disabled; FALSE to enable it (default)
        panelTitle: React.PropTypes.string, // Title of Assessment panel; 'Assessment' default
        label: React.PropTypes.string, // Label for dropdown; 'Assessment' default
        note: React.PropTypes.oneOfType([ // Note to display below the dropdown
            React.PropTypes.string,
            React.PropTypes.object
        ]),
        updateValue: React.PropTypes.func.isRequired, // Parent function to call when dropdown changes
        assessmentSubmit: React.PropTypes.func, // Function to call when Save button is clicked; This prop's existence makes the Save button exist
        disableDefault: React.PropTypes.bool, // TRUE to disable the Default (Not Assessed) item
        submitBusy: React.PropTypes.bool, // TRUE while the form submit is running
        accordion: React.PropTypes.bool, // True if the panel should part of an openable accordion
        open: React.PropTypes.bool, // True if the panel should be an openable panel
        updateMsg: React.PropTypes.string // String to display by the Update button if desired
    },

    componentDidMount: function() {
        if (this.props.assessmentTracker && this.props.assessmentTracker.currentVal) {
            this.refs.assessment.value = this.props.assessmentTracker.currentVal;
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.refs.assessment && nextProps.assessmentTracker && nextProps.assessmentTracker.currentVal == DEFAULT_VALUE) {
            this.refs.assessment.resetValue();
        }
    },

    // Called when the dropdown value changes
    handleChange: function(assessmentTracker, e) {
        if (this.refs.assessment) {
            var value = this.refs.assessment.getValue();
            this.props.updateValue(assessmentTracker, value);
        }
    },

    render: function() {
        var panelTitle = this.props.panelTitle ? this.props.panelTitle : 'Assessment';
        var label = this.props.label ? this.props.label : 'Assessment';
        //var disabled = (this.props.disabled === true || this.props.disabled === false) ? this.props.disabled : false;
        //var disabled = this.props.disabled;
        var noSeg = this.props.noSeg;
        var value = this.props.assessmentTracker && this.props.assessmentTracker.currentVal ? this.props.assessmentTracker.currentVal : DEFAULT_VALUE;
        var ownerNotAssessed = this.props.ownerNotAssessed;
        var submitErrClass = 'submit-info pull-right';

        //var disable_note_base = 'The option to assess this evidence is not available since ';
        //var disable_note_noseg = 'the curator who created it has not yet assessed on it';
        //var disbale_note_owner = 'no segregation data entered';

        return (
            <div>
                {this.props.assessmentTracker ?
                    <Panel title={panelTitle} accordion={this.props.accordion} open={this.props.open}>
                        <div className="row">
                            { ownerNotAssessed ?
                                <p className="alert alert-info">
                                    The option to assess this evidence does not currently exist since the curator who created it has not yet assessed on it.
                                </p>
                            : ( noSeg ?
                                <p className="alert alert-info">
                                    The option to assess segregation is not available until some segregation data has been entered.
                                </p>
                                : null)
                            }
                        </div>

                        <div className="row">
                            {noSeg ?
                                <Input type="select" ref="assessment" label={label + ':'} value={value} defaultValue={DEFAULT_VALUE}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={true}>
                                    <option value={DEFAULT_VALUE}>Not Assessed</option>
                                </Input>
                                :
                                <Input type="select" ref="assessment" label={label + ':'} value={value} defaultValue={value} handleChange={this.handleChange.bind(null, this.props.assessmentTracker)}
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputDisabled={ownerNotAssessed ? true : false}>
                                    <option value={DEFAULT_VALUE} disabled={this.props.disableDefault}>Not Assessed</option>
                                    <option disabled="disabled"></option>
                                    <option value="Supports">Supports</option>
                                    <option value="Review">Review</option>
                                    <option value="Contradicts">Contradicts</option>
                                </Input>
                            }
                            {this.props.note ?
                                <div className="col-sm-7 col-sm-offset-5">{this.props.note}</div>
                            : null}
                        </div>
                        {this.props.assessmentSubmit ?
                            <div className="curation-submit clearfix">
                                <Input type="button" inputClassName="btn-primary pull-right" clickHandler={this.props.assessmentSubmit} title="Update" submitBusy={this.props.submitBusy} inputDisabled={noSeg || ownerNotAssessed ? true : false} />
                                {this.props.updateMsg ?
                                    <div className="submit-info pull-right">{this.props.updateMsg}</div>
                                : null}
                            </div>
                        : null}
                    </Panel>
                : null}
            </div>
        );
    }
});

// Display a history item for adding or or modifying an assessment
var AssessmentAddModHistory = React.createClass({
    propTypes: {
        history: React.PropTypes.object.isRequired, // History object
        user: React.PropTypes.object // User session session ? '&user=' + session.user_properties.uuid : ''
    },

    render: function() {
        var history = this.props.history;
        var assessment = history.primary;
        var assessmentMeta = history.meta.assessment;
        var assessmentRender = null;

        switch (assessmentMeta.operation) {
            case 'pathogenicity':
                var gdm = assessmentMeta.gdm;
                var pathogenicity = assessmentMeta.pathogenicity;
                var variant = assessmentMeta.variant;
                var variantId = variant.clinvarVariantId ? variant.clinvarVariantId : variant.otherDescription;
                var user = this.props.user;
                var pathogenicityUri = '/variant-curation/?all&gdm=' + gdm.uuid + '&variant=' + variant.uuid + '&pathogenicity=' + pathogenicity.uuid + (user ? '&user=' + user.uuid : '');
                assessmentRender = (
                    <div>
                        <span>Variant <a href={pathogenicityUri}>{variantId}</a> pathogenicity assessed as <strong>{assessmentMeta.value}</strong></span>
                        <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                    </div>
                );
                break;

            case 'segregation':
                var family = assessmentMeta.family;
                assessmentRender = (
                    <div>
                        <span>Family <a href={family['@id']}>{family.label}</a> segregation assessed as <strong>{assessmentMeta.value}</strong></span>
                        <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                    </div>
                );
                break;

            case 'experimental':
                var experimental = assessmentMeta.experimental;
                assessmentRender = (
                    <div>
                        <span>Experimental data <a href={experimental['@id']}>{experimental.label}</a> assessed as <strong>{assessmentMeta.value}</strong></span>
                        <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                    </div>
                );
                break;

            default:
                break;
        }
        return assessmentRender;
    }
});

globals.history_views.register(AssessmentAddModHistory, 'assessment', 'add');
globals.history_views.register(AssessmentAddModHistory, 'assessment', 'modify');


// Display a history item for deleting an assessment
var AssessmentDeleteHistory = React.createClass({
    render: function() {
        return <div>ASSESSMENTYDELETE</div>;
    }
});

globals.history_views.register(AssessmentDeleteHistory, 'assessment', 'delete');


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


module.exports.othersAssessed = function(assessments, curatorUuid) {
    // See if others have assessed
    return !!_(assessments).find(function(assessment) {
        return (assessment.submitted_by.uuid !== curatorUuid) && assessment.value !== DEFAULT_VALUE;
    });
};
