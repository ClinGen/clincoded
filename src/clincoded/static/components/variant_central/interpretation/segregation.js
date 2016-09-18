'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var vciFormHelper = require('./shared/form');
var extraEvidence = require('./shared/extra_evidence');
var CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
var CompleteSection = require('./shared/complete_section').CompleteSection;

var panel = require('../../../libs/bootstrap/panel');
var form = require('../../../libs/bootstrap/form');

var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the curator data of the curation data
var CurationInterpretationSegregation = module.exports.CurationInterpretationSegregation = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        href_url: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            clinvar_id: null,
            interpretation: this.props.interpretation
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
    },

    render: function() {
        return (
            <div className="variant-interpretation segregation">
                <PanelGroup accordion><Panel title="Observed in healthy adult(s)" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup1} criteria={['BS2']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup1Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="observed-in-healthy"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Observed in healthy adult(s))</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Case-control" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup2} criteria={['PS4']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup2Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="case-control"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Case-control)</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Segregation data" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup3} criteria={['BS4', 'PP1']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup3Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="segreagtion-data"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Segregation data)</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title={<h4><i>de novo</i> occurrence</h4>} panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup4} criteria={['PM6', 'PS2']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup4Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="de-novo"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (<i>de novo</i> occurrence)</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title={<h4>Allele data (<i>cis/trans</i>)</h4>} panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup5} criteria={['BP2', 'PM3']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup5Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="allele-data"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Allele Data (<i>cis/trans</i>))</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Alternate mechanism for disease" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup6} criteria={['BP5']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup6Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="alternate-mechanism"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Alternate mechanism for disease)</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Specificity of phenotype" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup7} criteria={['PP4']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup7Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="case-segregation" subcategory="specificity-of-phenotype"
                            href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Specificity of phenotype)</span>}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Reputable source" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup8} criteria={['BP6', 'PP5']}
                                    evidenceData={null} evidenceDataUpdated={true} criteriaCrossCheck={[['BP6', 'PP5']]}
                                    formDataUpdater={criteriaGroup8Update} variantUuid={this.props.data['@id']} formChangeHandler={criteriaGroup8Change}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
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


// code for rendering of this group of interpretation forms
var criteriaGroup8 = function() {
    let criteriaList1 = ['BP6', 'PP5'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false, true]; // array indicating hidden status of explanation boxes for above list of criteria codes
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
var criteriaGroup8Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP6', 'PP5'], null);
};
// code for handling logic within the form
var criteriaGroup8Change = function(ref, e) {
    // Both explanation boxes for both criteria of each group must be the same
    vciFormHelper.shareExplanation.call(this, ref, ['BP6', 'PP5']);
};
