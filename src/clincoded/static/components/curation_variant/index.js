'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;

var VariantCurationHeader = require('./header').VariantCurationHeader;
var VariantCurationInterpretation = require('./interpretation').VariantCurationInterpretation;

var queryKeyValue = globals.queryKeyValue;

// Variant Curation Hub
var VariantCurationHub = React.createClass({
    mixins: [RestMixin],

    getInitialState: function() {
        return {
            uuid: queryKeyValue('variant', this.props.href),
            variantObj: null,
            isLoadingComplete: false
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
            this.setState({isLoadingComplete: true});
        }).catch(function(e) {
            console.log('GETGDM ERROR=: %o', e);
        });
    },

    render: function() {
        var variantData = this.state.variantObj;
        var isLoadingComplete = this.state.isLoadingComplete;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        return (
            <div>
                <VariantCurationHeader variantData={variantData} session={session} />
                <VariantCurationInterpretation variantData={variantData} session={session} loadingComplete={isLoadingComplete} />
            </div>
        );
    }
});

globals.curator_page.register(VariantCurationHub, 'curator_page', 'curation-variant');
