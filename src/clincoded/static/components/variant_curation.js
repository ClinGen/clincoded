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
        assessment: '' // Value of assessment
    },

    getInitialState: function() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            variant: null, // Variant object given in UUID
            pathogenicity: null // If editing curation, pathogenicity we're editing
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
            variantUuid ? '/variants/' + variantUuid : '',
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

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
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

    updateAssessment: function(value) {
        this.componentVars.assessment = value;
    },

    // Convert filled-out form values to pathonegicity object, which is returned. Any existing pathogenicity object
    // (editing a variant) gets passed in currPathogenicity and gets modified with the new values.
    formToPathogenicity: function(currPathogenicity) {
        var newPathogenicity = currPathogenicity ? curator.flatten(currPathogenicity) : {};

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
        var promise;

        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            // Convert form values to new flattened pathogenicity object.
            var newPathogenicity = this.formToPathogenicity(this.state.pathogenicity);

            // Assign a link to the pathogenicity's variant if new
            if (!newPathogenicity.variant && this.state.variant) {
                newPathogenicity.variant = this.state.variant['@id'];
            }

            // Either update or create the pathogenicity object in the DB
            if (this.state.pathogenicity) {
                // We're editing a pathogenicity. PUT the new pathogenicity object to the DB to update the existing one.
                promise = this.putRestData('/pathogenicity/' + this.state.pathogenicity.uuid, newPathogenicity).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            } else {
                // We created a pathogenicity; POST it to the DB
                promise = this.postRestData('/pathogenicity/', newPathogenicity).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            }

            // Execute THEN after pathogenicty written
            promise.then(pathogenicity => {
                // Given pathogenicity has been saved (created or updated).
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

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.variantUuid = queryKeyValue('variant', this.props.href);
        this.queryValues.pathogenicityUuid = queryKeyValue('pathogenicity', this.props.href);
        this.queryValues.all = queryKeyValue('all', this.props.href) === "";

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
                    </div>
                    <div className="row group-curation-content">
                        <div className="col-sm-12">
                            {!this.queryValues.pathogenicityUuid || pathogenicity ?
                                <div>
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
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
                                        <AssessmentPanel panelTitle="Variant Assessment" updateValue={this.updateAssessment} />
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right" id="submit" title="Save" />
                                        </div>
                                    </Form>
                                    {gdm && gdm.variantPathogenicity && this.queryValues.all ?
                                        <div>
                                            {gdm.variantPathogenicity.map(function(pathogenicity) {
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
                    <Panel title={'Variant “' + variantTitle + '” curated by ' + pathogenicity.submitted_by.title} panelClassName="panel-data">
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Variant type consistent with disease mechanism</dt>
                                <dd>{pathogenicity.consistentWithDiseaseMechanism ? 'Yes' : 'No'}</dd>
                            </div>

                            <div>
                                <dt>Variant within functional domain</dt>
                                <dd>{pathogenicity.withinFunctionalDomain ? 'Yes' : 'No'}</dd>
                            </div>

                            <div>
                                <dt>Frequency data supports pathogenicity</dt>
                                <dd>{pathogenicity.frequencySupportPathogenicity ? 'Yes' : 'No'}</dd>
                            </div>

                            <div>
                                <dt>Previously reported</dt>
                                <dd>{pathogenicity.previouslyReported ? 'Yes' : 'No'}</dd>
                            </div>

                            <div>
                                <dt>de novo Type</dt>
                                <dd>{pathogenicity.denovoType}</dd>
                            </div>

                            <div>
                                <dt>In trans with another variant</dt>
                                <dd>{pathogenicity.intransWithAnotherVariant ? 'Yes' : 'No'}</dd>
                            </div>

                            <div>
                                <dt>Supporting segregation data</dt>
                                <dd>{pathogenicity.supportingSegregation ? 'Yes' : 'No'}</dd>
                            </div>

                            <div>
                                <dt>Supporting experimental data</dt>
                                <dd>{pathogenicity.supportingExperimental ? 'Yes' : 'No'}</dd>
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
