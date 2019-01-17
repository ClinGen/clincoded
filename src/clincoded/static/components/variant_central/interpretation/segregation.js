'use strict';
// Third-party libs
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
// import { Form, FormMixin, Input } from 'libs/bootstrap/form';
import { PanelGroup, Panel } from 'libs/bootstrap/panel';

// Internal libs
import { RestMixin } from 'components/rest';
import { CompleteSection } from 'components/variant_central/interpretation/shared/complete_section';
import { scrollElementIntoView } from 'libs/helpers/scroll_into_view';

const vciFormHelper = require('components/variant_central/interpretation/shared/form');
const CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
const evaluation_section_mapping = require('components/variant_central/interpretation/mapping/evaluation_section.json');
import { ExtraEvidenceTable } from 'components/variant_central/interpretation/segregation/addEvidence';

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
        let that = this;
        function getVariantUUID() {
            if (that.state && that.state.data) {
                return that.state.data['@id'];
            }
            return null;
        }
        const affiliation = this.props.affiliation, session = this.props.session;
        let panel_data = [
            {
                title: 'Observed in healthy adult(s)',
                key: 1,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-observed-in-healthy',
                criteria: ['BS2'],
                curation: {
                    content: criteriaGroup1,
                    formDataUpdater: criteriaGroup1Update
                },
                extraEvidence: {
                    subcategory: 'observed-in-healthy',
                    tableName: <span>Curated Evidence (Observed in healthy adult(s))</span>
                }
            },
            {
                title: 'Case-control',
                key: 2,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-case-control',
                criteria: ['PS4'],
                curation: {
                    content: criteriaGroup2,
                    formDataUpdater: criteriaGroup2Update
                },
                extraEvidence: {
                    subcategory: 'case-control',
                    tableName: <span>Curated Literature Evidence (Case-control)</span>
                }
            },
            {
                title: 'Segregation data',
                key: 3,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-segregation-data',
                criteria: ['BS4', 'PP1'],
                curation: {
                    content: criteriaGroup3,
                    formDataUpdater: criteriaGroup3Update
                },
                extraEvidence: {
                    subcategory: 'segregation-data',
                    tableName: <span>Curated Literature Evidence (Segregation data)</span>
                }
            },
            {
                title: <h4><i>de novo</i> occurrence</h4>,
                key: 4,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-de-novo',
                criteria: ['PM6', 'PS2'],
                curation: {
                    content: criteriaGroup4,
                    formDataUpdater: criteriaGroup4Update
                },
                extraEvidence: {
                    subcategory: 'de-novo',
                    tableName: <span>Curated Literature Evidence (<i>de novo</i> occurrence)</span>
                }
            },
            {
                title: <h4>Allele data (<i>cis/trans</i>)</h4>,
                key: 5,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-allele-data',
                criteria: ['BP2', 'PM3'],
                curation: {
                    content: criteriaGroup5,
                    formDataUpdater: criteriaGroup5Update
                },
                extraEvidence: {
                    subcategory: 'allele-data',
                    tableName: <span>Curated Literature Evidence (Allele Data (<i>cis/trans</i>))</span>
                }
            },
            {
                title: 'Alternate mechanism for disease',
                key: 6,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-alternate-mechanism',
                criteria: ['BP5'],
                curation: {
                    content: criteriaGroup6,
                    formDataUpdater: criteriaGroup6Update
                },
                extraEvidence: {
                    subcategory: 'alternate-mechanism',
                    tableName: <span>Curated Literature Evidence (Alternate mechanism for disease)</span>
                }
            },
            {
                title: 'Specificity of phenotype',
                key: 7,
                bodyClassName: 'panel-wide-content',
                panelClassName: 'tab-segegration-panel-specificity-of-phenotype',
                criteria: ['PP4'],
                curation: {
                    content: criteriaGroup7,
                    formDataUpdater: criteriaGroup7Update
                },
                extraEvidence: {
                    subcategory: 'specificity-of-phenotype',
                    tableName: <span>Curated Literature Evidence (Specificity of phenotype)</span>
                }
            }
        ];

        const panels = panel_data.map(panel => {
            let interpretationForm = null;
            if (this.state.data && this.state.interpretation) {
              interpretationForm = <div className="row">
                  <div className="col-sm-12">
                    <CurationInterpretationForm
                        // Specific configutations
                        renderedFormContent={panel.curation.content}
                        criteria={panel.criteria}
                        formDataUpdater={panel.curation.formDataUpdater}
                        
                        // Common configurations
                        evidenceData={null}
                        evidenceDataUpdated={true}
                        variantUuid={getVariantUUID()}
                        interpretation={this.state.interpretation}
                        updateInterpretationObj={this.props.updateInterpretationObj}
                        affiliation={this.props.affiliation}
                        session={this.props.session}
                    />
                  </div>
                </div>
            }
            let extraEvidenceForm = <ExtraEvidenceTable 
                // Specific configurations
                subcategory={panel.extraEvidence.subcategory}
                tableName={panel.extraEvidence.tableName}
                criteriaList={panel.criteria}

                // Common configurations
                category="case-segregation"
                session={this.props.session}
                href_url={this.props.href_url}
                variant={this.state.data}
                interpretation={this.state.interpretation}
                updateInterpretationObj={this.props.updateInterpretationObj}
                viewOnly={this.state.data && !this.state.interpretation}
                affiliation={this.props.affiliation}
            />
            return <PanelGroup accordion key={panel.key}>
                <Panel
                    title={panel.title}
                    panelBodyClassName={panel.bodyClassName}
                    panelClassName={panel.panelClassName}
                    open
                    >
                        {interpretationForm}
                        {extraEvidenceForm}
                </Panel>
            </PanelGroup>
        });

        return (
            <div className="variant-interpretation segregation">
                {this.state.interpretation ?
                    <p className="alert alert-warning">Users should not enter unique or sensitive information that is likely to identify an individual.
                        Users should not publish data found in this interface without permission from the individual(s) who entered the data. For publication
                        of aggregate information, please contact ClinGen at <a href="mailto:clingen@clinicalgenome.org">clingen@clinicalgenome.org</a>.</p>
                    : null }

                {panels}

                <PanelGroup accordion><Panel title="Reputable source" panelBodyClassName="panel-wide-content reputable-source"
                    panelClassName="tab-segegration-panel-reputable-source" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <p className="alert alert-warning">ClinGen has determined that the following rules should not be applied in any context.</p>
                                <CurationInterpretationForm renderedFormContent={criteriaGroup8} criteria={['BP6', 'PP5']}
                                    evidenceData={null} evidenceDataUpdated={true} criteriaCrossCheck={[['BP6', 'PP5']]}
                                    formDataUpdater={criteriaGroup8Update} variantUuid={this.state.data['@id']}
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
    let criteriaList1 = ['BS2']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
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
    let criteriaList1 = ['PS4']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
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
        criteriaList2 = ['PP1']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
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
        criteriaList2 = ['PS2']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
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
        criteriaList2 = ['PM3']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
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
    let criteriaList1 = ['BP5']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
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
    let criteriaList1 = ['PP4']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
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
    let criteriaList1 = ['BP6', 'PP5']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, true)}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup8Update = function(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP6', 'PP5'], null);
};

