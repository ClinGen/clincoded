'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var form = require('../../libs/bootstrap/form');
var Form = form.Form;
var Input = form.Input;
var FormMixin = form.FormMixin;

var queryKeyValue = globals.queryKeyValue;
var editQueryValue = globals.editQueryValue;

// Import individual tab components
var CurationInterpretationCriteria = require('./interpretation/criteria').CurationInterpretationCriteria;
var CurationInterpretationBasicInfo = require('./interpretation/basic_info').CurationInterpretationBasicInfo;
var CurationInterpretationPopulation = require('./interpretation/population').CurationInterpretationPopulation;
var CurationInterpretationComputational = require('./interpretation/computational').CurationInterpretationComputational;
var CurationInterpretationFunctional = require('./interpretation/functional').CurationInterpretationFunctional;
var CurationInterpretationSegregation = require('./interpretation/segregation').CurationInterpretationSegregation;
var CurationInterpretationGeneSpecific = require('./interpretation/gene_specific').CurationInterpretationGeneSpecific;

// Import pathogenicity calculator
var calculator = require('./interpretation/shared/calculator');
var PathogenicityCalculator = calculator.PathogenicityCalculator;

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        href_url: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        ext_myVariantInfo: React.PropTypes.object,
        ext_bustamante: React.PropTypes.object,
        ext_ensemblVEP: React.PropTypes.array,
        ext_ensemblVariation: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_clinvarEutils: React.PropTypes.object,
        ext_clinVarEsearch: React.PropTypes.object,
        ext_clinVarRCV: React.PropTypes.array
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            ext_myVariantInfo: this.props.ext_myVariantInfo,
            ext_bustamante: this.props.ext_bustamante,
            ext_ensemblVEP: this.props.ext_ensemblVEP,
            ext_ensemblVariation: this.props.ext_ensemblVariation,
            ext_ensemblHgvsVEP: this.props.ext_ensemblHgvsVEP,
            ext_clinvarEutils: this.props.ext_clinvarEutils,
            ext_clinVarEsearch: this.props.ext_clinVarEsearch,
            ext_clinVarRCV: this.props.ext_clinVarRCV,
            selectedTab: (this.props.href_url.href ? (queryKeyValue('tab', this.props.href_url.href) ? queryKeyValue('tab', this.props.href_url.href) : 'basic-info')  : 'basic-info') // set selectedTab to whatever is defined in the address; default to first tab if not set
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
        }
        if (nextProps.ext_myVariantInfo) {
            this.setState({ext_myVariantInfo: nextProps.ext_myVariantInfo});
        }
        if (nextProps.ext_bustamante) {
            this.setState({ext_bustamante: nextProps.ext_bustamante});
        }
        if (nextProps.ext_ensemblVEP) {
            this.setState({ext_ensemblVEP: nextProps.ext_ensemblVEP});
        }
        if (nextProps.ext_ensemblVariation) {
            this.setState({ext_ensemblVariation: nextProps.ext_ensemblVariation});
        }
        if (nextProps.ext_ensemblHgvsVEP) {
            this.setState({ext_ensemblHgvsVEP: nextProps.ext_ensemblHgvsVEP});
        }
        if (nextProps.ext_clinvarEutils) {
            this.setState({ext_clinvarEutils: nextProps.ext_clinvarEutils});
        }
        if (nextProps.ext_clinVarEsearch) {
            this.setState({ext_clinVarEsearch: nextProps.ext_clinVarEsearch});
        }
        if (nextProps.ext_clinVarRCV) {
            this.setState({ext_clinVarRCV: nextProps.ext_clinVarRCV});
        }
    },

    // set selectedTab to whichever tab the user switches to, and update the address accordingly
    handleSelect: function (tab) {
        this.setState({selectedTab: tab});
        if (tab == 'basic-info') {
            window.history.replaceState(window.state, '', editQueryValue(this.props.href_url.href, 'tab', null));
        } else {
            window.history.replaceState(window.state, '', editQueryValue(this.props.href_url.href, 'tab', tab));
        }
    },

    render: function() {
        var variant = this.props.variantData;
        var interpretation = this.state.interpretation;
        var completedSections = this.state.interpretation && this.state.interpretation.completed_sections ? this.state.interpretation.completed_sections : [];
        var populationTabChecked = false;
        if (completedSections.indexOf('predictors-missense') > -1 && completedSections.indexOf('predictors-lof') > -1
            && completedSections.indexOf('predictors-silent-intron') > -1 && completedSections.indexOf('predictors-indel') > -1) {
            populationTabChecked = true;
        }

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <PathogenicityCalculator interpretation={interpretation} />
                <br /><br />
                <div className="vci-tabs">
                    <ul className="vci-tabs-header tab-label-list" role="tablist">
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('basic-info')} aria-selected={this.state.selectedTab == 'basic-info'}>Basic Information</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('population')} aria-selected={this.state.selectedTab == 'population'}>Population {completedSections.indexOf('population') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('predictors')} aria-selected={this.state.selectedTab == 'predictors'}>Predictors {populationTabChecked ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('functional')} aria-selected={this.state.selectedTab == 'functional'}>Functional {completedSections.indexOf('functional') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('segregation-case')} aria-selected={this.state.selectedTab == 'segregation-case'}>Segregation/Case {completedSections.indexOf('segregation-case') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('gene-specific')} aria-selected={this.state.selectedTab == 'gene-specific'}>Gene-specific {completedSections.indexOf('gene-specific') > -1 ? <span>&#10003;</span> : null}</li>
                    </ul>

                    {this.state.selectedTab == '' || this.state.selectedTab == 'basic-info' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationBasicInfo data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_clinVarRCV={this.state.ext_clinVarRCV} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'population' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationPopulation data={variant}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_ensemblVEP={this.state.ext_ensemblVEP}
                            ext_ensemblVariation={this.state.ext_ensemblVariation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'predictors' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationComputational data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_bustamante={this.state.ext_bustamante}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_clinVarEsearch={this.state.ext_clinVarEsearch} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'functional' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationFunctional data={variant} data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'segregation-case' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationSegregation data={variant} data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'gene-specific' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationGeneSpecific data={variant} data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    : null}
                </div>
            </div>
        );
    },
});
