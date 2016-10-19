'use strict';

import React, {PropTypes} from 'react';
import url from 'url';
import _ from 'underscore';
import moment from 'moment';

import * as curator from './curator';
import * as methods from './methods';
import { CaseControlEvalScore } from './case_control/evaluation_score';
import * as CuratorHistory from './curator_history';

import { RestMixin } from './rest';
import { queryKeyValue, country_codes, external_url_map, curator_page } from './globals';
import { Form, FormMixin, Input, InputMixin } from '../libs/bootstrap/form';
import { PanelGroup, Panel } from '../libs/bootstrap/panel';
import { parsePubmed } from '../libs/parse-pubmed';

const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;
const ViewRecordHeader = curator.ViewRecordHeader;
const CurationPalette = curator.CurationPalette;
const PmidSummary = curator.PmidSummary;
const DeleteButton = curator.DeleteButton;
const PmidDoiButtons = curator.PmidDoiButtons;

const CaseControlCuration = React.createClass({
    contextTypes: {
        navigate: React.PropTypes.func
    },

    mixins: [
        FormMixin, RestMixin, CurationMixin, CuratorHistory
    ],

    // Keeps track of values from the query string
    queryValues: {},

    getInitialState() {
        return {
            gdm: null, // GDM object given in UUID
            annotation: null, // Annotation object given in UUID
            group: null, // If we're editing a group, this gets the fleshed-out group object we're editing
            groupName: '', // Currently entered name of the group
            genotyping2Disabled: true, // True if genotyping method 2 dropdown disabled
            submitBusy: false // True while form is submitting
        };
    },

    // After the Group Curation page component mounts, grab the GDM and annotation UUIDs from the query
    // string and retrieve the corresponding annotation from the DB, if they exist.
    // Note, we have to do this after the component mounts because AJAX DB queries can't be
    // done from unmounted components.
    componentDidMount: function() {
        this.loadData();
    },

    // Load objects from query string into the state variables. Must have already parsed the query string
    // and set the queryValues property of this React class.
    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;
        var groupUuid = this.queryValues.groupUuid;
        var annotationUuid = this.queryValues.annotationUuid;

        // Make an array of URIs to query the database. Don't include any that didn't include a query string.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '',
            groupUuid ? '/groups/' + groupUuid : '',
            annotationUuid ? '/evidence/' + annotationUuid : ''
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

                    case 'group':
                        stateObj.group = data;
                        break;

                    case 'annotation':
                        stateObj.annotation = data;
                        break;

                    default:
                        break;
                }
            });

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // Based on the loaded data, see if the second genotyping method drop-down needs to be disabled.
            if (stateObj.group) {
                stateObj.genotyping2Disabled = !(stateObj.group.method && stateObj.group.method.genotypingMethods && stateObj.group.method.genotypingMethods.length);
                this.setState({groupName: stateObj.group.label});
            }

            // Set all the state variables we've collected
            this.setState(stateObj);

            // No one’s waiting but the user; just resolve with an empty promise.
            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    // Handle value changes in genotyping method 1
    handleChange: function(ref, e) {
        if (ref === 'genotypingmethod1' && this.refs[ref].getValue()) {
            this.setState({genotyping2Disabled: false});
        } else if (ref === 'groupname') {
            this.setState({groupName: this.refs[ref].getValue()});
        }
    },

    render() {
        let gdm = this.state.gdm;
        let annotation = this.state.annotation;
        let pmid = (annotation && annotation.article && annotation.article.pmid) ? annotation.article.pmid : null;
        let group = this.state.group;
        let method = (group && group.method && Object.keys(group.method).length) ? group.method : {};
        let submitErrClass = 'submit-err pull-right' + (this.anyFormErrors() ? '' : ' hidden');
        let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        // Get the 'evidence', 'gdm', and 'group' UUIDs from the query string and save them locally.
        this.queryValues.annotationUuid = queryKeyValue('evidence', this.props.href);
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.groupUuid = queryKeyValue('group', this.props.href);
        this.queryValues.editShortcut = queryKeyValue('editsc', this.props.href) === '';

        // define where pressing the Cancel button should take you to
        var cancelUrl;
        if (gdm) {
            cancelUrl = (!this.queryValues.groupUuid || this.queryValues.editShortcut) ?
                '/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')
                : '/group-submit/?gdm=' + gdm.uuid + (group ? '&group=' + group.uuid : '') + (annotation ? '&evidence=' + annotation.uuid : '');
        }

        return (
            <div>
                {(!this.queryValues.groupUuid || group) ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} linkGdm={true} pmid={pmid} />
                        <div className="container">
                            {annotation && annotation.article ?
                                <div className="curation-pmid-summary">
                                    <PmidSummary article={this.state.annotation.article} displayJournal pmidLinkout />
                                </div>
                            : null}
                            <div className="viewer-titles">
                                <h1>{(group ? 'Edit' : 'Curate') + ' Case-Control Evidence'}</h1>
                                <h2>
                                    {gdm ? <a href={'/curation-central/?gdm=' + gdm.uuid + (pmid ? '&pmid=' + pmid : '')}><i className="icon icon-briefcase"></i></a> : null}
                                    <span> &#x2F;&#x2F; {this.state.groupName ? <span> Group {this.state.groupName}</span> : <span className="no-entry">No entry</span>}</span>
                                </h2>
                            </div>
                            <div className="row group-curation-content">
                                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                    <div className="col-sm-6 case-cohort-curation">
                                        <PanelGroup accordion>
                                            <Panel title="Case Cohort" panelClassName="case-cohort" open>
                                                {GroupName.call(this, 'case-cohort')}
                                                {GroupCommonDiseases.call(this, 'case-cohort')}
                                                {GroupDemographics.call(this)}
                                                {methods.render.call(this, method, false, true)}
                                                {GroupPower.call(this, 'case-cohort')}
                                                {GroupAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                    <div className="col-sm-6 control-cohort-curation">
                                        <PanelGroup accordion>
                                            <Panel title="Control Cohort" panelClassName="control-cohort" open>
                                                {GroupName.call(this, 'control-cohort')}
                                                {GroupCommonDiseases.call(this, 'control-cohort')}
                                                {GroupDemographics.call(this)}
                                                {methods.render.call(this, method, false, true)}
                                                {GroupPower.call(this, 'control-cohort')}
                                                {GroupAdditional.call(this)}
                                            </Panel>
                                        </PanelGroup>
                                    </div>
                                    <div className="col-sm-12 case-control-curation">
                                        <PanelGroup accordion>
                                            <Panel title="Case-Control Evaluation & Score" panelClassName="case-control-eval-score" open>
                                                <CaseControlEvalScore />
                                            </Panel>
                                        </PanelGroup>
                                        <div className="curation-submit clearfix">
                                            <Input type="submit" inputClassName="btn-primary pull-right btn-inline-spacer" id="submit" title="Save" submitBusy={this.state.submitBusy} />
                                            {gdm ? <a href={cancelUrl} className="btn btn-default btn-inline-spacer pull-right">Cancel</a> : null}
                                            {group ?
                                                <DeleteButton gdm={gdm} parent={annotation} item={group} pmid={pmid} />
                                            : null}
                                            <div className={submitErrClass}>Please fix errors on the form and resubmit.</div>
                                        </div>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    </div>
                : null}
            </div>
        );
    }
});

curator_page.register(CaseControlCuration, 'curator_page', 'case-control-curation');

// Group Name group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupName(groupType) {
    const group = this.state.group;
    let label;
    if (groupType === 'case-cohort') {
        label = 'Case Cohort Label:';
    }
    if (groupType === 'control-cohort') {
        label = 'Control Cohort Label:';
    }

    return (
        <div className="row section section-label">
            <Input type="text" ref="groupname" label={label} value={group && group.label} maxLength="60" handleChange={this.handleChange}
                error={this.getFormError('groupname')} clearError={this.clrFormErrors.bind(null, 'groupname')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" required />
            <p className="col-sm-7 col-sm-offset-5 input-note-below">{curator.renderLabelNote('Group')}</p>
        </div>
    );
}

// Common diseases group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupCommonDiseases(groupType) {
    const group = this.state.group;
    let orphanetidVal, hpoidVal, nothpoidVal;
    let inputDisabled = (groupType === 'control-cohort') ? true : false;

    if (group) {
        orphanetidVal = group.commonDiagnosis ? group.commonDiagnosis.map(function(disease) { return 'ORPHA' + disease.orphaNumber; }).join(', ') : null;
        hpoidVal = group.hpoIdInDiagnosis ? group.hpoIdInDiagnosis.join(', ') : null;
        nothpoidVal = group.hpoIdInElimination ? group.hpoIdInElimination.join(', ') : null;
    }

    return (
        <div className="row section section-disease">
            <h3 data-toggle="collapse" data-target="#collapsible" aria-expanded="true" aria-controls="collapsible">Common Disease(s) & Phenotype(s)</h3>
            <div id="collapsible" className="collapse in" aria-expanded="true">
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-warning">Please enter an Orphanet ID(s) and/or HPO ID(s) and/or Phenotype free text (required).</p>
            </div>
            <Input type="text" ref="orphanetid" label={<LabelOrphanetId />} value={orphanetidVal} placeholder="e.g. ORPHA15" inputDisabled={inputDisabled}
                error={this.getFormError('orphanetid')} clearError={this.clrMultiFormErrors.bind(null, ['orphanetid', 'hpoid', 'phenoterms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="text" ref="hpoid" label={<LabelHpoId />} value={hpoidVal} placeholder="e.g. HP:0010704, HP:0030300" inputDisabled={inputDisabled}
                error={this.getFormError('hpoid')} clearError={this.clrMultiFormErrors.bind(null, ['orphanetid', 'hpoid', 'phenoterms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="phenoterms" label={<LabelPhenoTerms />} rows="5" value={group && group.termsInDiagnosis} inputDisabled={inputDisabled}
                error={this.getFormError('phenoterms')} clearError={this.clrMultiFormErrors.bind(null, ['orphanetid', 'hpoid', 'phenoterms'])}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">Enter <em>phenotypes that are NOT present in Group</em> if they are specifically noted in the paper.</p>
            <Input type="text" ref="nothpoid" label={<LabelHpoId not />} value={nothpoidVal} placeholder="e.g. HP:0010704, HP:0030300" inputDisabled={inputDisabled}
                error={this.getFormError('nothpoid')} clearError={this.clrFormErrors.bind(null, 'nothpoid')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" inputClassName="uppercase-input" />
            <Input type="textarea" ref="notphenoterms" label={<LabelPhenoTerms not />} rows="5" value={group && group.termsInElimination} inputDisabled={inputDisabled}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            </div>
        </div>
    );
}

// HTML labels for inputs follow.
var LabelOrphanetId = React.createClass({
    render: function() {
        return <span>Disease(s) in Common (<span className="normal"><a href={external_url_map['OrphanetHome']} target="_blank" title="Orphanet home page in a new tab">Orphanet</a> term</span>):</span>;
    }
});

// HTML labels for inputs follow.
var LabelHpoId = React.createClass({
    propTypes: {
        not: React.PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
                <span className="normal">(<a href={external_url_map['HPOBrowser']} target="_blank" title="Open HPO Browser in a new tab">HPO</a> ID(s))</span>:
            </span>
        );
    }
});

// HTML labels for inputs follow.
var LabelPhenoTerms = React.createClass({
    propTypes: {
        not: React.PropTypes.bool // T to show 'NOT' version of label
    },

    render: function() {
        return (
            <span>
                {this.props.not ? <span className="emphasis">NOT Phenotype(s)&nbsp;</span> : <span>Phenotype(s) in Common&nbsp;</span>}
                (<span className="normal">free text</span>):
            </span>
        );
    }
});

// Demographics group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupDemographics() {
    var group = this.state.group;

    return (
        <div className="row section section-demographics">
            <h3>Demographics</h3>
            <Input type="number" ref="malecount" label="# males:" value={group && group.numberOfMale}
                error={this.getFormError('malecount')} clearError={this.clrFormErrors.bind(null, 'malecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="femalecount" label="# females:" value={group && group.numberOfFemale}
                error={this.getFormError('femalecount')} clearError={this.clrFormErrors.bind(null, 'femalecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="country" label="Country of Origin:" defaultValue="none" value={group && group.countryOfOrigin}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                {country_codes.map(function(country_code) {
                    return <option key={country_code.code} value={country_code.name}>{country_code.name}</option>;
                })}
            </Input>
            <Input type="select" ref="ethnicity" label="Ethnicity:" defaultValue="none" value={group && group.ethnicity}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="Hispanic or Latino">Hispanic or Latino</option>
                <option value="Not Hispanic or Latino">Not Hispanic or Latino</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <Input type="select" ref="race" label="Race:" defaultValue="none" value={group && group.race}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="none">No Selection</option>
                <option disabled="disabled"></option>
                <option value="American Indian or Alaska Native">American Indian or Alaska Native</option>
                <option value="Asian">Asian</option>
                <option value="Black">Black</option>
                <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                <option value="White">White</option>
                <option value="Mixed">Mixed</option>
                <option value="Unknown">Unknown</option>
            </Input>
            <h4 className="col-sm-7 col-sm-offset-5">Age Range</h4>
            <div className="demographics-age-range">
                <Input type="select" ref="agerangetype" label="Type:" defaultValue="none" value={group && group.ageRangeType}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Onset">Onset</option>
                    <option value="Report">Report</option>
                    <option value="Diagnosis">Diagnosis</option>
                    <option value="Death">Death</option>
                </Input>
                <Input type="text-range" labelClassName="col-sm-5 control-label" label="Value:" wrapperClassName="col-sm-7 group-age-fromto">
                    <Input type="number" ref="agefrom" inputClassName="input-inline" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError('agefrom')} clearError={this.clrFormErrors.bind(null, 'agefrom')} value={group && group.ageRangeFrom} />
                    <span className="group-age-inter">to</span>
                    <Input type="number" ref="ageto" inputClassName="input-inline" groupClassName="form-group-inline group-age-input"
                        error={this.getFormError('ageto')} clearError={this.clrFormErrors.bind(null, 'ageto')} value={group && group.ageRangeTo} />
                </Input>
                <Input type="select" ref="ageunit" label="Unit:" defaultValue="none" value={group && group.ageRangeUnit}
                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                    <option value="none">No Selection</option>
                    <option disabled="disabled"></option>
                    <option value="Days">Days</option>
                    <option value="Weeks">Weeks</option>
                    <option value="Months">Months</option>
                    <option value="Years">Years</option>
                </Input>
            </div>
        </div>
    );
}

// Group information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupPower(groupType) {
    var group = this.state.group;
    let type;
    if (groupType === 'case-cohort') {
        type = 'Case';
    }
    if (groupType === 'control-cohort') {
        type = 'Control';
    }

    return(
        <div className="row section section-power">
            <h3>Power</h3>
            <Input type="number" ref="indvariantgenecount" label={'Numeric value of ' + type + 's with variant(s):'} value={group && group.numberOfIndividualsWithVariantInCuratedGene}
                error={this.getFormError('indvariantgenecount')} clearError={this.clrFormErrors.bind(null, 'indvariantgenecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="notindvariantgenecount" label={'Numeric value of all ' + type + 's genotyped/sequenced:'} value={group && group.numberOfIndividualsWithoutVariantInCuratedGene}
                error={this.getFormError('notindvariantgenecount')} clearError={this.clrFormErrors.bind(null, 'notindvariantgenecount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="caseallelefreq" label={type + ' Allele Frequency:'} value={group && group.numberOfIndividualsWithoutVariantInCuratedGene}
                error={this.getFormError('calcallelefreq')} clearError={this.clrFormErrors.bind(null, 'calcallelefreq')} inputDisabled={true}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
}

// HTML labels for inputs follow.
var LabelOtherGenes = React.createClass({
    render: function() {
        return <span>Other genes found to have variants in them (<a href={external_url_map['HGNCHome']} title="HGNC home page in a new tab" target="_blank">HGNC</a> symbol):</span>;
    }
});

// Additional Information group curation panel. Call with .call(this) to run in the same context
// as the calling component.
function GroupAdditional() {
    var otherpmidsVal;
    var group = this.state.group;
    var othergenevariantsVal = group && group.otherGenes ? group.otherGenes.map(function(gene) { return gene.symbol; }).join() : null;
    if (group) {
        otherpmidsVal = group.otherPMIDs ? group.otherPMIDs.map(function(article) { return article.pmid; }).join(', ') : null;
    }

    return (
        <div className="row section section-additional-info">
            <h3>Additional Information</h3>
            <Input type="number" ref="indfamilycount" label="# individuals with family information:" value={group && group.numberOfIndividualsWithFamilyInformation}
                error={this.getFormError('indfamilycount')} clearError={this.clrFormErrors.bind(null, 'indfamilycount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="number" ref="indvariantothercount" label="# individuals with variant found in other gene:" value={group && group.numberOfIndividualsWithVariantInOtherGene}
                error={this.getFormError('indvariantothercount')} clearError={this.clrFormErrors.bind(null, 'indvariantothercount')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="text" ref="othergenevariants" label={<LabelOtherGenes />} inputClassName="uppercase-input" value={othergenevariantsVal} placeholder="e.g. DICER1, SMAD3"
                error={this.getFormError('othergenevariants')} clearError={this.clrFormErrors.bind(null, 'othergenevariants')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="additionalinfogroup" label="Additional Information about Group:" rows="5" value={group && group.additionalInformation}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="otherpmids" label="Enter PMID(s) that report evidence about this same Group:" rows="5" value={otherpmidsVal} placeholder="e.g. 12089445, 21217753"
                error={this.getFormError('otherpmids')} clearError={this.clrFormErrors.bind(null, 'otherpmids')}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-7 col-sm-offset-5">
                Note: Any variants associated with probands that will be counted towards the Classification are not
                captured at the Group level - variants and their association with probands are required to be captured
                at the Family or Individual level. Once you submit the Group information, you will be prompted to enter
                Family/Individual information.
            </p>
        </div>
    );
}
