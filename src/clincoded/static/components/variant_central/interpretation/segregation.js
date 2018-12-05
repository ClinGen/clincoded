'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { RestMixin } from '../../rest';
import { Form, FormMixin, Input } from '../../../libs/bootstrap/form';
import { PanelGroup, Panel } from '../../../libs/bootstrap/panel';
import { CompleteSection } from './shared/complete_section';
import { scrollElementIntoView } from '../../../libs/helpers/scroll_into_view';

const vciFormHelper = require('./shared/form');
const CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
const evaluation_section_mapping = require('./mapping/evaluation_section.json');
const extraEvidence = require('./shared/extra_evidence');

// Display the curator data of the curation data
var CurationInterpretationSegregation = module.exports.CurationInterpretationSegregation = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        interpretation: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
        href_url: PropTypes.object,
        affiliation: PropTypes.object,
        session: PropTypes.object,
        selectedCriteria: PropTypes.string
    },

    getInitialState() {
        return {
            data: this.props.data,
            clinvar_id: null,
            interpretation: this.props.interpretation,
            selectedCriteria: this.props.selectedCriteria
        };
    },

    componentDidMount() {
        if (this.state.selectedCriteria) {
            setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
        }
    },

    componentWillReceiveProps(nextProps) {
        this.setState({data: nextProps.data, interpretation: nextProps.interpretation});
        if (nextProps.selectedCriteria) {
            this.setState({selectedCriteria: nextProps.selectedCriteria}, () => {
                setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
            });
        }
    },

    renderCriteriaEvalLink() {
        return (
            <span>
                <a href="https://www.clinicalgenome.org/working-groups/sequence-variant-interpretation/" target="_blank" rel="noopener noreferrer">
                    Sequence Variant Interpretation (SVI) Working Group guidance
                </a>
            </span>
        );
    },

    render() {
        const affiliation = this.props.affiliation, session = this.props.session;

        return (
            <div className="variant-interpretation segregation">
                {this.state.interpretation ?
                    <p className="alert alert-warning">Users should not enter unique or sensitive information that is likely to identify an individual.
                        Users should not publish data found in this interface without permission from the individual(s) who entered the data. For publication
                        of aggregate information, please contact ClinGen at <a href="mailto:clingen@clinicalgenome.org">clingen@clinicalgenome.org</a>.</p>
                    : null }
                <PanelGroup accordion><Panel title="Observed in healthy adult(s)" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-observed-in-healthy" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup1} criteria={['BS2']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup1Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="observed-in-healthy" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Observed in healthy adult(s))</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Case-control" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-case-control" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup2} criteria={['PS4']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup2Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="case-control" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Case-control)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Segregation data" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-segregation-data" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup3} criteria={['BS4', 'PP1']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup3Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="segregation-data" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Segregation data)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title={<h4><i>de novo</i> occurrence</h4>} panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-de-novo" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup4} criteria={['PM6', 'PS2']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup4Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} criteriaEvalNote={this.renderCriteriaEvalLink} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="de-novo" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (<i>de novo</i> occurrence)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title={<h4>Allele data (<i>cis/trans</i>)</h4>} panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-allele-data" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup5} criteria={['BP2', 'PM3']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup5Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="allele-data" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Allele Data (<i>cis/trans</i>))</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Alternate mechanism for disease" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-alternate-mechanism" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup6} criteria={['BP5']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup6Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="alternate-mechanism" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Alternate mechanism for disease)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Specificity of phenotype" panelBodyClassName="panel-wide-content"
                    panelClassName="tab-segegration-panel-specificity-of-phenotype" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup7} criteria={['PP4']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup7Update} variantUuid={this.state.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                    <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="specificity-of-phenotype" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Specificity of phenotype)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Reputable source" panelBodyClassName="panel-wide-content reputable-source"
                    panelClassName="tab-segegration-panel-reputable-source" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup8} criteria={['BP6', 'PP5']}
                                    evidenceData={null} evidenceDataUpdated={true} criteriaCrossCheck={[['BP6', 'PP5']]}
                                    formDataUpdater={criteriaGroup8Update} variantUuid={this.state.data['@id']} formChangeHandler={criteriaGroup8Change}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    disableEvalForm={true} affiliation={affiliation} session={session} />
                            </div>
                        </div>
                        : null}
                </Panel></PanelGroup>

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="segregation-case" updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
            </div>
        );
    }
});


// code for rendering of this group of interpretation forms
var criteriaGroup1 = function() {
    let criteriaList1 = ['BS2'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BS2'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup2 = function() {
    let criteriaList1 = ['PS4'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup2Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PS4'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup3 = function() {
    let criteriaList1 = ['BS4'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false], // array indicating hidden status of explanation boxes for above list of criteria codes
        criteriaList2 = ['PP1'], // array of criteria code handled subgroup of this section
        hiddenList2 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                true
            )}
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList2),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList2),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList2, hiddenList2, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup3Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BS4', 'PP1'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup4 = function() {
    let criteriaList1 = ['PM6'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false], // array indicating hidden status of explanation boxes for above list of criteria codes
        criteriaList2 = ['PS2'], // array of criteria code handled subgroup of this section
        hiddenList2 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                true
            )}
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList2),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList2),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList2, hiddenList2, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup4Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PM6', 'PS2'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup5 = function() {
    let criteriaList1 = ['BP2'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false], // array indicating hidden status of explanation boxes for above list of criteria codes
        criteriaList2 = ['PM3'], // array of criteria code handled subgroup of this section
        hiddenList2 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                true
            )}
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList2),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList2),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList2, hiddenList2, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup5Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP2', 'PM3'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup6 = function() {
    let criteriaList1 = ['BP5'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup6Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP5'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup7 = function() {
    let criteriaList1 = ['PP4'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup7Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PP4'], null);
};


/**
 * Callback for rendering of this group of interpretation forms
 * Disabling form currently only applies to 'BP6' and 'PP5' if the gene is NEITHER BRCA1 or BRCA2
 * @param {boolean} disableEvalForm - The flag to disable criteria evaluation form
 */
var criteriaGroup8 = function(disableEvalForm) {
    let criteriaList1 = ['BP6', 'PP5'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false, true]; // array indicating hidden status of explanation boxes for above list of criteria codes
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1, disableEvalForm),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, null, null, disableEvalForm),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup8Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP6', 'PP5'], null);
};
// code for handling logic within the form
var criteriaGroup8Change = function(ref, e) {
    // Both explanation boxes for both criteria of each group must be the same
    vciFormHelper.shareExplanation.call(this, ref, ['BP6', 'PP5']);
};
