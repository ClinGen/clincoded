'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationRecordGeneDisease = module.exports.CurationRecordGeneDisease = React.createClass({
    propTypes: {
        data: React.PropTypes.object // ClinVar data payload
    },

    render: function() {
        var variant = this.props.data;
        if (variant) {
            var geneSymbol = (variant.symbol) ? variant.symbol : 'Unknown';
            var uniprotId = (variant.uniprotId) ? variant.uniprotId : 'Unknown';
            var associatedDisease = (variant.disease) ? variant.disease : 'Unknown';
            var omimId = (variant.omimId) ? variant.omimId : 'Unknown';
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    {variant ?
                        <dl className="inline-dl clearfix">
                            <dt>Associated gene: </dt><dd><a href={external_url_map['HGNC'] + geneSymbol} target="_blank" title={'HGNC page for ' + geneSymbol + ' in a new window'}>{geneSymbol}</a></dd>
                            <dt>Uniprot: </dt><dd>{uniprotId}</dd>
                            <dt>Associated disease: </dt><dd>{associatedDisease + '[OMIM: ' + omimId + ']'}</dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});
