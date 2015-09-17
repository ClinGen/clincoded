'use strict';
var React = require('react');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var methods = require('./methods');
var assessment = require('./assessment');

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var VariantAssociationsHeader = curator.VariantAssociationsHeader;
var AssessmentPanel = assessment.AssessmentPanel;
var PmidSummary = curator.PmidSummary;
var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;
var PmidDoiButtons = curator.PmidDoiButtons;
var queryKeyValue = globals.queryKeyValue;
var country_codes = globals.country_codes;
var truncateString = globals.truncateString;


var VariantCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    componentVars: {
        orgAssessment: null // User's assessment -- if any -- on page load
    },

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            variant: null, // Variant object given in UUID
            pathogenicity: null, // If editing curation, pathogenicity we're editing
            assessment: null // Assessment of pathogenicity
        };
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var annotationUuid = this.queryValues.annotationUuid;
        var variantUuid = this.queryValues.variantUuid;
        var pathogenicityUuid = this.queryValues.pathogenicityUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            annotationUuid ? '/evidence/' + annotationUuid : '',
            variantUuid && !pathogenicityUuid ? '/variants/' + variantUuid : '', // If we're loading a pathogenicity, it'll have the variant built in
            pathogenicityUuid ? '/pathogenicity/' + pathogenicityUuid : ''
        ]);

        // With all given query string variables, get the corresponding objects from the DB.
        this.getRestDatas(
            uris
        ).then(datas => {
            // See what we got back so we can build an object to copy in this React object's state to rerender the page.
            var stateObj = {};
            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
                        break;

                    case 'annotation':
                        stateObj.annotation = data;
                        break;

                    case 'variant':
                        stateObj.variant = data;
                        break;

                    case 'pathogenicity':
                        stateObj.pathogenicity = data;
                        break;

                    default:
                        break;
                }
            });

            // If we loaded a pathgenicity, get its variant as if we had loaded it separately
            if (stateObj.pathogenicity) {
                stateObj.variant = _.clone(stateObj.pathogenicity.variant);
            }

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // If the pathogenicity's assessment list has an entry belonging to user, save it in state
            if (stateObj.pathogenicity && stateObj.pathogenicity.assessments && stateObj.pathogenicity.assessments.length) {
                stateObj.assessment = _(stateObj.pathogenicity.assessments).find(assessment => {
                    return assessment.submitted_by.uuid === this.props.session.user_properties.uuid;
                });
            }

            if (stateObj.assessment) {
                // Loaded an assessment; save its original object for later comparison with the updated one in the component state
                this.componentVars.orgAssessment = _.clone(stateObj.assessment);
            } else {
                // No assessment foound for user; make an initial one and save it in the component state
                stateObj.assessment = {
                    evidence_type: 'pathogenicity',
                    evidence_id: stateObj.pathogenicity ? stateObj.pathogenicity.uuid : '',
                    evidence_gdm: stateObj.gdm ? stateObj.gdm.uuid : '',
                    value: assessment.DEFAULT_VALUE,
                    active: true
                };
            }

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No one’s waiting but the user; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // After the Group Curation page component mounts, grab the GDM and annotation UUIDs from the query
    // string and retrieve the corresponding annotation from the DB, if they exist.
    // Note, we have to do this after the component mounts because AJAX DB queries can't be
    // done from unmounted components.
    componentDidMount: function() {
        this.loadData();
    },

    // When the user changes the assessment value, this gets called
    updateAssessment: function(value) {
        var assessment = this.state.assessment;
        assessment.value = value;
        this.setState({assessment: assessment});
    },

    // Convert filled-out form values to pathonegicity object, which is returned. Any existing pathogenicity object
    // (editing a variant) gets passed in currPathogenicity and gets modified with the new values.
    formToPathogenicity: function(currPathogenicity) {
        var newPathogenicity = currPathogenicity ? curator.flatten(currPathogenicity) : {};

        // For each form field, put its non-default value into the new, flattened pathogenicity object
        var value = this.getFormValue('consistentdisease');
        if (value !== 'none') {
            newPathogenicity.consistentWithDiseaseMechanism = value === 'Yes';
        } else {
            delete newPathogenicity.consistentWithDiseaseMechanism;
        }

        value = this.getFormValue('functionaldomain');
        if (value !== 'none') {
            newPathogenicity.withinFunctionalDomain = value === 'Yes';
        } else {
            delete newPathogenicity.withinFunctionalDomain;
        }

        value = this.getFormValue('frequencysupport');
        if (value !== 'none') {
            newPathogenicity.frequencySupportPathogenicity = value === 'Yes';
        } else {
            delete newPathogenicity.frequencySupportPathogenicity;
        }

        value = this.getFormValue('previouslyreported');
        if (value !== 'none') {
            newPathogenicity.previouslyReported = value === 'Yes';
        } else {
            delete newPathogenicity.previouslyReported;
        }

        value = this.getFormValue('denovo');
        if (value !== 'none') {
            newPathogenicity.denovoType = value;
        } else {
            delete newPathogenicity.denovoType;
        }

        value = this.getFormValue('intrans');
        if (value !== 'none') {
            newPathogenicity.intransWithAnotherVariant = value === 'Yes';
        } else {
            delete newPathogenicity.intransWithAnotherVariant;
        }

        value = this.getFormValue('supportsegregation');
        if (value !== 'none') {
            newPathogenicity.supportingSegregation = value === 'Yes';
        } else {
            delete newPathogenicity.supportingSegregation;
        }

        if (value !== 'none') {
            newPathogenicity.supportingExperimental = value === 'Yes';
        } else {
            delete newPathogenicity.supportingExperimental;
        }

        value = this.getFormValue('comments');
        if (value) {
            newPathogenicity.comment = value;
        } else {
            delete newPathogenicity.comment;
        }

        return newPathogenicity;
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            // If pathogenicity object has no assessment object found with currently logged-in user
            // and form assessment has non-default value. The assessment might be a new one without a type,
            // so pass in the type.
            var newAssessment = curator.flatten(this.state.assessment, 'assessment');
            var promise = new Promise(function(resolve, reject) {
                var assessmentPromise = null;

                if (this.componentVars.orgAssessment && (newAssessment.value !== this.componentVars.orgAssessment.value)) {
                    // Updating an existing assessment, and the value of the assessment has changed
                    assessmentPromise = this.putRestData('/assessments/' + this.componentVars.orgAssessment.uuid, newAssessment).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                } else if (!this.componentVars.orgAssessment && newAssessment.value !== assessment.DEFAULT_VALUE) {
                    // New assessment and form has non-default value; write it to the DB.
                    assessmentPromise = this.postRestData('/assessments/', newAssessment).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                }

                // Pass to the next THEN, with null if we didn't write an assessment
                resolve(assessmentPromise);
            }.bind(this));

            // Wait for the assessment to finish writing if needed, then handle the pathenogicity object
            promise.then(newAssessment => {
                // If this pathogenicity had an assessment that wasn't default, then there was no form, so don't write the pathogenicity.
                if (!this.componentVars.orgAssessment || this.componentVars.orgAssessment.value === assessment.DEFAULT_VALUE) {
                    // Convert form values to new flattened pathogenicity object.
                    var newPathogenicity = this.formToPathogenicity(this.state.pathogenicity);

                    // If we made a new assessment, add it to the pathogenicity's assessments
                    if (!this.componentVars.orgAssessment && newAssessment) {
                        if (!newPathogenicity.assessments) {
                            newPathogenicity.assessments = [];
                        }
                        newPathogenicity.assessments.push(newAssessment['@id']);
                    }

                    // Assign a link to the pathogenicity's variant if new
                    if (!newPathogenicity.variant && this.state.variant) {
                        newPathogenicity.variant = this.state.variant['@id'];
                    }

                    // Either update or create the pathogenicity object in the DB
                    if (this.state.pathogenicity) {
                        // We're editing a pathogenicity. PUT the new pathogenicity object to the DB to update the existing one.
                        return this.putRestData('/pathogenicity/' + this.state.pathogenicity.uuid, newPathogenicity).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    } else {
                        // We created a pathogenicity; POST it to the DB
                        return this.postRestData('/pathogenicity/', newPathogenicity).then(data => {
                            return Promise.resolve(data['@graph'][0]);
                        });
                    }
                }

                // No pathogenicity to write
                Promise.resolve(null);
            }).then(pathogenicity => {
                // Given pathogenicity has been saved (created or updated).
                // Now update the GDM to include the pathogenicity if it's new
                if (!this.state.pathogenicity && this.state.gdm) {
                    // New pathogenicity; add it to the GDM’s pathogenicity array.
                    var newGdm = curator.flatten(this.state.gdm);
                    if (newGdm.variantPathogenicity && newGdm.variantPathogenicity.length) {
                        newGdm.variantPathogenicity.push(pathogenicity['@id']);
                    } else {
                        newGdm.variantPathogenicity = [pathogenicity['@id']];
                    }

                    // Write the updated GDM
                    return this.putRestData('/gdm/' + this.state.gdm.uuid, newGdm).then(data => {
                        return Promise.resolve(data['@graph'][0]);
                    });
                }
                return Promise.resolve(null);
            }).then(data => {
                // Now go back to Record Curation
                var gdmQs = this.state.gdm ? '?gdm=' + this.state.gdm.uuid : '';
                var pmidQs = this.state.annotation ? '&pmid=' + this.state.annotation.article.pmid : '';
                this.context.navigate('/curation-central/' + gdmQs + pmidQs);
            }).catch(function(e) {
                console.log('PATHOGENICITY CREATION ERROR=: %o', e);
            });
        }
    },

    render: function() {
        var gdm = this.state.gdm;
        var annotation = this.state.annotation;
        var variant = this.state.variant;
        var pathogenicity = this.state.pathogenicity;
        var otherPathogenicityList;

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.variantUuid = queryKeyValue('variant', this.props.href);
        this.queryValues.pathogenicityUuid = queryKeyValue('pathogenicity', this.props.href);
        this.queryValues.session_user = queryKeyValue('user', this.props.href);
        this.queryValues.all = queryKeyValue('all', this.props.href) === "";

        // Get the user's UUID, either from the query string or from the annotation
        var user = this.queryValues.session_user ? this.queryValues.session_user : (annotation ? annotation.submitted_by.uuid : '');

        // If we're editing a pathogenicity, get a list of all the variant's pathogenicities, except for the one
        // we're editing. This is to display the list of past curations.
        if (this.queryValues.all && variant && variant.associatedPathogenicities && variant.associatedPathogenicities.length) {
            otherPathogenicityList = _(variant.associatedPathogenicities).filter(function(fp) {
                return fp.submitted_by.uuid !== user;
            });
        }

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} />
                <div className="container">
                    {annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={this.state.annotation.article} displayJournal />
                        </div>
                    : null}
                    <div className="viewer-titles">
                        <h1>{(pathogenicity ? 'Edit' : 'Curate') + ' Variant Information'}</h1>
                        {variant ?
                            <h2>{variant.clinvarVariantId ? <span>{'VariationId: ' + variant.clinvarVariantId}</span> : <span>{'Description: ' + variant.otherDescription}</span>}</h2>
                        : null}
                    </div>
                    <VariantAssociationsHeader gdm={gdm} variant={variant} />
                    <div className="row group-curation-content">
                        <div className="col-sm-12">
                            {!this.queryValues.pathogenicityUuid || pathogenicity ?
                                <div>
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        {!this.componentVars.orgAssessment || this.componentVars.orgAssessment.value === assessment.DEFAULT_VALUE ?
                                            <Panel>
                                                <div className="row">
                                                    <Input type="select" ref="consistentdisease" label="Is variant type consistent with disease mechanism?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.consistentWithDiseaseMechanism)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="select" ref="functionaldomain" label="Variant within functional domain:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.withinFunctionalDomain)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="select" ref="frequencysupport" label="Does frequency data support pathogenicity?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.frequencySupportPathogenicity)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="select" ref="previouslyreported" label="Previously reported?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.previouslyReported)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="select" ref="denovo" label="de novo Type (inferred or confirmed):" defaultValue="none" value={pathogenicity && pathogenicity.denovoType}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Inferred</option>
                                                        <option>Confirmed</option>
                                                    </Input>
                                                    <Input type="select" ref="intrans" label="In trans with another variant:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.intransWithAnotherVariant)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="select" ref="supportsegregation" label="Supporting segregation data:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.supportingSegregation)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="select" ref="supportexperimental" label="Supporting experimental data:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.supportingExperimental)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option>Yes</option>
                                                        <option>No</option>
                                                    </Input>
                                                    <Input type="textarea" ref="comments" label="Variant comments:" rows="5" value={pathogenicity && pathogenicity.comment}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                                </div>
                                            </Panel>
                                        :
                                            <VariantCurationView key={pathogenicity.uuid} pathogenicity={pathogenicity} />
                                        }
                                        <AssessmentPanel panelTitle="Variant Assessment" currVal={this.state.assessment && this.state.assessment.value} updateValue={this.updateAssessment} />
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" />
                                            {gdm ?
                                                <a href={'/curation-central/?gdm=' + gdm.uuid + (annotation ? '&pmid=' + annotation.article.pmid : '')} className="btn btn-default btn-inline-spacer pull-right">Cancel</a>
                                            : null}
                                        </div>
                                    </Form>
                                    {otherPathogenicityList ?
                                        <div>
                                            {otherPathogenicityList.map(function(pathogenicity) {
                                                return <VariantCurationView key={pathogenicity.uuid} pathogenicity={pathogenicity} />;
                                            })}
                                        </div>
                                    : null}
                                </div>
                            : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(VariantCuration, 'curator_page', 'variant-curation');


// Display a single variant curation viewer panel
var VariantCurationView = React.createClass({
    propTypes: {
        pathogenicity: React.PropTypes.object.isRequired // Variant pathogenicity to display
    },

    render: function() {
        var pathogenicity = this.props.pathogenicity;
        var variant = pathogenicity && pathogenicity.variant;
        var variantTitle = variant ? (variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 50)) : '';

        return (
            <div>
                {pathogenicity && variant ?
                    <Panel title={'Curated by ' + pathogenicity.submitted_by.title} panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Variant type consistent with disease mechanism</dt>
                                <dd>{pathogenicity.consistentWithDiseaseMechanism === true ? 'Yes' : (pathogenicity.consistentWithDiseaseMechanism === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Variant within functional domain</dt>
                                <dd>{pathogenicity.withinFunctionalDomain === true ? 'Yes' : (pathogenicity.withinFunctionalDomain === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Frequency data supports pathogenicity</dt>
                                <dd>{pathogenicity.frequencySupportPathogenicity === true ? 'Yes' : (pathogenicity.frequencySupportPathogenicity === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Previously reported</dt>
                                <dd>{pathogenicity.previouslyReported === true ? 'Yes' : (pathogenicity.previouslyReported === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>de novo Type</dt>
                                <dd>{pathogenicity.denovoType}</dd>
                            </div>

                            <div>
                                <dt>In trans with another variant</dt>
                                <dd>{pathogenicity.intransWithAnotherVariant === true ? 'Yes' : (pathogenicity.intransWithAnotherVariant === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Supporting segregation data</dt>
                                <dd>{pathogenicity.supportingSegregation === true ? 'Yes' : (pathogenicity.supportingSegregation === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Supporting experimental data</dt>
                                <dd>{pathogenicity.supportingExperimental === true ? 'Yes' : (pathogenicity.supportingExperimental === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Variant comments</dt>
                                <dd>{pathogenicity.comment}</dd>
                            </div>
                        </dl>
                    </Panel>
                : null}
            </div>
        );
    }
});


// Display the pathogenicity when its uuid is passed in the URL.
var VariantViewer = React.createClass({
    render: function() {
        var pathogenicity = this.props.context;
        var variant = pathogenicity.variant;

        return (
            <div className="container">
                <div className="row group-curation-content">
                    <div className="viewer-titles">
                        <h1>View Variant: {variant.clinvarVariantId ? variant.clinvarVariantId : variant.otherDescription}</h1>
                    </div>
                    <VariantCurationView pathogenicity={pathogenicity} />
                </div>
            </div>
        );
    }
});

globals.content_views.register(VariantViewer, 'pathogenicity');
