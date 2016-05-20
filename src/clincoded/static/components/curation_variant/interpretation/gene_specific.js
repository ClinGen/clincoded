'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;

// Display the curator data of the curation data
var CurationInterpretationGeneSpecific = module.exports.CurationInterpretationGeneSpecific = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        shouldFetchData: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar JSON response from NCBI
            shouldFetchData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({shouldFetchData: nextProps.shouldFetchData});
        if (this.state.shouldFetchData === true) {
            this.fetchData();
        }
    },

    // Retrieve the varaint data from NCBI
    fetchData: function() {
        var variant = this.props.data;
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            this.getRestData('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&retmode=json&id=' + clinVarId).then(response => {
                var clinvar_data = response.result[clinVarId];
                console.log("clinvar_data is === " + JSON.stringify(clinvar_data));
                this.setState({clinvar_id: clinvar_data.uid});
            }).catch(function(e) {
                console.log('GETGDM ERROR=: %o', e);
            });
        }
    },

    render: function() {
        return (
            <div className="variant-interpretation gene-specific">
                <ul className="section-gene-specific-interpretation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <h4>Gene-specific Interpretation</h4>
                            <div>Gene-specific Data placeholder</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
