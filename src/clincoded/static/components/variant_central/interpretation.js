'use strict';
var React = require('react');
var globals = require('../globals');

// Import react-tabs npm to create tabs
var ReactTabs = require('react-tabs');
var Tab = ReactTabs.Tab;
var Tabs = ReactTabs.Tabs;
var TabList = ReactTabs.TabList;
var TabPanel = ReactTabs.TabPanel;

// Prevent react-tabs default styles being used on tabs
Tabs.setUseDefaultStyles(false);

// Import individual tab components
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
        interpretationUuid: React.PropTypes.string,
        loadingComplete: React.PropTypes.bool
    },

    handleSelect: function (index, last) {
        console.log('Selected tab: ' + index + ', Last tab: ' + last);
    },

    render: function() {
        var variant = this.props.variantData;
        var interpretationUuid = this.props.interpretationUuid;
        var loadingComplete = this.props.loadingComplete;

        // The ordering of TabPanels are corresponding to that of tabs
        // Adding or deleting a tab also requires its corresponding TabPanel to be added/deleted
        return (
            <div className="container curation-variant-tab-group">
                <Tabs onSelect={this.handleSelect} selectedIndex={0}>
                    <TabList className="tab-label-list">
                        <Tab className="tab-label col-sm-2">Basic Information</Tab>
                        <Tab className="tab-label col-sm-2">Population</Tab>
                        <Tab className="tab-label col-sm-2">Predictors</Tab>
                        <Tab className="tab-label col-sm-2">Functional</Tab>
                        <Tab className="tab-label col-sm-2">Segregation/Case</Tab>
                        <Tab className="tab-label col-sm-2">Gene-specific</Tab>
                    </TabList>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationBasicInfo data={variant} shouldFetchData={loadingComplete} /></div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationPopulation data={variant} shouldFetchData={loadingComplete} interpretationUuid={interpretationUuid} /></div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationComputational data={variant} shouldFetchData={loadingComplete} interpretationUuid={interpretationUuid} /></div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationFunctional data={variant} shouldFetchData={loadingComplete} interpretationUuid={interpretationUuid} /></div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationSegregation data={variant} shouldFetchData={loadingComplete} interpretationUuid={interpretationUuid} /></div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationGeneSpecific data={variant} shouldFetchData={loadingComplete} interpretationUuid={interpretationUuid} /></div>
                    </TabPanel>
                </Tabs>
            </div>
        );
    }
});
