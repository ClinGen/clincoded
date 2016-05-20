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

    getDefaultProps: function() {
        return {
            recordHeader: 'Variant Genomic Context'
        };
    },

    render: function() {
        var variant = this.props.data;
        var recordHeader = this.props.recordHeader;
        if (variant) {
            var geneSymbol = (variant.symbol) ? variant.symbol : 'Unknown';
            var uniprotId = (variant.uniprotId) ? variant.uniprotId : 'Unknown';
            var associatedDisease = (variant.disease) ? variant.disease : 'Unknown';
            var omimId = (variant.omimId) ? variant.omimId : 'Unknown';
            var dbSNPId = (variant.dbSNPIds.length) ? variant.dbSNPIds[0] : 'Unknown';
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    <h4>{recordHeader}</h4>
                    {variant ?
                        <dl className="inline-dl clearfix">
                            <dd><a href={'https://genome.ucsc.edu/cgi-bin/hgTracks?hgsid=495481371_651Qv59AJmqfdVAkBKyHLysuGEJz&org=Human&db=hg38&pix=2525&position=' + dbSNPId} target="_blank" title={'UCSC Genome Browser for ' + dbSNPId + ' in a new window'}>UCSC</a></dd>
                            <dd><a href={'http://www.ncbi.nlm.nih.gov/variation/view/?q=' + dbSNPId} target="_blank" title={'Variation Viewer page for ' + dbSNPId + ' in a new window'}>Variation Viewer</a></dd>
                            <dd><a href="http://uswest.ensembl.org/Homo_sapiens/Gene/Summary?g=" target="_blank" title={'Ensembl Browser page for ' + dbSNPId + ' in a new window'}>Ensembl Browser</a></dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});
