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
var Assessments = require('./assessment');
var CuratorHistory = require('./curator_history');

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var VariantAssociationsHeader = curator.VariantAssociationsHeader;
var AssessmentTracker = Assessments.AssessmentTracker;
var AssessmentPanel = Assessments.AssessmentPanel;
var AssessmentMixin = Assessments.AssessmentMixin;
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
var external_url_map = globals.external_url_map;


var VariantCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin, AssessmentMixin, CuratorHistory],

    contextTypes: {
        navigate: React.PropTypes.func
    },

    // Keeps track of values from the query string
    queryValues: {},

    cv: {
        assessmentTracker: null, // Tracking object for a single assessment
        annotation: null // Annotation from the given PMID
    },

    getInitialState: function() {
        this.cv = {
            assessment: null,
            annotation: null
        };

        return {
            user: null, // login user uuid
            gdm: null, // GDM object given in UUID
            variant: null, // Variant object given in UUID
            pathogenicity: null, // If editing curation, pathogenicity we're editing
            assessment: null, // Assessment of pathogenicity
            submitBusy: false // True while form is submitting
        };
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var userAssessment;
        var gdmUuid = this.queryValues.gdmUuid;
        var variantUuid = this.queryValues.variantUuid;
        var pathogenicityUuid = this.queryValues.pathogenicityUuid;
        var user = this.queryValues.session_user;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            variantUuid && !pathogenicityUuid ? '/variants/' + variantUuid : '', // If we're loading a pathogenicity, it'll have the variant built in
            pathogenicityUuid ? '/pathogenicity/' + pathogenicityUuid : ''
        ]);

        // With all given query string variables, get the corresponding objects from the DB.
        this.getRestDatas(
            uris
        ).then(datas => {
            // See what we got back so we can build an object to copy in this React object's state to rerender the page.
            var stateObj = {};
            stateObj.user = user;
            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
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

            // Find the current user's pathogenicity's assessment from the pathogenicity's assessment list
            var user = this.props.session && this.props.session.user_properties;
            if (stateObj.pathogenicity && stateObj.pathogenicity.assessments && stateObj.pathogenicity.assessments.length) {
                userAssessment = Assessments.userAssessment(stateObj.pathogenicity.assessments, user && user.uuid);
            }

            // Make a new tracking object for the current assessment. Either or both of the original assessment or user can be blank
            // and assigned later. Then set the component state's assessment value to the assessment's value -- default if there was no
            // assessment.
            var assessmentObj = this.cv.assessmentTracker = new AssessmentTracker(userAssessment, user, 'Pathogenicity');
            this.setAssessmentValue(assessmentObj);

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
        this.cv.othersAssessed = false;
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

        value = this.getFormValue('supportexperimental');
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
            this.setState({submitBusy: true});

            var pathogenicityUuid = this.state.pathogenicity ? this.state.pathogenicity.uuid : '';
            //var pathogenicityUuid = (this.state.pathogenicity && this.state.pathogenicity.submitted_by.uuid === this.state.user) ? this.state.pathogenicity.uuid : '';

            // If pathogenicity object has no assessment object found with currently logged-in user
            // and form assessment has non-default value. The assessment might be a new one without a type,
            // so pass in the type.
            var promise = this.saveAssessment(this.cv.assessmentTracker, this.state.gdm.uuid, pathogenicityUuid);

            // Wait for the assessment to finish writing if needed, then handle the pathenogicity object
            promise.then(newAssessmentInfo => {
                // If this pathogenicity was assessed, then there was no form, so don't write the pathogenicity.
                if (!this.cv.assessmentTracker.isAssessed()) {
                    // Get updated GDM object to make sure we don't create extra pathogenicity objects
                    return this.getRestData('/gdm/' + this.state.gdm.uuid, null, true).then(freshGdm => {
                        var freshPathogenicity = curator.getPathogenicityFromVariant(freshGdm, this.queryValues.session_user, this.queryValues.variantUuid);
                        this.setState({'pathogenicity': freshPathogenicity});

                        // Convert form values to new flattened pathogenicity object.
                        var newPathogenicity = this.formToPathogenicity(this.state.pathogenicity);

                        // If we made a new assessment, add it to the pathogenicity's assessments
                        if (newAssessmentInfo.assessment && !newAssessmentInfo.update) {
                            //if (!newPathogenicity.assessments) {
                            //    newPathogenicity.assessments = [];
                            //}
                            //newPathogenicity.assessments.push(newAssessmentInfo.assessment['@id']);
                            newPathogenicity.assessments = [newAssessmentInfo.assessment['@id']]; // only login user's assessment is allowed.
                        }

                        // Assign a link to the pathogenicity's variant if new
                        if (!newPathogenicity.variant && this.state.variant) {
                            newPathogenicity.variant = this.state.variant['@id'];
                        }

                        // Either update or create the pathogenicity object in the DB
                        if (this.state.pathogenicity) {
                            // We're editing a pathogenicity. PUT the new pathogenicity object to the DB to update the existing one.
                            return this.putRestData('/pathogenicity/' + this.state.pathogenicity.uuid, newPathogenicity).then(data => {
                                return Promise.resolve({pathogenicity: data['@graph'][0], assessment: newAssessmentInfo.assessment});
                            });
                        } else {
                            // We created a pathogenicity; POST it to the DB
                            return this.postRestData('/pathogenicity/', newPathogenicity).then(data => {
                                return Promise.resolve({pathogenicity: data['@graph'][0], assessment: newAssessmentInfo.assessment});
                            });
                        }
                    });
                }

                // No pathogenicity to write because the pathogenicity form is read-only (assessed).
                return Promise.resolve({pathogenicity: null, assessment: newAssessmentInfo.assessment});
            }).then(data => {
                // Given pathogenicity has been saved (created or updated).
                // Now update the GDM to include the pathogenicity if it's new
                if (!this.state.pathogenicity && this.state.gdm && data.pathogenicity) {
                    return this.getRestData('/gdm/' + this.state.gdm.uuid, null, true).then(freshGdm => {
                        // New pathogenicity; add it to the GDM’s pathogenicity array.
                        var newGdm = curator.flatten(freshGdm);
                        if (newGdm.variantPathogenicity && newGdm.variantPathogenicity.length) {
                            newGdm.variantPathogenicity.push(data.pathogenicity['@id']);
                        } else {
                            newGdm.variantPathogenicity = [data.pathogenicity['@id']];
                        }

                        // Write the updated GDM
                        return this.putRestData('/gdm/' + this.state.gdm.uuid, newGdm).then(() => {
                            return Promise.resolve(_.extend(data, {modified: false}));
                        });
                    });
                }

                // Existing pathogenicity modified
                return Promise.resolve(_.extend(data, {modified: true}));
            }).then(data => {
                // Write the pathogenicity history
                var meta = {
                    pathogenicity: {
                        variantId: this.state.variant.clinvarVariantId ? this.state.variant.clinvarVariantId : this.state.variant.otherDescription,
                        variant: this.state.variant['@id'],
                        gdm: this.state.gdm['@id']
                    }
                };
                this.recordHistory(data.modified ? 'modify' : 'add', data.pathogenicity ? data.pathogenicity : this.state.pathogenicity, meta).then(() => {
                    return this.saveAssessmentHistory(data.assessment, this.state.gdm, data.pathogenicity ? data.pathogenicity : this.state.pathogenicity, false);
                });

                // Now go back to Record Curation
                this.setState({submitBusy: false}); // done w/ form submission; turn the submit button back on, just in case
                var gdmQs = this.state.gdm ? '?gdm=' + this.state.gdm.uuid : '';
                var pmidQs = this.queryValues.pmid ? '&pmid=' + this.queryValues.pmid : '';
                this.context.navigate('/curation-central/' + gdmQs + pmidQs);
            }).catch(function(e) {
                console.log('PATHOGENICITY CREATION ERROR=: %o', e);
            });
        }
    },

    render: function() {
        var gdm = this.state.gdm;
        var variant = this.state.variant;
        var pathogenicity = this.state.pathogenicity;
        var otherPathogenicityList = []; // pathogenicity generated by other user, not the login user
        var allPathogenicityList = [];
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        var curatorName = this.props.session && this.props.session.user_properties ? this.props.session.user_properties.title : '';

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.pmid = queryKeyValue('pmid', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.variantUuid = queryKeyValue('variant', this.props.href);
        this.queryValues.pathogenicityUuid = queryKeyValue('pathogenicity', this.props.href);
        this.queryValues.session_user = queryKeyValue('user', this.props.href);
        this.queryValues.all = queryKeyValue('all', this.props.href) === "";

        // Get the currently selected annotation from the PMID, converted to the corresponding annotation object.
        var annotation = (gdm && this.queryValues.pmid) ? curator.pmidToAnnotation(gdm, this.queryValues.pmid) : null;

        // Get the user's UUID, either from the query string or from the annotation
        var user = this.queryValues.session_user ? this.queryValues.session_user : (annotation ? annotation.submitted_by.uuid : '');

        // If we're editing a pathogenicity, get a list of all the variant's pathogenicities, except for the one
        // we're editing. This is to display the list of past curations.
        //var assessed = false;
        var validAssessments = []; // filter out those with value Not Assessed
        if (this.queryValues.all && variant && gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
            _.map(gdm.variantPathogenicity, patho => {
                var pathoVariant = patho.variant;
                if (pathoVariant.uuid === variant.uuid) {
                    allPathogenicityList.push(patho);
                    if (patho.submitted_by.uuid !== user) {
                        otherPathogenicityList.push(patho);
                    }

                    // collect assessments to the variant from different users
                    if (patho.assessments && patho.assessments.length && patho.assessments[0].value !== 'Not Assessed') {
                        //assessed = true;
                        validAssessments.push(patho.assessments[0]);
                    }
                }
            });
        }
        //if (this.queryValues.all && variant && variant.associatedPathogenicities && variant.associatedPathogenicities.length) {
        //    otherPathogenicityList = _(variant.associatedPathogenicities).filter(function(fp) {
        //        return fp.submitted_by.uuid !== user;
        //    });
        //}


        // Set up the deNovo type for the dropdown
        var denovoType = pathogenicity ? (pathogenicity.denovoType === "" ? "none" : pathogenicity.denovoType) : "none";

        return (
            <div>
                <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={this.queryValues.pmid} />
                <div className="container">
                    {!this.queryValues.all && annotation && annotation.article ?
                        <div className="curation-pmid-summary">
                            <PmidSummary article={annotation.article} displayJournal pmidLinkout />
                        </div>
                    : null}
                    <div className="viewer-titles">
                        <h1>{(pathogenicity ? 'Edit' : 'Curate') + ' Variant Information'}</h1>
                        {curatorName ? <h2>{'Curator: ' + curatorName}</h2> : null}
                        <VariantAssociationsHeader gdm={gdm} variant={variant} />
                        {variant ?
                            <h2>{variant.clinvarVariantId ?
                                <div className="row variant-association-header">
                                    <dl className="dl-horizontal">
                                        <dt>{gdm && annotation ? <a href={'/curation-central/?gdm=' + gdm.uuid + '&pmid=' + annotation.article.pmid}><i className="icon icon-briefcase"></i></a> : null} &#x2F;&#x2F; VariationID</dt>
                                        <dd><a href={external_url_map['ClinVarSearch'] + variant.clinvarVariantId} title={"ClinVar entry for variant " + variant.clinvarVariantId + " in new tab"} target="_blank">{variant.clinvarVariantId}</a></dd>
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>ClinVar Preferred Title</dt>
                                        <dd>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : null}</dd>
                                    </dl>
                                </div>
                            :
                                <div className="row variant-association-header">
                                    <dl className="dl-horizontal">
                                        {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (gdm.annotations[0].article.pmid ? '&pmid=' + gdm.annotations[0].article.pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    </dl>
                                    <dl className="dl-horizontal">
                                        <dt>Other Description</dt>
                                        <dd>{variant.otherDescription ? variant.otherDescription : null}</dd>
                                    </dl>
                                </div>
                            }</h2>
                        : null}
                    </div>
                    <div className="row group-curation-content">
                        <div className="col-sm-12">
                            {!this.queryValues.pathogenicityUuid || pathogenicity ?
                                <div>
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        {this.cv && this.cv.assessmentTracker && !this.cv.assessmentTracker.isAssessed() ?
                                            <PanelGroup accordion>
                                                <Panel title="Evaluation of Pathogenicity" open>
                                                    <div className="row">
                                                        <Input type="select" ref="consistentdisease" label="Is variant type consistent with disease mechanism?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.consistentWithDiseaseMechanism)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="select" ref="functionaldomain" label="Variant within functional domain:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.withinFunctionalDomain)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="select" ref="frequencysupport" label="Does frequency data support pathogenicity?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.frequencySupportPathogenicity)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="select" ref="previouslyreported" label="Previously reported?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.previouslyReported)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="select" ref="denovo" label="de novo Type (inferred or confirmed):" defaultValue="none" value={denovoType}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Inferred">Inferred</option>
                                                            <option value="Confirmed">Confirmed</option>
                                                        </Input>
                                                        <Input type="select" ref="intrans" label="In trans with another variant:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.intransWithAnotherVariant)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="select" ref="supportsegregation" label="Supporting segregation data:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.supportingSegregation)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="select" ref="supportexperimental" label="Supporting experimental data:" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.supportingExperimental)}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                            <option value="none">No Selection</option>
                                                            <option disabled="disabled"></option>
                                                            <option value="Yes">Yes</option>
                                                            <option value="No">No</option>
                                                        </Input>
                                                        <Input type="textarea" ref="comments" label="Variant comments:" rows="5" value={pathogenicity && pathogenicity.comment}
                                                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                                    </div>
                                                </Panel>
                                            </PanelGroup>
                                        : (pathogenicity ? <VariantCurationView key={pathogenicity.uuid} pathogenicity={pathogenicity} note="Note: To Edit the pathogenicity evaluation, first change your assessment to “Not assessed” and click Save, then Edit the Variant again."/> : null) }

                                        <Panel panelClassName="panel-data">
                                            <dl className="dl-horizontal">
                                                <div>
                                                    <dt>Assessments</dt>
                                                    <dd>
                                                        {validAssessments.length ?
                                                            <div>
                                                                {validAssessments.map(function(assessment, i) {
                                                                    return (
                                                                        <span key={assessment.uuid}>
                                                                            {assessment.value} ({assessment.submitted_by.title})
                                                                            {i < validAssessments.length-1 ? <br /> : null}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        :
                                                            <div>None</div>
                                                        }
                                                    </dd>
                                                </div>
                                            </dl>
                                        </Panel>

                                        <AssessmentPanel panelTitle="Variant Assessment" assessmentTracker={this.cv.assessmentTracker} updateValue={this.updateAssessmentValue} accordion open />
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ?
                                                <a href={'/curation-central/?gdm=' + gdm.uuid + (this.queryValues.pmid ? '&pmid=' + this.queryValues.pmid : '')} className="btn btn-default btn-inline-spacer pull-right">Cancel</a>
                                            : null}
                                        </div>
                                    </Form>
                                    {otherPathogenicityList.length > 0 ?
                                        <div>
                                            {otherPathogenicityList.map(function(pathogenicity) {
                                                return <VariantCurationView key={pathogenicity.uuid} pathogenicity={pathogenicity} named />;
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
        pathogenicity: React.PropTypes.object.isRequired, // Variant pathogenicity to display
        note: React.PropTypes.string, // Note to display above key-value pairs.
        named: React.PropTypes.bool // TRUE to put curator's name in title bar
    },

    render: function() {
        var pathogenicity = this.props.pathogenicity;
        var variant = pathogenicity && pathogenicity.variant;
        var variantTitle = variant ? (variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 50)) : '';
        var title = this.props.named ? <h4><span className="panel-title-std">{'Curated/Assessed by: ' + pathogenicity.submitted_by.title}</span></h4> : <h4><span className="panel-title-std">Evaluation of Pathogenicity</span></h4>;
        var assessments = pathogenicity.assessments && pathogenicity.assessments.length ? pathogenicity.assessments : [];

        return (
            <div>
                {pathogenicity && variant ?
                    <Panel title={title} panelClassName="panel-data">
                        {this.props.note ?
                            <p className="alert alert-info">{this.props.note}</p>
                        : null}
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
        var variant = pathogenicity.variantId;

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


// Display a history item for adding variant pathogenicities
var PathogenicityAddModHistory = React.createClass({
    propTypes: {
        history: React.PropTypes.object.isRequired, // History object
        user: React.PropTypes.object // User session session ? '&user=' + session.user_properties.uuid : ''
    },

    render: function() {
        var history = this.props.history;
        var pathogenicity = history.primary;
        var gdm = history.meta.pathogenicity.gdm;
        var variant = history.meta.pathogenicity.variant;
        var user = this.props.user;
        var pathogenicityUri = '/variant-curation/?all&gdm=' + gdm.uuid + '&variant=' + variant.uuid + '&pathogenicity=' + pathogenicity.uuid + (user ? '&user=' + user.uuid : '');

        return (
            <div>
                <span>Variant <a href={pathogenicityUri}>{history.meta.pathogenicity.variantId}</a> pathogenicity {history.operationType === 'add' ? <span>added</span> : <span>modified</span>}</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(PathogenicityAddModHistory, 'pathogenicity', 'add');
globals.history_views.register(PathogenicityAddModHistory, 'pathogenicity', 'modify');


// Display a history item for deleting variant pathogenicities
var PathogenicityDeleteHistory = React.createClass({
    render: function() {
        return <div>PATHOGENICITYDELETE</div>;
    }
});

globals.history_views.register(PathogenicityDeleteHistory, 'pathogenicity', 'delete');


// Display a history item for adding a variant
var VariantAddHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var variant = history.primary;

        return (
            <div>
                <span>Variant <strong>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : variant.hgvsNames.GRCh37)}</strong> added</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(VariantAddHistory, 'variant', 'add');


// Display a history item for adding a variant
var VariantDeleteHistory = React.createClass({
    render: function() {
        return <div>VARIANTDELETE</div>;
    }
});

globals.history_views.register(VariantDeleteHistory, 'variant', 'delete');
