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
        updateInterpretationObj: React.PropTypes.func
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            selectedTab: (this.props.href_url.href ? tabList.indexOf(queryKeyValue('tab', this.props.href_url.href)) : 0) // set selectedTab to whatever is defined in the address; default to first tab if not set
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation});
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
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationPopulation data={variant} protocol={this.props.href_url.protocol}
                                interpretation={interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="tab-panel">
                            <CurationInterpretationComputational data={variant} protocol={this.props.href_url.protocol}
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
