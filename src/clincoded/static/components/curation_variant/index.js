'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;

var ReactTabs = require('react-tabs');
var Tab = ReactTabs.Tab;
var Tabs = ReactTabs.Tabs;
var TabList = ReactTabs.TabList;
var TabPanel = ReactTabs.TabPanel;

var VariantCurationHeader = require('./header').VariantCurationHeader;

var queryKeyValue = globals.queryKeyValue;

// Variant Curation Hub
var VariantCurationHub = React.createClass({
    mixins: [RestMixin],

    getInitialState: function() {
        return {
            uuid: queryKeyValue('variant', this.props.href),
            variantObj: null
        };
    },

    componentDidMount: function() {
        this.getClinVarData(this.state.uuid);
    },

    // Retrieve the varaint object from db with the given uuid
    getClinVarData: function(uuid) {
        return this.getRestData('/variants/' + uuid, null, true).then(response => {
            // The variant object successfully retrieved
            this.setState({variantObj: response});
        }).catch(function(e) {
            console.log('GETGDM ERROR=: %o', e);
        });
    },

    handleSelect: function (index, last) {
        console.log('Selected tab: ' + index + ', Last tab: ' + last);
    },

    render: function() {
        var variantData = this.state.variantObj;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        return (
            <div>
                <VariantCurationHeader variantData={variantData} session={session} />
                <div className="container curation-variant-tab-group">
                    <Tabs onSelect={this.handleSelect} selectedIndex={0}>
                        <TabList>
                            <Tab>Basic Information</Tab>
                            <Tab>Population</Tab>
                            <Tab>Computational</Tab>
                            <Tab>Functional</Tab>
                            <Tab>Segregation</Tab>
                            <Tab>Case</Tab>
                        </TabList>
                        <TabPanel>
                            <h2>Tab: Basic Information</h2>
                        </TabPanel>
                        <TabPanel>
                            <h2>Tab: Population</h2>
                        </TabPanel>
                        <TabPanel>
                            <h2>Tab: Computational</h2>
                        </TabPanel>
                        <TabPanel>
                            <h2>Tab: Functional</h2>
                        </TabPanel>
                        <TabPanel>
                            <h2>Tab: Segregation</h2>
                        </TabPanel>
                        <TabPanel>
                            <h2>Tab: Case</h2>
                        </TabPanel>
                    </Tabs>
                </div>
            </div>
        );
    }
});

globals.curator_page.register(VariantCurationHub, 'curator_page', 'curation-variant');
