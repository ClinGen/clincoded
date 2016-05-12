'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var LocalStorageMixin = require('react-localstorage');

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

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
            <div className="variant-interpretation population">
                <ul className="section-external-data clearfix">
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="ExAC">
                            <h4>ExAC</h4>
                            <div>External data placeholder</div>
                        </div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="1000G">
                            <h4>1000G</h4>
                            <div>External data placeholder</div>
                        </div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div className="ESP">
                            <h4>ESP</h4>
                            <div>External data placeholder</div>
                        </div>
                    </li>
                </ul>
                <ul className="section-criteria-evaluation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <div>
                            <h4>Evaluation Criteria</h4>
                            <div>Question and description placeholder</div>
                        </div>
                    </li>
                </ul>
            </div>
        );
    }
});
