'use strict';
var React = require('react');
var globals = require('../globals');

var ReactTabs = require('react-tabs');
var Tab = ReactTabs.Tab;
var Tabs = ReactTabs.Tabs;
var TabList = ReactTabs.TabList;
var TabPanel = ReactTabs.TabPanel;

Tabs.setUseDefaultStyles(false);

var CurationInterpretationBasicInfo = require('./interpretation/basic_info').CurationInterpretationBasicInfo;

// Curation data header for Gene:Disease
var VariantCurationInterpretation = module.exports.VariantCurationInterpretation = React.createClass({
    propTypes: {
        variantData: React.PropTypes.object, // ClinVar data payload
        loadingComplete: React.PropTypes.bool
    },

    handleSelect: function (index, last) {
        console.log('Selected tab: ' + index + ', Last tab: ' + last);
    },

    render: function() {
        var variant = this.props.variantData;
        var loadingComplete = this.props.loadingComplete;

        return (
            <div className="container curation-variant-tab-group">
                <Tabs onSelect={this.handleSelect} selectedIndex={0}>
                    <TabList className="tab-label-list">
                        <Tab className="tab-label col-sm-2">Basic Information</Tab>
                        <Tab className="tab-label col-sm-2">Population</Tab>
                        <Tab className="tab-label col-sm-2">Computational</Tab>
                        <Tab className="tab-label col-sm-2">Functional</Tab>
                        <Tab className="tab-label col-sm-2">Segregation</Tab>
                        <Tab className="tab-label col-sm-2">Case</Tab>
                    </TabList>
                    <TabPanel>
                        <div className="tab-panel"><CurationInterpretationBasicInfo data={variant} shouldFetchData={loadingComplete} /></div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">Tab: Population</div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">Tab: Computational</div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">Tab: Functional</div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">Tab: Segregation</div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">Tab: Case</div>
                    </TabPanel>
                </Tabs>
            </div>
        );
    }
});
