'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
//var LocalStorageMixin = require('react-localstorage');
var SO_terms = require('./mapping/SO_term.json');

var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;

// Display the curator data of the curation data
var CurationInterpretationBasicInfo = module.exports.CurationInterpretationBasicInfo = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            dbSNP_id: null,
            nucleotide_change: [],
            molecular_consequence: [],
            protein_change: [],
            ensembl_transcripts: [],
            sequence_location: [],
            primary_transcript: {},
            hgvs_GRCh37: null,
            hgvs_GRCh38: null,
            gene_symbol: null,
            uniprot_id: null,
            hasRefseqData: false,
            hasEnsemblData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.data && this.props.data) {
            if (!this.state.hasRefseqData) {
                this.fetchRefseqData();
            }
            if (!this.state.hasEnsemblData) {
                this.fetchEnsemblData();
            }
        }
    },

    componentWillUnmount: function() {
        this.setState({
            hasRefseqData: false,
            hasEnsemblData: false
        });
    },

    // Retrieve the variant data from NCBI REST API
    fetchRefseqData: function() {
        //var refseq_data = {};
        var variant = this.props.data;
        var url = this.props.protocol + external_url_map['ClinVarEutils'];
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            // Extract genomic substring from HGVS name whose assembly is GRCh37 or GRCh38
            // Both of "GRCh37" and "gRCh37" (same for GRCh38) instances are possibly present in the variant object
            var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
            var hgvs_GRCh38 = (variant.hgvsNames.GRCh38) ? variant.hgvsNames.GRCh38 : variant.hgvsNames.gRCh38;
            this.setState({
                clinvar_id: clinVarId,
                car_id: variant.carId,
                dbSNP_id: variant.dbSNPIds[0],
                hgvs_GRCh37: hgvs_GRCh37,
                hgvs_GRCh38: hgvs_GRCh38,
            });
            // Get ClinVar data via the parseClinvar method defined in parse-resources.js
            this.getRestDataXml(url + clinVarId).then(xml => {
                // Passing 'true' option to invoke 'mixin' function
                // To extract more ClinVar data for 'Basic Information' tab
                var variantData = parseClinvar(xml, true);
                this.setState({
                    hasRefseqData: true,
                    nucleotide_change: variantData.RefSeqTranscripts.NucleotideChangeList,
                    protein_change: variantData.RefSeqTranscripts.ProteinChangeList,
                    molecular_consequence: variantData.RefSeqTranscripts.MolecularConsequenceList,
                    sequence_location: variantData.allele.SequenceLocation,
                    gene_symbol: variantData.gene.symbol
                });
                // Calling method to get uniprot id for LinkOut link
                this.getUniprotId(this.state.gene_symbol);
                // Calling method to identify nucleotide change, protein change and molecular consequence
                // Used for UI display in the Primary Transcript table
                this.getPrimaryTranscript(variantData.clinvarVariantTitle, this.state.nucleotide_change, this.state.protein_change, this.state.molecular_consequence);
            }).catch(function(e) {
                console.log('RefSeq Fetch Error=: %o', e);
            });
        }
    },

    // Create primary transcript object
    // Called in the "fetchRefseqData" method after various states are set
    getPrimaryTranscript: function(str, nucleotide_change, protein_change, molecular_consequence) {
        var transcript = {}, SO_id_term = '';
        var result = nucleotide_change.find((n) => str.indexOf(n.AccessionVersion) > -1);
        if (result && molecular_consequence.length) {
            var item = molecular_consequence.find((x) => x.HGVS === result.HGVS);
            // 'SO_terms' is defined via requiring external mapping file
            var found = SO_terms.find((entry) => entry.SO_id === item.SOid);
            SO_id_term = found.SO_term + ' ' + found.SO_id;
            // FIXME: temporarily use protein_change[0] due to lack of mapping
            // associated with nucleotide transcript in ClinVar data
            var protein_hgvs = (typeof protein_change !== 'undefined' && protein_change.length) ? protein_change[0].HGVS : '--';
            transcript = {
                "nucleotide": result.HGVS,
                "protein": protein_hgvs,
                "molecular": SO_id_term
            };
        }
        this.setState({primary_transcript: transcript});
    },

    // Retrieve variant data from Ensembl REST API
    fetchEnsemblData: function() {
        var variant = this.props.data;
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds) ? variant.dbSNPIds[0].match(numberPattern) : '';
            this.getRestData(this.props.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1&domains=1').then(response => {
                this.setState({
                    hasEnsemblData: true,
                    ensembl_transcripts: response[0].transcript_consequences
                });
            }).catch(function(e) {
                console.log('Ensembl Fetch Error=: %o', e);
            });
        }
    },

    // Use Ensembl consequence_terms to find matching SO_id and SO_term pair
    // Then concatenate all pairs into string
    handleSOTerms: function(array) {
        var newArray = [],
            SO_id_term,
            newStr = '';
        for (let value of array.values()) {
            // 'SO_terms' is defined via requiring external mapping file
            var found = SO_terms.find((entry) => entry.SO_term === value);
            SO_id_term = found.SO_term + ' ' + found.SO_id;
            newArray.push(SO_id_term);
        }
        // Concatenate SO terms with comma delimiter
        for (let [key, value] of newArray.entries()) {
            if (key === 0) {
                newStr += value;
            }
            if (key > 0) {
                newStr += ', ' + value;
            }
        }
        return newStr;
    },

    // Find gene_id from Ensembl REST API response
    // Used to construct LinkOut URL to Ensembl Browser
    getGeneId: function(array) {
        var gene_id = '';
        if (array.length && array[0].gene_id) {
            gene_id = array[0].gene_id;
        }
        return gene_id;
    },

    // Find Uniprot id given the gene_symbol from ClinVar
    // Called in the "fetchRefseqData" method after gene_symbol state is set
    // Used to construct LinkOut URL to Uniprot
    getUniprotId: function(gene_symbol) {
        if (gene_symbol) {
            // FIXME: Use hardcoded uniprot id for now until we find an alternate API to address SSL issue
            /*
            this.getRestData(this.props.protocol + external_url_map['HGNCFetch'] + gene_symbol).then(result => {
                this.setState({uniprot_id: result.response.docs[0].uniprot_ids[0]});
            }).catch(function(e) {
                console.log('HGNC Fetch Error=: %o', e);
            });
            */
            this.setState({uniprot_id: 'P38398'});
        }
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
        var clinvar_id = this.state.clinvar_id;
        var car_id = this.state.car_id;
        var dbSNP_id = this.state.dbSNP_id;
        var nucleotide_change = this.state.nucleotide_change;
        var molecular_consequence = this.state.molecular_consequence;
        var protein_change = this.state.protein_change;
        var ensembl_data = this.state.ensembl_transcripts;
        var sequence_location = this.state.sequence_location;
        var gene_symbol = this.state.gene_symbol;
        var uniprot_id = this.state.uniprot_id;
        var GRCh37 = this.state.hgvs_GRCh37;
        var GRCh38 = this.state.hgvs_GRCh38;
        var primary_transcript = this.state.primary_transcript;
        var self = this;

        return (
            <div className="variant-interpretation basic-info">
                <div className="bs-callout bs-callout-info clearfix">
                    <div className="bs-callout-content-container">
                        <h4>IDs</h4>
                        <ul>
                            {(clinvar_id) ? <li><span>ClinVar Variation ID: {clinvar_id}</span></li> : null}
                            {(car_id) ? <li><span>ClinGen Allele ID: {car_id}</span></li> : null}
                            {(dbSNP_id) ? <li><span>dbSNP ID: {dbSNP_id}</span></li> : null}
                        </ul>
                    </div>
                    {(GRCh37 || GRCh38) ?
                    <div className="bs-callout-content-container">
                        <h4>Genomic</h4>
                        <ul>
                            {(GRCh38) ? <li><span>{GRCh38 + ' (GRCh38)'}</span></li> : null}
                            {(GRCh37) ? <li><span>{GRCh37 + ' (GRCh37)'}</span></li> : null}
                        </ul>
                    </div>
                    : null}
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">Primary Transcript</h3></div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nucleotide Change</th>
                                <th>Protein Change</th>
                                <th>Molecular Consequence</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    {(primary_transcript) ? primary_transcript.nucleotide : '--'}
                                </td>
                                <td>
                                    {(primary_transcript) ? primary_transcript.protein : '--'}
                                </td>
                                <td>
                                    {(primary_transcript) ? primary_transcript.molecular : '--'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">All Transcripts</h3></div>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Nucleotide Change</th>
                                <th>Protein Change</th>
                                <th>Molecular Consequence</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ensembl_data.map(function(item, i) {
                                return (
                                    <tr key={i}>
                                        <td>{item.hgvsc}</td>
                                        <td>{(item.hgvsp) ? item.hgvsp : '--'}</td>
                                        <td>
                                            {(item.consequence_terms) ? self.handleSOTerms(item.consequence_terms) : '--'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">LinkOut to external resources</h3></div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix">
                            <dd>Variation Viewer [<a href={this.variationViewerURL(sequence_location, gene_symbol, 'GRCh38')} target="_blank" title={'Variation Viewer page for ' + GRCh38 + ' in a new window'}>GRCh38</a> - <a href={this.variationViewerURL(sequence_location, gene_symbol, 'GRCh37')} target="_blank" title={'Variation Viewer page for ' + GRCh37 + ' in a new window'}>GRCh37</a>]</dd>
                            <dd>Ensembl Browser [<a href={dbxref_prefix_map['ENSEMBL'] + this.getGeneId(ensembl_data)} target="_blank" title={'Ensembl Browser page for ' + this.getGeneId(ensembl_data) + ' in a new window'}>GRCh38</a>]</dd>
                            <dd>UCSC [<a href={this.ucscViewerURL(sequence_location, 'hg38', 'GRCh38')} target="_blank" title={'UCSC Genome Browser for ' + GRCh38 + ' in a new window'}>GRCh38/hg38</a> - <a href={this.ucscViewerURL(sequence_location, 'hg19', 'GRCh37')} target="_blank" title={'UCSC Genome Browser for ' + GRCh37 + ' in a new window'}>GRCh37/hg19</a>]</dd>
                            <dd><a href={dbxref_prefix_map['UniProtKB'] + uniprot_id} target="_blank" title={'UniProtKB page for ' + uniprot_id + ' in a new window'}>UniProtKB</a></dd>
                        </dl>
                    </div>
                </div>

            </div>
        );
    }
});
