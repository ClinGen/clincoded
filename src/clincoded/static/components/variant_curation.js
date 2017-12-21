'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { curator_page, content_views, history_views, truncateString, queryKeyValue, external_url_map, country_codes } from './globals';
import { RestMixin } from './rest';
import { Form, FormMixin, Input } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import * as CuratorHistory from './curator_history';
import * as methods from './methods';
import * as curator from './curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const VariantAssociationsHeader = curator.VariantAssociationsHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const PmidDoiButtons = curator.PmidDoiButtons;
import * as Assessments from './assessment';
const AssessmentTracker = Assessments.AssessmentTracker;
const AssessmentPanel = Assessments.AssessmentPanel;
const AssessmentMixin = Assessments.AssessmentMixin;
import { getAffiliationName } from '../libs/get_affiliation_name';

var VariantCuration = createReactClass({
    mixins: [FormMixin, RestMixin, CurationMixin, AssessmentMixin, CuratorHistory],

    contextTypes: {
        navigate: PropTypes.func
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
        return new Promise((resolve, reject)=> {
            let newPathogenicity = currPathogenicity ? curator.flatten(currPathogenicity) : {};
            newPathogenicity.variant = this.state.variant['@id'];

            // For each form field, put its non-default value into the new, flattened pathogenicity object
            let value = this.getFormValue('geneimpact');
            if (value !== 'none') {
                newPathogenicity.geneImpactType = value;
            } else if (newPathogenicity.geneImpactType) {
                delete newPathogenicity.geneImpactType;
            }
            value = this.getFormValue('supportallelic');
            if (value !== 'none') {
                newPathogenicity.allelicSupportGeneImpact = value === 'Yes';
            } else {
                delete newPathogenicity.allelicSupportGeneImpact;
            }
            value = this.getFormValue('supportcomputational');
            if (value !== 'none') {
                newPathogenicity.computationalSupportGeneImpact = value === 'Yes';
            } else {
                delete newPathogenicity.computationalSupportGeneImpact;
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
            } else if (newPathogenicity.comment) {
                delete newPathogenicity.comment;
            }
            // Add affiliation if the user is associated with an affiliation
            // and if the data object has no affiliation
            if (this.props.affiliation && Object.keys(this.props.affiliation).length) {
                if (!newPathogenicity.affiliation) {
                    newPathogenicity.affiliation = this.props.affiliation.affiliation_id;
                }
            }

            resolve(newPathogenicity);
        });
    },

    submitForm: function(e) {
        e.preventDefault(); e.stopPropagation(); // Don't run through HTML submit handler

        // Save all form values from the DOM.
        this.saveAllFormValues();

        // Start with default validation; indicate errors on form if not, then bail
        if (this.validateDefault()) {
            this.setState({submitBusy: true});

            var promise = this.formToPathogenicity(this.state.pathogenicity);
            promise.then(newPathogenicity => {
                if (this.state.pathogenicity) {
                    return this.putRestData(this.state.pathogenicity['@id'], newPathogenicity).then(data => {
                        return Promise.resolve({pathogenicity: data['@graph'][0]});
                    });
                } else {
                    return this.postRestData('/pathogenicity/', newPathogenicity).then(data => {
                        return Promise.resolve({pathogenicity: data['@graph'][0]});
                    });
                }
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
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        var curatorName = this.props.session && this.props.session.user_properties ? this.props.session.user_properties.title : '';

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.pmid = queryKeyValue('pmid', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.variantUuid = queryKeyValue('variant', this.props.href);
        this.queryValues.pathogenicityUuid = queryKeyValue('pathogenicity', this.props.href);
        this.queryValues.session_user = queryKeyValue('user', this.props.href);
        this.queryValues.all = queryKeyValue('all', this.props.href) === "";
        this.queryValues.affiliation = queryKeyValue('affiliation', this.props.href);

        // Get the currently selected annotation from the PMID, converted to the corresponding annotation object.
        var annotation = (gdm && this.queryValues.pmid) ? curator.pmidToAnnotation(gdm, this.queryValues.pmid) : null;

        // Get the user's UUID, either from the query string or from the annotation
        var user = this.queryValues.session_user ? this.queryValues.session_user : (annotation ? annotation.submitted_by.uuid : '');

        // If we're editing a pathogenicity, get a list of all the variant's pathogenicities, except for the one
        // we're editing. This is to display the list of past curations.
        var validAssessments = []; // filter out those with value Not Assessed
        if (this.queryValues.all && variant && gdm.variantPathogenicity && gdm.variantPathogenicity.length > 0) {
            _.map(gdm.variantPathogenicity, patho => {
                var pathoVariant = patho.variant;
                if (pathoVariant.uuid === variant.uuid) {
                    if (!this.queryValues.affiliation && !patho.affiliation && patho.submitted_by.uuid !== user) {
                        otherPathogenicityList.push(patho);
                    } else if (this.queryValues.affiliation && (!patho.affiliation || this.queryValues.affiliation !== patho.affiliation)) {
                        otherPathogenicityList.push(patho);
                    } else if (!this.queryValues.affiliation && patho.affiliation) {
                        otherPathogenicityList.push(patho);
                    }

                    // collect assessments to the variant from different users
                    if (patho.assessments && patho.assessments.length && patho.assessments[0].value !== 'Not Assessed') {
                        validAssessments.push(patho.assessments[0]);
                    }
                }
            });
        }

        let affiliation = this.props.affiliation;

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
                        {affiliation ? <h2>{'Curator: ' + affiliation.affiliation_fullname}</h2> : (curatorName ? <h2>{'Curator: ' + curatorName}</h2> : null)}
                        <VariantAssociationsHeader gdm={gdm} variant={variant} />
                        {variant ?
                            <h2>
                                <div className="row variant-association-header">
                                    <div>
                                        {gdm && annotation ? <a href={`/curation-central/?gdm=${gdm.uuid}&pmid=${annotation.article.pmid}`}><i className="icon icon-briefcase"></i></a> : null}
                                        {variant.clinvarVariantId ?
                                            <span>
                                                <span className="term-name"> &#x2F;&#x2F; ClinVar Variation ID: </span>
                                                <span className="term-value"><a href={`${external_url_map['ClinVarSearch']}${variant.clinvarVariantId}`} title={`ClinVar entry for variant ${variant.clinvarVariantId} in new tab`} target="_blank">{variant.clinvarVariantId}</a></span>
                                            </span>
                                            : null}
                                        {variant.carId ?
                                            <span>
                                                <span className="term-name"> &#x2F;&#x2F; ClinGen Allele Registry ID: </span>
                                                <span className="term-value"><a href={`http:${external_url_map['CARallele']}${variant.carId}.html`} title={`ClinGen Allele Registry entry for variant ${variant.carId} in new tab`} target="_blank">{variant.carId}</a></span>
                                            </span>
                                            : null}
                                    </div>
                                    <div>
                                        {variant.clinvarVariantTitle ?
                                            <span>
                                                <span className="term-name">ClinVar Preferred Title: </span>
                                                <span className="term-value">{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : null}</span>
                                            </span>
                                            :
                                            <span>
                                                <span className="term-name">Genomic HGVS Term: </span>
                                                <span className="term-value">{variant.hgvsNames && variant.hgvsNames.GRCh38 ? `${variant.hgvsNames.GRCh38} (GRCh38)` : null}</span>
                                            </span>
                                        }
                                    </div>
                                </div>
                            </h2>
                            : null}
                    </div>
                    <div className="row group-curation-content">
                        <div className="col-sm-12">
                            {!this.queryValues.pathogenicityUuid || pathogenicity ?
                                <div>
                                    <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                        <PanelGroup accordion>
                                            <Panel title="Evaluation of Pathogenicity" open>
                                                <div className="row">
                                                    <Input type="select" ref="geneimpact" label={<span>Select gene impact for variant:<br /><i className="non-bold-font">(Note: Required for score calculation)</i></span>}
                                                        defaultValue="none" value={pathogenicity && pathogenicity.geneImpactType ? pathogenicity.geneImpactType : 'none'}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="lof">Predicted or observed null</option>
                                                        <option value="non-lof">Other variant with gene impact</option>
                                                        <option value="insufficient">Insufficient evidence for gene impact</option>
                                                    </Input>
                                                    {variant ?
                                                        <div className="link-to-vci-box">
                                                            <a href={'/variant-central/?variant=' + variant.uuid} target="_blank">View evidence in Variant Curation Interface</a>
                                                        </div>
                                                        :
                                                        null
                                                    }
                                                    <Input type="select" ref="supportexperimental" label="Does Experimental evidence support gene impact?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.supportingExperimental)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </Input>
                                                    <Input type="select" ref="supportsegregation" label="Does Segregation evidence support gene impact?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.supportingSegregation)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </Input>
                                                    <Input type="select" ref="supportallelic" label="Does Allelic evidence support gene impact?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.allelicSupportGeneImpact)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </Input>
                                                    <Input type="select" ref="supportcomputational" label="Does Computational predictive evidence support gene impact?" defaultValue="none" value={pathogenicity && curator.booleanToDropdown(pathogenicity.computationalSupportGeneImpact)}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                                        <option value="none">No Selection</option>
                                                        <option disabled="disabled"></option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </Input>
                                                    <Input type="textarea" ref="comments" label="Additional information about variant:" rows="5" value={pathogenicity && pathogenicity.comment}
                                                        labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
                                                </div>
                                            </Panel>
                                        </PanelGroup>

                                        {validAssessments.length ?
                                            <Panel panelClassName="panel-data">
                                                <dl className="dl-horizontal">
                                                    <div>
                                                        <dt>Assessments</dt>
                                                        <dd>
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
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </Panel>
                                            :
                                            null
                                        }

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

curator_page.register(VariantCuration, 'curator_page', 'variant-curation');


// Display a single variant curation viewer panel
var VariantCurationView = createReactClass({
    propTypes: {
        pathogenicity: PropTypes.object.isRequired, // Variant pathogenicity to display
        note: PropTypes.string, // Note to display above key-value pairs.
        named: PropTypes.bool // TRUE to put curator's name in title bar
    },

    render: function() {
        var pathogenicity = this.props.pathogenicity;
        var variant = pathogenicity && pathogenicity.variant;
        var variantTitle = variant ? (variant.clinvarVariantId ? variant.clinvarVariantId : truncateString(variant.otherDescription, 50)) : '';
        var title = this.props.named ? <h4><span className="panel-title-std">{'Curated by: ' + (pathogenicity.affiliation ? getAffiliationName(pathogenicity.affiliation) : pathogenicity.submitted_by.title)}</span></h4> : <h4><span className="panel-title-std">Evaluation of Pathogenicity</span></h4>;
        var assessments = pathogenicity.assessments && pathogenicity.assessments.length ? pathogenicity.assessments : [];

        let impactType = '';
        if (pathogenicity.geneImpactType === 'lof') {
            impactType = 'Predicted or observed null';
        } else if (pathogenicity.geneImpactType === 'non-lof') {
            impactType = 'Other variant with gene impact';
        } else if (pathogenicity.geneImpactType === 'insufficient') {
            impactType = 'Insufficient evidence for gene impact';
        }

        return (
            <div>
                {pathogenicity && variant ?
                    <Panel title={title} panelClassName="panel-data">
                        {this.props.note ?
                            <p className="alert alert-info">{this.props.note}</p>
                            : null}
                        <dl className="dl-horizontal">
                            <div>
                                <dt>Gene impact for variant</dt>
                                <dd>{impactType}</dd>
                            </div>

                            <div>
                                <dt>Does Experimental evidence support gene impact</dt>
                                <dd>{pathogenicity.supportingExperimental === true ? 'Yes' : (pathogenicity.supportingExperimental === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Does Segregation evidence support gene impact</dt>
                                <dd>{pathogenicity.supportingSegregation === true ? 'Yes' : (pathogenicity.supportingSegregation === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Does Allelic evidence support gene impact</dt>
                                <dd>{pathogenicity.allelicSupportGeneImpact === true ? 'Yes' : (pathogenicity.allelicSupportGeneImpact === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Does Computational predictive evidence support gene impact</dt>
                                <dd>{pathogenicity.computationalSupportGeneImpact === true ? 'Yes' : (pathogenicity.computationalSupportGeneImpact === false ? 'No' : '')}</dd>
                            </div>

                            <div>
                                <dt>Additional information about variant</dt>
                                <dd>{pathogenicity.comment ? pathogenicity.comment : ''}</dd>
                            </div>
                        </dl>
                    </Panel>
                    : null}
            </div>
        );
    }
});


// Display the pathogenicity when its uuid is passed in the URL.
class VariantViewer extends Component {
    render() {
        var pathogenicity = this.props.context;
        var variant = pathogenicity.variant;

        return (
            <div className="container">
                <div className="row group-curation-content">
                    <div className="viewer-titles">
                        <h1>View Variant: {variant && variant.clinvarVariantId ? variant.clinvarVariantId : variant.otherDescription}</h1>
                    </div>
                    <VariantCurationView pathogenicity={pathogenicity} />
                </div>
            </div>
        );
    }
}

content_views.register(VariantViewer, 'pathogenicity');


// Display a history item for adding variant pathogenicities
class PathogenicityAddModHistory extends Component {
    render() {
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
                {pathogenicity.affiliation ?
                    <span>; last edited by {pathogenicity.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

PathogenicityAddModHistory.propTypes = {
    history: PropTypes.object.isRequired, // History object
    user: PropTypes.object // User session session ? '&user=' + session.user_properties.uuid : ''
};

history_views.register(PathogenicityAddModHistory, 'pathogenicity', 'add');
history_views.register(PathogenicityAddModHistory, 'pathogenicity', 'modify');


// Display a history item for deleting variant pathogenicities
class PathogenicityDeleteHistory extends Component {
    render() {
        return <div>PATHOGENICITYDELETE</div>;
    }
}

history_views.register(PathogenicityDeleteHistory, 'pathogenicity', 'delete');


// Display a history item for adding a variant
class VariantAddHistory extends Component {
    render() {
        var history = this.props.history;
        var variant = history.primary;

        return (
            <div>
                <span>Variant <strong><a href={"/variant-central/?variant=" + variant.uuid}>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : variant.hgvsNames.GRCh37)}</a></strong> added</span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
                {variant.affiliation ?
                    <span className="last-edited-by-name">; last edited by {variant.modified_by.title}</span>
                    : null}
            </div>
        );
    }
}

history_views.register(VariantAddHistory, 'variant', 'add');


// Display a history item for adding a variant
class VariantDeleteHistory extends Component {
    render() {
        return <div>VARIANTDELETE</div>;
    }
}

history_views.register(VariantDeleteHistory, 'variant', 'delete');
