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
                    {(this.props.data && this.state.interpretation) ?
                        <extraEvidence.ExtraEvidenceTable category="experimental" subcategory="experimental-studies" href_url={this.props.href_url}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
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
