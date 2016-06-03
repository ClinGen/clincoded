'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var parseString = require('xml2js').parseString;
var LocalStorageMixin = require('react-localstorage');

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationInterpretationBasicInfo = module.exports.CurationInterpretationBasicInfo = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        shouldFetchData: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar JSON response from NCBI
            dbSNP_id: null,
            variant_type: null,
            gene_symbol: null,
            interpretationUuid: this.props.interpretationUuid,
            shouldFetchData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretationUuid: nextProps.interpretationUuid});
        this.setState({shouldFetchData: nextProps.shouldFetchData});
        if (this.state.shouldFetchData === true) {
            this.fetchData();
        }
    },

    // Retrieve the variant data from NCBI
    fetchData: function() {
        var variant = this.props.data;
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            this.getRestData('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&retmode=json&id=' + clinVarId).then(response => {
                var clinvar_data = response.result[clinVarId];
                this.setState({
                    clinvar_id: clinvar_data.uid,
                    dbSNP_id: clinvar_data.variation_set[0].variation_xrefs[0].db_id,
                    variant_type: clinvar_data.variation_set[0].variant_type,
                    gene_symbol: clinvar_data.genes[0].symbol
                });
            }).catch(function(e) {
                console.log('GETGDM ERROR=: %o', e);
            });
        }
    },

    // Alternative method to retrieve the xml data from NCBI
    fetchXMLData: function(id) {
        var xmlData;
        if (id) {
            this.getRestDataXml('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=variation&id=' + id).then(response => {
                parseString(response, function (err, result) {
                    xmlData = JSON.stringify(result);
                });
            }).catch(function(e) {
                console.log('GETGDM ERROR=: %o', e);
            });
        }
        return xmlData;
    },

    render: function() {
        var clinvar_id = this.state.clinvar_id;
        var dbSNP_id = this.state.dbSNP_id;
        var variant_type = this.state.variant_type;
        var gene_symbol = this.state.gene_symbol;

        return (
            <div className="variant-interpretation basic-info">
                <ul className="clearfix">
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div>Variant IDs</div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div><span>ClinVar Variantion ID: {clinvar_id}</span></div>
                        <div><span>dbSNP ID: rs{dbSNP_id}</span></div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div>Other description</div>
                    </li>
                </ul>

                <ul className="clearfix">
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div>Variant Type</div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div><span>{variant_type}</span></div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div>Other description</div>
                    </li>
                </ul>

                <ul className="clearfix">
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div>Associated Gene</div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div><span>{gene_symbol}</span></div>
                    </li>
                    <li className="col-xs-12 col-sm-4 gutter-exc">
                        <div>Other description</div>
                    </li>
                </ul>
                {(this.state.interpretationUuid) ?
                <ul className="section-criteria-evaluation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <CurationInterpretationForm formContent={one} />
                    </li>
                </ul>
                : null}
            </div>
        );
    }
});

var one = function() {
    return (
        <div>
            <Input type="text" ref="formType" value="one" labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" required />
            <Input type="select" ref="evaluation" label="Does this meet your criteria2?" defaultValue="No Selection"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
            </Input>
            <Input type="textarea" ref="evaluation-desc" label="Description:" rows="5" placeholder="e.g. free text"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};
