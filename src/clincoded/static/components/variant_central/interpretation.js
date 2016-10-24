'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var moment = require('moment');
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

var validTabs = ['basic-info', 'population', 'predictors', 'experimental', 'segregation-case', 'gene-centric'];

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        ext_myGeneInfo: React.PropTypes.object,
        href_url: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        getSelectedTab: React.PropTypes.func,
        ext_myVariantInfo: React.PropTypes.object,
        ext_bustamante: React.PropTypes.object,
        ext_ensemblVariation: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_clinvarEutils: React.PropTypes.object,
        ext_clinVarEsearch: React.PropTypes.object,
        ext_clinVarRCV: React.PropTypes.array,
        ext_clinvarInterpretationSummary: React.PropTypes.object,
        ext_ensemblGeneId: React.PropTypes.string,
        ext_geneSynonyms: React.PropTypes.array,
        ext_singleNucleotide: React.PropTypes.bool,
        loading_clinvarEutils: React.PropTypes.bool,
        loading_clinvarEsearch: React.PropTypes.bool,
        loading_clinvarRCV: React.PropTypes.bool,
        loading_ensemblHgvsVEP: React.PropTypes.bool,
        loading_ensemblVariation: React.PropTypes.bool,
        loading_myVariantInfo: React.PropTypes.bool,
        loading_myGeneInfo: React.PropTypes.bool,
        loading_bustamante: React.PropTypes.bool,
        setCalculatedPathogenicity: React.PropTypes.func,
        selectedTab:React.PropTypes.string
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            ext_myGeneInfo: this.props.ext_myGeneInfo,
            ext_myVariantInfo: this.props.ext_myVariantInfo,
            ext_bustamante: this.props.ext_bustamante,
            ext_ensemblVariation: this.props.ext_ensemblVariation,
            ext_ensemblHgvsVEP: this.props.ext_ensemblHgvsVEP,
            ext_clinvarEutils: this.props.ext_clinvarEutils,
            ext_clinVarEsearch: this.props.ext_clinVarEsearch,
            ext_clinVarRCV: this.props.ext_clinVarRCV,
            ext_clinvarInterpretationSummary: this.props.ext_clinvarInterpretationSummary,
            ext_ensemblGeneId: this.props.ext_ensemblGeneId,
            ext_geneSynonyms: this.props.ext_geneSynonyms,
            ext_singleNucleotide: this.props.ext_singleNucleotide,
            loading_clinvarEutils: this.props.loading_clinvarEutils,
            loading_clinvarEsearch: this.props.loading_clinvarEsearch,
            loading_clinvarRCV: this.props.loading_clinvarRCV,
            loading_ensemblHgvsVEP: this.props.loading_ensemblHgvsVEP,
            loading_ensemblVariation: this.props.loading_ensemblVariation,
            loading_myVariantInfo: this.props.loading_myVariantInfo,
            loading_myGeneInfo: this.props.loading_myGeneInfo,
            loading_bustamante: this.props.loading_bustamante,
            //remember current tab/subtab so user will land on that tab when interpretation starts
            selectedTab: (this.props.href_url.href ? (queryKeyValue('tab', this.props.href_url.href) ? (validTabs.indexOf(queryKeyValue('tab', this.props.href_url.href)) > -1 ? queryKeyValue('tab', this.props.href_url.href) : 'basic-info') : 'basic-info')  : 'basic-info')
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        this.setState({interpretation: nextProps.interpretation});
        if (nextProps.ext_myGeneInfo) {
            this.setState({ext_myGeneInfo: nextProps.ext_myGeneInfo});
        }
        if (nextProps.ext_myVariantInfo) {
            this.setState({ext_myVariantInfo: nextProps.ext_myVariantInfo});
        }
        if (nextProps.ext_bustamante) {
            this.setState({ext_bustamante: nextProps.ext_bustamante});
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
        if (nextProps.ext_clinvarInterpretationSummary) {
            this.setState({ext_clinvarInterpretationSummary: nextProps.ext_clinvarInterpretationSummary});
        }
        if (nextProps.ext_ensemblGeneId) {
            this.setState({ext_ensemblGeneId: nextProps.ext_ensemblGeneId});
        }
        if (nextProps.ext_geneSynonyms) {
            this.setState({ext_geneSynonyms: nextProps.ext_geneSynonyms});
        }
        if (nextProps.selectedTab) {
            this.setState({selectedTab: nextProps.selectedTab});
        }
        this.setState({
            ext_singleNucleotide: nextProps.ext_singleNucleotide,
            loading_myGeneInfo: nextProps.loading_myGeneInfo,
            loading_myVariantInfo: nextProps.loading_myVariantInfo,
            loading_bustamante: nextProps.loading_bustamante,
            loading_ensemblVariation: nextProps.loading_ensemblVariation,
            loading_ensemblHgvsVEP: nextProps.loading_ensemblHgvsVEP,
            loading_clinvarEutils: nextProps.loading_clinvarEutils,
            loading_clinvarEsearch: nextProps.loading_clinvarEsearch,
            loading_clinvarRCV: nextProps.loading_clinvarRCV
        });
    },

    // set selectedTab to whichever tab the user switches to, and update the address accordingly
    handleSelect: function (tab) {
        if (tab == 'basic-info' || validTabs.indexOf(tab) == -1) {
            this.setState({selectedTab: 'basic-info'});
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'tab', null));
        } else {
            this.setState({selectedTab: tab});
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'tab', tab));
        }
        this.props.getSelectedTab(tab);
    },

    render: function() {
        var variant = this.props.variantData;
        var interpretation = this.state.interpretation;
        var completedSections = this.state.interpretation && this.state.interpretation.completed_sections ? this.state.interpretation.completed_sections : [];
        var populationTabChecked = false;

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <PathogenicityCalculator interpretation={interpretation} setCalculatedPathogenicity={this.props.setCalculatedPathogenicity} />
                <div className="vci-tabs">
                    <ul className="vci-tabs-header tab-label-list" role="tablist">
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('basic-info')} aria-selected={this.state.selectedTab == 'basic-info'}>Basic Information</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('population')} aria-selected={this.state.selectedTab == 'population'}>Population {completedSections.indexOf('population') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('predictors')} aria-selected={this.state.selectedTab == 'predictors'}>Predictors {completedSections.indexOf('predictors') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('experimental')} aria-selected={this.state.selectedTab == 'experimental'}>Experimental {completedSections.indexOf('experimental') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('segregation-case')} aria-selected={this.state.selectedTab == 'segregation-case'}>Segregation/Case {completedSections.indexOf('segregation-case') > -1 ? <span>&#10003;</span> : null}</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('gene-centric')} aria-selected={this.state.selectedTab == 'gene-centric'}>Gene-centric</li>
                    </ul>

                    {this.state.selectedTab == '' || this.state.selectedTab == 'basic-info' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationBasicInfo data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_clinVarRCV={this.state.ext_clinVarRCV}
                            ext_clinvarInterpretationSummary={this.state.ext_clinvarInterpretationSummary}
                            loading_clinvarEutils={this.state.loading_clinvarEutils}
                            loading_clinvarRCV={this.state.loading_clinvarRCV}
                            loading_ensemblHgvsVEP={this.state.loading_ensemblHgvsVEP} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'population' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationPopulation data={variant}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_ensemblVariation={this.state.ext_ensemblVariation}
                            ext_singleNucleotide={this.state.ext_singleNucleotide}
                            loading_myVariantInfo={this.state.loading_myVariantInfo}
                            loading_ensemblVariation={this.state.loading_ensemblVariation} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'predictors' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationComputational data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_bustamante={this.state.ext_bustamante}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_clinVarEsearch={this.state.ext_clinVarEsearch}
                            ext_singleNucleotide={this.state.ext_singleNucleotide}
                            loading_bustamante={this.state.loading_bustamante}
                            loading_myVariantInfo={this.state.loading_myVariantInfo}
                            loading_clinvarEsearch={this.state.loading_clinvarEsearch} />
                    </div>
                    : null}
                    {this.state.selectedTab == 'experimental' ?
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
                    {this.state.selectedTab == 'gene-centric' ?
                    <div role="tabpanel" className="tab-panel">
                        <CurationInterpretationGeneSpecific data={variant} data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myGeneInfo={this.state.ext_myGeneInfo}
                            ext_ensemblGeneId={this.state.ext_ensemblGeneId}
                            ext_geneSynonyms={this.state.ext_geneSynonyms}
                            loading_myGeneInfo={this.state.loading_myGeneInfo} />
                    </div>
                    : null}
                </div>
            </div>
        );
    },
});

// Display a history item for adding an interpretation
var InterpretationAddHistory = React.createClass({
    render: function() {
        const history = this.props.history;
        const interpretation = history.primary,
            variant = history.meta && history.meta.interpretation && history.meta.interpretation.variant,
            disease = history.meta && history.meta.interpretation && history.meta.interpretation.disease;
        return (
            <div>
                <span>Interpretation added to Variant <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}><strong>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : variant.hgvsNames.GRCh38)}</strong></a></span>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(InterpretationAddHistory, 'interpretation', 'add');

// Display a history item for adding an individual
var InterpretationModifyHistory = React.createClass({
    render: function() {
        const history = this.props.history;
        const interpretation = history.primary,
            variant = history.meta && history.meta.interpretation && history.meta.interpretation.variant,
            disease = history.meta && history.meta.interpretation && history.meta.interpretation.disease;
        const interpretationName = <span><strong>{variant.clinvarVariantTitle ? variant.clinvarVariantTitle : (variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : variant.hgvsNames.GRCh37)}</strong></span>;
        return (
            <div>
                {history.meta.interpretation.mode == 'edit-disease' ?
                    disease ?
                        <span>Disease <strong>{disease.term}</strong> associated with Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                        : <span>Disease association removed from Variant <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                : null}
                {history.meta.interpretation.mode == 'edit-inheritance' ?
                    interpretation.modeInheritance ?
                        <span>Mode of inheritance <i>{interpretation.modeInheritance.indexOf('(') > -1 ? interpretation.modeInheritance.substring(0, interpretation.modeInheritance.indexOf('(') - 1) : interpretation.modeInheritance}</i> associated with Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                        : <span>Mode of inheritance association removed from Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                : null}
                {history.meta.interpretation.mode == 'update-eval' ?
                    <span>Evaluation(s) updated for Interpretation <a href={"/variant-central/?edit=true&variant=" + variant.uuid + "&interpretation=" + interpretation.uuid}>{interpretationName}</a></span>
                : null}
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(InterpretationModifyHistory, 'interpretation', 'modify');
