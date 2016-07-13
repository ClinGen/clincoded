'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');
var parseClinvar = require('../../libs/parse-resources').parseClinvar;
var RestMixin = require('../rest').RestMixin;
var genomic_chr_mapping = require('./interpretation/mapping/NC_genomic_chr_format.json');

var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;

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

    getInitialState: function() {
        return {
            sequence_location: null,
            gene_symbol: null,
            ensembl_transcripts: null,
            hasRefseqData: false,
            hasEnsemblData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.data && this.props.data) {
            if (!this.state.hasRefseqData) {
                this.getSequenceLocation();
            }
            if (!this.state.hasEnsemblData) {
                this.getEnsemblId();
            }
        }
    },

    componentWillUnmount: function() {
        this.setState({
            hasRefseqData: false,
            hasEnsemblData: false
        });
    },

    getSequenceLocation: function() {
        var variant = this.props.data;
        if (variant && variant.clinvarVariantId) {
            var url = this.props.protocol + external_url_map['ClinVarEutils'] + variant.clinvarVariantId;
            this.getRestDataXml(url).then(xml => {
                // Passing 'true' option to invoke 'mixin' function
                // To extract more ClinVar data for 'Basic Information' tab
                var variantData = parseClinvar(xml, true);
                if (variantData.allele.SequenceLocation) {
                    this.setState({
                        sequence_location: variantData.allele.SequenceLocation,
                        gene_symbol: variantData.gene.symbol,
                        hasRefseqData: true
                    });
                }
            }).catch(function(e) {
                console.log('RefSeq Fetch Error=: %o', e);
            });
        }
    },

    // Retrieve variant data from Ensembl REST API
    getEnsemblId: function() {
        var variant = this.props.data;
        if (variant && variant.hgvsNames && (variant.hgvsNames.GRCh38 || variant.hgvsNames.gRCh38)) {
            var grch38 = variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : variant.hgvsNames.gRCh38;
            var NC_genomic = grch38.substr(0, grch38.indexOf(':'));
            // 'genomic_chr_mapping' is defined via requiring external mapping file
            var found = genomic_chr_mapping.GRCh38.find((entry) => entry.GenomicRefSeq === NC_genomic);
            // Can't simply filter alpha letters due to the presence of 'chrX' and 'chrY'
            var chrosome = (found.ChrFormat) ? found.ChrFormat.substr(3) : '';
            // Format hgvs_notation for vep/:species/hgvs/:hgvs_notation api
            var hgvs_notation = chrosome + grch38.slice(grch38.indexOf(':'));
            if (hgvs_notation) {
                if (hgvs_notation.indexOf('del') > 0) {
                    hgvs_notation = hgvs_notation.substring(0, hgvs_notation.indexOf('del') + 3);
                }
                this.getRestData(external_url_map['EnsemblHgvsVEP'] + hgvs_notation + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1&domains=1').then(response => {
                    this.setState({
                        ensembl_transcripts: response[0].transcript_consequences,
                        hasEnsemblData: true
                    });
                }).catch(function(e) {
                    console.log('Ensembl Fetch Error=: %o', e);
                });
            }
        }
    },

    // Get Ensembl gene id
    getGeneId: function(array) {
        var gene_id = '';
        if (array && array.length && array[0].gene_id) {
            gene_id = array[0].gene_id;
        }
        return gene_id;
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

    // Construct LinkOut URLs to NCBI Variation Viewer
    // For both GRCh38 and GRCh37
    variationViewerURL: function(array, gene_symbol, assembly) {
        var url = '';
        array.forEach(SequenceLocationObj => {
            if (SequenceLocationObj.Assembly === assembly) {
                url = this.props.protocol + external_url_map['NCBIVariationViewer'] + '?chr=' + SequenceLocationObj.Chr + '&q=' + gene_symbol + '&assm=' + SequenceLocationObj.AssemblyAccessionVersion + '&from=' + SequenceLocationObj.start + '&to=' + SequenceLocationObj.stop;
            }
        });
        return url;
    },


    render: function() {
        var variant = this.props.data;
        var recordHeader = this.props.recordHeader;
        var GRCh38 = null;
        var GRCh37 = null;
        var sequence_location = this.state.sequence_location;
        var gene_symbol = this.state.gene_symbol;
        var ensembl_data = this.state.ensembl_transcripts;

        var dbSNPId = null;
        if (variant) {
            var geneSymbol = (variant.symbol) ? variant.symbol : 'Unknown';
            var uniprotId = (variant.uniprotId) ? variant.uniprotId : 'Unknown';
            var associatedDisease = (variant.disease) ? variant.disease : 'Unknown';
            var omimId = (variant.omimId) ? variant.omimId : 'Unknown';
            var dbSNPId = (variant.dbSNPIds && variant.dbSNPIds.length) ? variant.dbSNPIds[0] : null;
            if (dbSNPId && dbSNPId.indexOf('rs') == -1) {
                dbSNPId = 'rs' + dbSNPId;
            }

            if (variant.hgvsNames) {
                GRCh38 =  variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : (variant.hgvsNames.gRCh38 ? variant.hgvsNames.gRCh38 : null);
                GRCh37 =  variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : (variant.hgvsNames.gRCh37 ? variant.hgvsNames.gRCh37 : null);
            }
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    <h4>{recordHeader}</h4>
                    {variant ?
                        <dl className="inline-dl clearfix">
                            {(sequence_location && sequence_location.length) ?
                                <dd>UCSC [
                                        <a href={this.ucscViewerURL(sequence_location, 'hg38', 'GRCh38')} target="_blank" title={'UCSC Genome Browser for ' + GRCh38 + ' in a new window'}>GRCh38/hg38</a>
                                        &nbsp;-&nbsp;
                                        <a href={this.ucscViewerURL(sequence_location, 'hg19', 'GRCh37')} target="_blank" title={'UCSC Genome Browser for ' + GRCh37 + ' in a new window'}>GRCh37/hg19</a>
                                    ]
                                </dd>
                                :
                                null
                            }
                            {(sequence_location && sequence_location.length && gene_symbol) ?
                                <dd>Variation Viewer [
                                    <a href={this.variationViewerURL(sequence_location, gene_symbol, 'GRCh38')} target="_blank" title={'Variation Viewer page for ' + GRCh38 + ' in a new window'}>GRCh38</a>
                                     &nbsp;-&nbsp;
                                     <a href={this.variationViewerURL(sequence_location, gene_symbol, 'GRCh37')} target="_blank" title={'Variation Viewer page for ' + GRCh37 + ' in a new window'}>GRCh37</a>
                                    ]
                                </dd>
                                :
                                null
                            }
                            {dbSNPId ?
                                <dd>Ensembl Browser [
                                    <a href={'http://www.ensembl.org/Homo_sapiens/Variation/Explore?v=' + dbSNPId} target="_blank" title={'Ensembl Browser page for ' + dbSNPId + ' in a new window'}>{dbSNPId}</a>]
                                </dd>
                                :
                                null
                            }
                        </dl>
                        :
                        null
                    }
                </div>
            </div>
        );
    }
});
