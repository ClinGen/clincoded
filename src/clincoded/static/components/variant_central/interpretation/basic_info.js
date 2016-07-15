'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
var SO_terms = require('./mapping/SO_term.json');
var genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');
var externalLinks = require('./shared/externalLinks');

var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;

// Display the curator data of the curation data
var CurationInterpretationBasicInfo = module.exports.CurationInterpretationBasicInfo = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        protocol: React.PropTypes.string,
        ext_clinvarEutils: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            clinvar_hgvs_names: [],
            dbSNP_id: null,
            nucleotide_change: [],
            molecular_consequence: [],
            protein_change: [],
            ensembl_transcripts: [],
            sequence_location: [],
            primary_transcript: {},
            hgvs_GRCh37: null,
            hgvs_GRCh38: null,
            hasHgvsGRCh37: false,
            hasHgvsGRCh38: false,
            gene_symbol: null,
            uniprot_id: null,
            hasRefseqData: false,
            hasEnsemblData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.data && this.props.data) {
            this.parseData(nextProps.data);
        }
        if (nextProps.ext_clinvarEutils) {
            //this.setState({ext_clinvarEutils: nextProps.ext_clinvarEutils});
            //this.parseClinVarEutils(nextProps.ext_clinvarEutils);
            this.setState({
                hasRefseqData: true,
                clinvar_hgvs_names: this.parseHgvsNames(nextProps.ext_clinvarEutils.hgvsNames),
                nucleotide_change: nextProps.ext_clinvarEutils.RefSeqTranscripts.NucleotideChangeList,
                protein_change: nextProps.ext_clinvarEutils.RefSeqTranscripts.ProteinChangeList,
                molecular_consequence: nextProps.ext_clinvarEutils.RefSeqTranscripts.MolecularConsequenceList,
                sequence_location: nextProps.ext_clinvarEutils.allele.SequenceLocation,
                gene_symbol: nextProps.ext_clinvarEutils.gene.symbol
            });
            // Calling method to get uniprot id for LinkOut link
            this.getUniprotId(this.state.gene_symbol);
            // Calling method to identify nucleotide change, protein change and molecular consequence
            // Used for UI display in the Primary Transcript table
            this.getPrimaryTranscript(nextProps.ext_clinvarEutils.clinvarVariantTitle, this.state.nucleotide_change, this.state.protein_change, this.state.molecular_consequence);
        }
        if (nextProps.ext_ensemblHgvsVEP) {
            this.setState({
                hasEnsemblData: true,
                ensembl_transcripts: nextProps.ext_ensemblHgvsVEP[0].transcript_consequences
            });
        }
    },

    componentWillUnmount: function() {
        this.setState({
            hasRefseqData: false,
            hasEnsemblData: false
        });
    },

    parseData: function(variant) {
        if (variant.clinvarVariantId) {
            this.setState({clinvar_id: variant.clinvarVariantId});
        }
        if (variant.carId) {
            this.setState({car_id: variant.carId});
        }
        if (variant.dbSNPIds.length) {
            this.setState({dbSNP_id: variant.dbSNPIds[0]});
        }
        var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
        if (hgvs_GRCh37) {
            this.setState({
                hgvs_GRCh37: hgvs_GRCh37,
                hasHgvsGRCh37: true
            });
        }
        var hgvs_GRCh38 = (variant.hgvsNames.GRCh38) ? variant.hgvsNames.GRCh38 : variant.hgvsNames.gRCh38;
        if (hgvs_GRCh38) {
            this.setState({
                hgvs_GRCh38: hgvs_GRCh38,
                hasHgvsGRCh38: true
            });
        }
    },

    parseClinVarEutils: function(variantData) {

    },

    // Return all non NC_ genomic hgvsNames in an array
    parseHgvsNames: function(hgvsNames) {
        var hgvs_names = [];
        if (hgvsNames) {
            if (hgvsNames.others) {
                hgvs_names = hgvsNames.others;
            }
        }
        return hgvs_names;
    },

    // Create primary transcript object
    // Called in the "fetchRefseqData" method after various states are set
    getPrimaryTranscript: function(str, nucleotide_change, protein_change, molecular_consequence) {
        var transcript = {}, SO_id_term = '';
        var result = nucleotide_change.find((n) => str.indexOf(n.AccessionVersion) > -1);
        if (result && molecular_consequence.length) {
            var item = molecular_consequence.find((x) => x.HGVS === result.HGVS);
            // 'SO_terms' is defined via requiring external mapping file
            if (item) {
                var found = SO_terms.find((entry) => entry.SO_id === item.SOid);
                if (found) {
                    SO_id_term = found.SO_term + ' ' + found.SO_id;
                } else {
                    SO_id_term = '--';
                }
            }
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

    //Render Ensembl transcripts table rows
    renderEnsemblData: function(item, key) {
        // Only if nucleotide transcripts exist
        if (item.hgvsc) {
            return (
                <tr key={key}>
                    <td><span className="title-ellipsis" title={item.hgvsc}>{item.hgvsc}</span></td>
                    <td>{(item.hgvsp) ? item.hgvsp : '--'}</td>
                    <td>
                        {(item.consequence_terms) ? this.handleSOTerms(item.consequence_terms) : '--'}
                    </td>
                </tr>
            );
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
        var clinvar_hgvs_names = this.state.clinvar_hgvs_names;
        var self = this;

        var links_38 = null;
        var links_37 = null;
        if (GRCh38) {
            links_38 = externalLinks.setContextLinks(GRCh38, 'GRCh38');
        }
        if (GRCh37) {
            links_37 = externalLinks.setContextLinks(GRCh37, 'GRCh37');
        }


        return (
            <div className="variant-interpretation basic-info">
                <div className="bs-callout bs-callout-info clearfix">
                    <div className="bs-callout-content-container-fullwidth">
                        <h4>Genomic</h4>
                        <ul>
                            {(GRCh38) ? <li><span className="title-ellipsis title-ellipsis-short">{GRCh38}</span><span> (GRCh38)</span></li> : null}
                            {(GRCh37) ? <li><span className="title-ellipsis title-ellipsis-short">{GRCh37}</span><span> (GRCh37)</span></li> : null}
                        </ul>
                    </div>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">ClinVar Primary Transcript</h3></div>
                    {(clinvar_id && primary_transcript) ?
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
                                        <span className="title-ellipsis">{(primary_transcript) ? primary_transcript.nucleotide : '--'}</span>
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
                        :
                        <table className="table"><tbody><tr><td>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank">Search ClinVar</a> for this variant.</td></tr></tbody></table>
                    }
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">ClinVar Transcripts</h3></div>
                    {(clinvar_id && clinvar_hgvs_names) ?
                        <table className="table">
                            <tbody>
                                <tr>
                                    <td>
                                        <ul>
                                            {clinvar_hgvs_names.map(function(name, index) {
                                                return <li key={index}><span className="title-ellipsis">{name}</span></li>;
                                            })}
                                        </ul>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        :
                        <table className="table"><tbody><tr><td>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank">Search ClinVar</a> for this variant.</td></tr></tbody></table>
                    }
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">Ensembl Transcripts</h3></div>
                    {(this.state.hasHgvsGRCh38 && GRCh38) ?
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
                                    return (self.renderEnsemblData(item, i));
                                })}
                            </tbody>
                        </table>
                        :
                         <table className="table"><tbody><tr><td>No data was found for this allele in Ensembl. <a href="http://www.ensembl.org/Homo_sapiens/Info/Index" target="_blank">Search Ensembl</a> for this variant.</td></tr></tbody></table>
                    }
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">LinkOut to external resources</h3></div>
                    <div className="panel-body">
                        <dl className="inline-dl clearfix">
                            {(links_38 || links_37) ?
                                <dd>UCSC [
                                    {links_38 ? <a href={links_38.ucsc_url_38} target="_blank" title={'UCSC Genome Browser for ' + GRCh38 + ' in a new window'}>GRCh38/hg38</a> : null }
                                    {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {links_37 ? <a href={links_37.ucsc_url_37} target="_blank" title={'UCSC Genome Browser for ' + GRCh37 + ' in a new window'}>GRCh37/hg19</a> : null }
                                    ]
                                </dd>
                                :
                                null
                            }
                            {(links_38 || links_37) ?
                                <dd>Variation Viewer [
                                    {links_38 ? <a href={links_38.viewer_url_38} target="_blank" title={'Variation Viewer page for ' + GRCh38 + ' in a new window'}>GRCh38</a> : null }
                                    {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {links_37 ? <a href={links_37.viewer_url_37} target="_blank" title={'Variation Viewer page for ' + GRCh37 + ' in a new window'}>GRCh37</a> : null }
                                    ]
                                </dd>
                                :
                                null
                            }
                            {(links_38 || links_37) ?
                                <dd>Ensembl Browser [
                                    {links_38 ? <a href={links_38.ensembl_url_38} target="_blank" title={'Ensembl Browser page for ' + GRCh38 + ' in a new window'}>GRCh38</a> : null }
                                    {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {links_37 ? <a href={links_37.ensembl_url_37} target="_blank" title={'Ensembl Browser page for ' + GRCh37 + ' in a new window'}>GRCh37</a> : null }
                                    ]
                                </dd>
                                :
                                null
                            }
                        </dl>
                    </div>
                </div>

            </div>
        );
    }
});
