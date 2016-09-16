'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var vciFormHelper = require('./shared/form');
var CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
var CompleteSection = require('./shared/complete_section').CompleteSection;
var add_external_resource = require('../../add_external_resource');
var AddResourceId = add_external_resource.AddResourceId;

var panel = require('../../../libs/bootstrap/panel');
var form = require('../../../libs/bootstrap/form');
var curator = require('../../curator');
var PmidSummary = curator.PmidSummary;

var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

// Display the curator data of the curation data
var CurationInterpretationFunctional = module.exports.CurationInterpretationFunctional = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object,
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        href_url: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            clinvar_id: null,
            interpretation: this.props.interpretation,
            submitBusy: false,
            pmid: 0
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
    },

    updatePmid: function(article) {
        this.setState({pmid: article.pmid});
    },

    updateInterpretationPmids: function() {
        this.setState({submitBusy: true}); // Save button pressed; disable it and start spinner
        let flatInterpretation = null;
        let freshInterpretation = null;

        this.getRestData('/interpretation/' + this.state.interpretation.uuid).then(interpretation => {
            freshInterpretation = interpretation;
            flatInterpretation = curator.flatten(freshInterpretation);

            let extra_evidence = {
                variant: this.state.interpretation.variant['@id'],
                category: 'experimental',
                subcategory: 'experimental-studies',
                articles: [this.state.pmid],
                description: 'N/A'
            };

            return this.postRestData('/extra-evidence/', extra_evidence).then(result => {
                if (!flatInterpretation.extra_evidence_list) {
                    flatInterpretation.extra_evidence_list = [];
                }

                flatInterpretation.extra_evidence_list.push(result['@graph'][0]['@id']);

                return this.putRestData('/interpretation/' + this.state.interpretation.uuid, flatInterpretation).then(data => {
                    return Promise.resolve(data['@graph'][0]);
                });
            });
        }).then(interpretation => {
            this.setState({submitBusy: false});
            this.props.updateInterpretationObj();
        });
    },

    renderInterpretationExtraEvidence: function(extra_evidence) {
        return (
            <tr key={extra_evidence.subcategory + '_' + extra_evidence.articles[0].pmid}>
                <td><PmidSummary article={extra_evidence.articles[0]} displayJournal /></td>
                <td>{extra_evidence.description}</td>
                <td>Edit | Delete</td>
            </tr>

        );
    },

    render: function() {
        return (
            <div className="variant-interpretation functional">
                <PanelGroup accordion><Panel title="Hotspot or functional domain" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup1} criteria={['PM1']}
                                    evidenceData={null} evidenceDataUpdated={true}
                                    formDataUpdater={criteriaGroup1Update} variantUuid={this.props.data['@id']}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}
                </Panel></PanelGroup>
                <PanelGroup accordion><Panel title="Experimental Studies" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup2} criteria={['BS3', 'PS3']}
                                    evidenceData={null} evidenceDataUpdated={true} criteriaCrossCheck={[['BS3', 'PS3']]}
                                    formDataUpdater={criteriaGroup2Update} variantUuid={this.props.data['@id']} formChangeHandler={criteriaGroup2Change}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                            </div>
                        </div>
                    : null}

                    {this.state.interpretation ?
                        <div className="panel panel-info">
                            <div className="panel-heading"><h3 className="panel-title">PubMed Evidence</h3></div>
                            <div className="panel-content-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Article</th>
                                            <th>Description</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {this.state.interpretation.extra_evidence_list ?
                                            this.state.interpretation.extra_evidence_list.map(extra_evidence => {
                                                if (extra_evidence.subcategory === 'experimental-studies') {
                                                    return (this.renderInterpretationExtraEvidence(extra_evidence));
                                                }
                                            })
                                        : null}
                                        <tr>
                                            <td colSpan="3">
                                                <AddResourceId resourceType="pubmed"
                                                    protocol={this.props.href_url.protocol} parentObj={this.state.interpretation} buttonText="Add New PMID" modalButtonText="Add Article" updateParentForm={this.updatePmid} buttonOnly={true} />
                                                {this.state.pmid}
                                                <span onClick={this.updateInterpretationPmids}>Update</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    : null}
                </Panel></PanelGroup>

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="experimental" updateInterpretationObj={this.props.updateInterpretationObj} />
                : null}
            </div>
        );
    }
});


// code for rendering of this group of interpretation forms
var criteriaGroup1 = function() {
    let criteriaList1 = ['PM1'], // array of criteria code handled subgroup of this section
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
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PM1'], null);
};


// code for rendering of this group of interpretation forms
var criteriaGroup2 = function() {
    let criteriaList1 = ['BS3', 'PS3'], // array of criteria code handled subgroup of this section
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
var criteriaGroup2Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BS3', 'PS3'], null);
};
// code for handling logic within the form
var criteriaGroup2Change = function(ref, e) {
    // Both explanation boxes for both criteria of each group must be the same
    vciFormHelper.shareExplanation.call(this, ref, ['BS3', 'PS3']);
};
