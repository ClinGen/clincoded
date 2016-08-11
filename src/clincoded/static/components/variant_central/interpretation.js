'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');

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

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        geneObj: React.PropTypes.object,
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
            geneObj: this.props.geneObj,
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
        if (typeof nextProps.geneObj !== undefined && !_.isEqual(nextProps.geneObj, this.props.geneObj)) {
            this.setState({geneObj: nextProps.geneObj});
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

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <CurationInterpretationCriteria interpretation={interpretation} />
                <div className="vci-tabs">
                    <ul className="vci-tabs-header tab-label-list" role="tablist">
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('basic-info')} aria-selected={this.state.selectedTab == 'basic-info'}>Basic Information</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('population')} aria-selected={this.state.selectedTab == 'population'}>Population</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('predictors')} aria-selected={this.state.selectedTab == 'predictors'}>Predictors</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('functional')} aria-selected={this.state.selectedTab == 'functional'}>Functional</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('segregation-case')} aria-selected={this.state.selectedTab == 'segregation-case'}>Segregation/Case</li>
                        <li className="tab-label col-sm-2" role="tab" onClick={() => this.handleSelect('gene-specific')} aria-selected={this.state.selectedTab == 'gene-specific'}>Gene-centric</li>
                    </ul>

                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == '' || this.state.selectedTab == 'basic-info' ? '' : ' hidden')}>
                        <CurationInterpretationBasicInfo data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                            ext_clinVarRCV={this.state.ext_clinVarRCV} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'population' ? '' : ' hidden')}>
                        <CurationInterpretationPopulation data={variant}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_ensemblVEP={this.state.ext_ensemblVEP}
                            ext_ensemblVariation={this.state.ext_ensemblVariation} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'predictors' ? '' : ' hidden')}>
                        <CurationInterpretationComputational data={variant} href_url={this.props.href_url}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_myVariantInfo={this.state.ext_myVariantInfo}
                            ext_bustamante={this.state.ext_bustamante}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            ext_clinVarEsearch={this.state.ext_clinVarEsearch} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'functional' ? '' : ' hidden')}>
                        <CurationInterpretationFunctional data={variant} protocol={this.props.href_url.protocol}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'segregation-case' ? '' : ' hidden')}>
                        <CurationInterpretationSegregation data={variant} protocol={this.props.href_url.protocol}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                    <div role="tabpanel" className={"tab-panel" + (this.state.selectedTab == 'gene-specific' ? '' : ' hidden')}>
                        <CurationInterpretationGeneSpecific data={variant} protocol={this.props.href_url.protocol}
                            interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                            ext_clinvarEutils={this.state.ext_clinvarEutils}
                            geneObj={this.state.geneObj} />
                    </div>
                </div>
            </div>
        );
    }
});
