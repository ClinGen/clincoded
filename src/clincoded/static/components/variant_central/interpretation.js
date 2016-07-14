'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');

var queryKeyValue = globals.queryKeyValue;
var editQueryValue = globals.editQueryValue;

// Import react-tabs npm to create tabs
var ReactTabs = require('react-tabs');
var Tab = ReactTabs.Tab;
var Tabs = ReactTabs.Tabs;
var TabList = ReactTabs.TabList;
var TabPanel = ReactTabs.TabPanel;

// Prevent react-tabs default styles being used on tabs
Tabs.setUseDefaultStyles(false);

// Import individual tab components
var CurationInterpretationCriteria = require('./interpretation/criteria').CurationInterpretationCriteria;
var CurationInterpretationBasicInfo = require('./interpretation/basic_info').CurationInterpretationBasicInfo;
var CurationInterpretationPopulation = require('./interpretation/population').CurationInterpretationPopulation;
var CurationInterpretationComputational = require('./interpretation/computational').CurationInterpretationComputational;
var CurationInterpretationFunctional = require('./interpretation/functional').CurationInterpretationFunctional;
var CurationInterpretationSegregation = require('./interpretation/segregation').CurationInterpretationSegregation;
var CurationInterpretationGeneSpecific = require('./interpretation/gene_specific').CurationInterpretationGeneSpecific;

// list of tabs, in order of how they appear on the tab list
// these values will be appended to the address as you switch tabs
var tabList = [
    'basic-info',
    'population',
    'computational',
    'functional',
    'segregation-case',
    'gene-specific'
];

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        href_url: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        ext_myVariantInfo: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_ensemblVEP: React.PropTypes.array,
        ext_ensemblVariation: React.PropTypes.object,
        ext_clinvarEutils: React.PropTypes.object,
        ext_clinVarEsearch: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            ext_myVariantInfo: this.props.ext_myVariantInfo,
            ext_ensemblHgvsVEP: this.props.ext_ensemblHgvsVEP,
            ext_ensemblVEP: this.props.ext_ensemblVEP,
            ext_ensemblVariation: this.props.ext_ensemblVariation,
            ext_clinvarEutils: this.props.ext_clinvarEutils,
            ext_clinVarEsearch: this.props.ext_clinVarEsearch,
            selectedTab: (this.props.href_url.href ? tabList.indexOf(queryKeyValue('tab', this.props.href_url.href)) : 0) // set selectedTab to whatever is defined in the address; default to first tab if not set
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
        if (nextProps.ext_ensemblHgvsVEP) {
            this.setState({ext_ensemblHgvsVEP: nextProps.ext_ensemblHgvsVEP});
        }
        if (nextProps.ext_ensemblVEP) {
            this.setState({ext_ensemblVEP: nextProps.ext_ensemblVEP});
        }
        if (nextProps.ext_ensemblVariation) {
            this.setState({ext_ensemblVariation: nextProps.ext_ensemblVariation});
        }
        if (nextProps.ext_clinvarEutils) {
            this.setState({ext_clinvarEutils: nextProps.ext_clinvarEutils});
        }
        if (nextProps.ext_clinVarEsearch) {
            this.setState({ext_clinVarEsearch: nextProps.ext_clinVarEsearch});
        }
    },

    // set selectedTab to whichever tab the user switches to, and update the address accordingly
    handleSelect: function (index, last) {
        this.setState({selectedTab: index});
        if (index == 0) {
            window.history.replaceState(window.state, '', editQueryValue(this.props.href_url.href, 'tab', null));
        } else {
            window.history.replaceState(window.state, '', editQueryValue(this.props.href_url.href, 'tab', tabList[index]));
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
                <Tabs onSelect={this.handleSelect} selectedIndex={this.state.selectedTab} forceRenderTabPanel={true}>
                    <TabList className="tab-label-list">
                        <Tab className="tab-label col-sm-2">Basic Information</Tab>
                        <Tab className="tab-label col-sm-2">Population</Tab>
                        <Tab className="tab-label col-sm-2">Predictors</Tab>
                        <Tab className="tab-label col-sm-2">Functional</Tab>
                        <Tab className="tab-label col-sm-2">Segregation/Case</Tab>
                        <Tab className="tab-label col-sm-2">Gene-specific</Tab>
                    </TabList>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationBasicInfo data={variant} protocol={this.props.href_url.protocol}
                                ext_clinvarEutils={this.state.ext_clinvarEutils} ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationPopulation data={variant} protocol={this.props.href_url.protocol}
                                ext_myVariantInfo={this.state.ext_myVariantInfo} ext_ensemblVEP={this.state.ext_ensemblVEP}
                                ext_ensemblVariation={this.state.ext_ensemblVariation}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationComputational data={variant} protocol={this.props.href_url.protocol}
                                ext_myVariantInfo={this.state.ext_myVariantInfo} ext_clinvarEutils={this.state.ext_clinvarEutils}
                                ext_clinVarEsearch={this.state.ext_clinVarEsearch}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationFunctional data={variant} protocol={this.props.href_url.protocol}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationSegregation data={variant} protocol={this.props.href_url.protocol}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationGeneSpecific data={variant} protocol={this.props.href_url.protocol}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                </Tabs>
            </div>
        );
    }
});
