'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');
var parseClinvar = require('../../libs/parse-resources').parseClinvar;
var RestMixin = require('../rest').RestMixin;

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationRecordGeneDisease = module.exports.CurationRecordGeneDisease = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        protocol: React.PropTypes.string
    },

    getDefaultProps: function() {
        return {
            recordHeader: 'Variant Genomic Context'
        };
    },

    // Construct LinkOut URLs to UCSC Viewer
    // For both GRCh38/hg38 and GRCh37/hg19
    ucscViewerURL: function(array, db, assembly) {
        var url = '';
        array.forEach(SequenceLocationObj => {
            if (SequenceLocationObj.Assembly === assembly) {
                url = this.props.protocol + external_url_map['UCSCGenomeBrowser'] + '?db=' + db + '&position=Chr' + SequenceLocationObj.Chr + '%3A' + SequenceLocationObj.start + '-' + SequenceLocationObj.stop;
            }
        });
        return url;
    },

    render: function() {
        var variant = this.props.data;
        var grch38 = null;
        var grch37 = null;
        var sequence_location = null;
        var recordHeader = this.props.recordHeader;
        if (variant) {
            var geneSymbol = (variant.symbol) ? variant.symbol : 'Unknown';
            var uniprotId = (variant.uniprotId) ? variant.uniprotId : 'Unknown';
            var associatedDisease = (variant.disease) ? variant.disease : 'Unknown';
            var omimId = (variant.omimId) ? variant.omimId : 'Unknown';
            //var dbSNPId = (variant.dbSNPIds.length) ? variant.dbSNPIds[0] : 'Unknown';
            var dbSNPId = (variant.dbSNPIds.length) ? variant.dbSNPIds[0] : null;
            if (dbSNPId && dbSNPId.indexOf('rs') == -1) {
                dbSNPId = 'rs' + dbSNPId;
            }

            if (variant.clinvarVariantId) {
                grch38 =  variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : (variant.hgvsNames.gRCh38 ? variant.hgvsNames.gRCh38 : null);
                grch37 =  variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : (variant.hgvsNames.gRCh37 ? variant.hgvsNames.gRCh37 : null);

                var url = this.props.protocol + external_url_map['ClinVarEutils'];
                this.getRestDataXml(url + variant.clinvarVariantId).then(xml => {
                    // Passing 'true' option to invoke 'mixin' function
                    // To extract more ClinVar data for 'Basic Information' tab
                    var variantData = parseClinvar(xml, true);
                    sequence_location = variantData.allele.SequenceLocation ? variantData.allele.SequenceLocation : null;
                }).catch(function(e) {
                    console.log('RefSeq Fetch Error=: %o', e);
                });
            }
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    <h4>{recordHeader}</h4>
                    {variant && variant.clinvarVariantId ?
                        <dl className="inline-dl clearfix">
                            {(sequence_location && sequence_location.length) ?
                                <dd>UCSC [
                                        <a href={this.ucscViewerURL(sequence_location, 'hg38', 'GRCh38')} target="_blank" title={'UCSC Genome Browser for ' + GRCh38 + ' in a new window'}>GRCh38/hg38</a>
                                        &nbsp;-&nbsp;
                                        <a href={this.ucscViewerURL(sequence_location, 'hg19', 'GRCh37')} target="_blank" title={'UCSC Genome Browser for ' + GRCh37 + ' in a new window'}>GRCh37/hg19</a>
                                    ]
                                </dd>
                                <dd>Variation Viewer [
                                    <a href={this.variationViewerURL(sequence_location, gene_symbol, 'GRCh38')} target="_blank" title={'Variation Viewer page for ' + GRCh38 + ' in a new window'}>GRCh38</a>
                                    &nbsp;-&nbsp;
                                    <a href={this.variationViewerURL(sequence_location, gene_symbol, 'GRCh37')} target="_blank" title={'Variation Viewer page for ' + GRCh37 + ' in a new window'}>GRCh37</a>
                                    ]
                                </dd>
                                :
                                null
                            }
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});
