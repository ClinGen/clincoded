'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
var LocalStorageMixin = require('react-localstorage');
var SO_terms = require('./mapping/SO_term.json');

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationInterpretationBasicInfo = module.exports.CurationInterpretationBasicInfo = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        shouldFetchData: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar JSON response from NCBI
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
            shouldFetchData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({shouldFetchData: nextProps.shouldFetchData});
        if (this.state.shouldFetchData === true) {
            this.fetchRefseqData();
            this.fetchEnsemblData();
        }
    },

    // Retrieve the variant data from NCBI REST API
    fetchRefseqData: function() {
        //var refseq_data = {};
        var variant = this.props.data;
        var url = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=variation&id=';
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            this.setState({
                hgvs_GRCh37: variant.hgvsNames.gRCh37,
                hgvs_GRCh38: variant.hgvsNames.gRCh38,
            });
            this.getRestDataXml(url + clinVarId).then(xml => {
                // Passing 'true' option to invoke 'mixin' function
                // To extract more ClinVar data for 'basic info' tab
                var d = parseClinvar(xml, true);
                this.setState({
                    nucleotide_change: d.RefSeqTranscripts.NucleotideChangeList,
                    protein_change: d.RefSeqTranscripts.ProteinChangeList,
                    molecular_consequence: d.RefSeqTranscripts.MolecularConsequenceList,
                    sequence_location: d.allele.SequenceLocation,
                    gene_symbol: d.gene.symbol
                });
                this.getUniprotId(this.state.gene_symbol);
                this.getPrimaryTranscript(d.clinvarVariantTitle, this.state.nucleotide_change, this.state.protein_change, this.state.molecular_consequence);
            }).catch(function(e) {
                console.log('RefSeq Fetch Error=: %o', e);
            });
        }
    },

    // Create primary transcript object
    // Called in the "fetchRefseqData" method after various states are set
    getPrimaryTranscript: function(str, nucleotide_change, protein_change, molecular_consequence) {
        var transcript = {};
        var SO_id_term = '';
        for (var i=0; i<nucleotide_change.length; i++) {
            // Match AccessionVersion within clinvarVariantTitle string
            if (str.indexOf(nucleotide_change[i].AccessionVersion) > -1) {
                // Find associated SO_id and SO_term. Concatenate them.
                if (typeof molecular_consequence !== 'undefined' && molecular_consequence.length) {
                    for (var x=0; x<molecular_consequence.length; x++) {
                        if (molecular_consequence[x].HGVS === nucleotide_change[i].HGVS) {
                            // 'SO_terms' is defined via requiring external mapping file
                            for (var y=0; y<SO_terms.length; y++) {
                                if (molecular_consequence[x].SOid === SO_terms[y].SO_id) {
                                    SO_id_term = SO_terms[y].SO_id + ' ' + SO_terms[y].SO_term;
                                }
                            }
                        }
                    }
                }
                // FIXME: temporarily use protein_change[0] due to lack of mapping
                // associated with nucleotide_change[i] in ClinVar data
                transcript = {
                    "nucleotide": nucleotide_change[i].HGVS,
                    "protein": protein_change[0].HGVS,
                    "molecular": SO_id_term
                };
            }
        }
        this.setState({primary_transcript: transcript});
    },

    // Retrieve variant data from Ensembl REST API
    fetchEnsemblData: function() {
        var variant = this.props.data;
        if (variant) {
            var rsid = (variant.dbSNPIds) ? variant.dbSNPIds[0] : 'Unknown';
            this.getRestData('http://rest.ensembl.org/vep/human/id/' + rsid + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1&domains=1').then(response => {
                this.setState({ensembl_transcripts: response[0].transcript_consequences});
            }).catch(function(e) {
                console.log('Ensembl Fetch Error=: %o', e);
            });
        }
    },

    // Use Ensembl consequence_terms to find matching SO_id and SO_term pair
    // Then concatenate all pairs into string
    handleSOTerms: function(array) {
        var newArray = [],
            newObj,
            newStr = '';
        for (var x=0; x<array.length; x++) {
            // 'SO_terms' is defined via requiring external mapping file
            for (var y=0; y<SO_terms.length; y++) {
                if (array[x] === SO_terms[y].SO_term) {
                    newObj = SO_terms[y].SO_id + ' ' + SO_terms[y].SO_term;
                }
            }
            newArray.push(newObj);
        }
        for (var i=0; i<newArray.length; i++) {
            if (i === 0) {
                newStr += newArray[i];
            }
            if (i > 0) {
                newStr += ', ' + newArray[i];
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
            this.getRestData('http://rest.genenames.org/fetch/symbol/' + gene_symbol).then(result => {
                this.setState({uniprot_id: result.response.docs[0].uniprot_ids[0]});
            }).catch(function(e) {
                console.log('HGNC Fetch Error=: %o', e);
            });
        }
    },

    // Construct LinkOut URLs to UCSC Viewer
    // For both GRCh38/hg38 and GRCh37/hg19
    ucscViewerURL: function(array, db, assembly) {
        var url = '';
        for (var x=0; x<array.length; x++) {
            if (array[x].Assembly === assembly) {
                url = 'https://genome.ucsc.edu/cgi-bin/hgTracks?db=' + db + '&position=Chr' + array[x].Chr + '%3A' + array[x].start + '-' + array[x].stop;
            }
        }
        return url;
    },

    // Construct LinkOut URLs to NCBI Variation Viewer
    // For both GRCh38 and GRCh37
    variationViewerURL: function(array, gene_symbol, assembly) {
        var url = '';
        for (var x=0; x<array.length; x++) {
            if (array[x].Assembly === assembly) {
                url = 'http://www.ncbi.nlm.nih.gov/variation/view/?chr=' + array[x].Chr + '&q=' + gene_symbol + '&assm=' + array[x].AssemblyAccessionVersion + '&from=' + array[x].start + '&to=' + array[x].stop;
            }
        }
        return url;
    },

    render: function() {
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
                {(GRCh37 || GRCh38) ?
                    <div className="bs-callout bs-callout-info">
                        <h4>Genomic</h4>
                        <ul>
                            {(GRCh38) ? <li><span>{GRCh38 + ' (GRCh38)'}</span></li> : null}
                            {(GRCh37) ? <li><span>{GRCh37 + ' (GRCh37)'}</span></li> : null}
                        </ul>
                    </div>
                : null}

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
                            <dd><a href={'http://uswest.ensembl.org/Homo_sapiens/Gene/Summary?g=' + this.getGeneId(ensembl_data)} target="_blank" title={'Ensembl Browser page for ' + this.getGeneId(ensembl_data) + ' in a new window'}>Ensembl Browser</a></dd>
                            <dd>UCSC [<a href={this.ucscViewerURL(sequence_location, 'hg38', 'GRCh38')} target="_blank" title={'UCSC Genome Browser for ' + GRCh38 + ' in a new window'}>GRCh38/hg38</a> - <a href={this.ucscViewerURL(sequence_location, 'hg19', 'GRCh37')} target="_blank" title={'UCSC Genome Browser for ' + GRCh37 + ' in a new window'}>GRCh37/hg19</a>]</dd>
                            <dd><a href={'http://www.uniprot.org/uniprot/' + uniprot_id + '#family_and_domains'} target="_blank" title={'Uniprot page for ' + uniprot_id + ' in a new window'}>Uniprot</a></dd>
                        </dl>
                    </div>
                </div>

            </div>
        );
    }
});
