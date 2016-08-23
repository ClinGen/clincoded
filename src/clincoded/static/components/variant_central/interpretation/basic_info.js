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

import { renderDataCredit } from './shared/credit';
import { showActivityIndicator } from '../../activity_indicator';

// Display the curator data of the curation data
var CurationInterpretationBasicInfo = module.exports.CurationInterpretationBasicInfo = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        href_url: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_clinvarEutils: React.PropTypes.object,
        ext_clinVarRCV: React.PropTypes.array,
        isClinVarLoading: React.PropTypes.bool
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
            clinVarRCV: [],
            hgvs_GRCh37: null,
            hgvs_GRCh38: null,
            hasHgvsGRCh37: false,
            hasHgvsGRCh38: false,
            gene_symbol: null,
            uniprot_id: null,
            isClinVarLoading: this.props.isClinVarLoading
        };
    },

    componentDidMount: function() {
        if (this.props.data) {
            this.parseData(this.props.data);
        }
        if (this.props.ext_ensemblHgvsVEP) {
            this.setState({
                ensembl_transcripts: this.props.ext_ensemblHgvsVEP[0].transcript_consequences
            });
        }
        if (this.props.ext_clinvarEutils) {
            this.parseClinVarEutils(this.props.ext_clinvarEutils);
        }
        if (this.props.ext_clinVarRCV) {
            this.setState({clinVarRCV: this.props.ext_clinVarRCV});
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.data && this.props.data) {
            this.parseData(nextProps.data);
        }
        // update data based on api call results
        if (nextProps.ext_ensemblHgvsVEP) {
            this.setState({ensembl_transcripts: nextProps.ext_ensemblHgvsVEP[0].transcript_consequences});
            if (!nextProps.ext_clinVarRCV) {
                this.setState({isClinVarLoading: nextProps.isClinVarLoading});
            }
        }
        if (nextProps.ext_clinvarEutils) {
            this.parseClinVarEutils(nextProps.ext_clinvarEutils);
        }
        if (nextProps.ext_clinVarRCV) {
            this.setState({clinVarRCV: nextProps.ext_clinVarRCV, isClinVarLoading: nextProps.isClinVarLoading});
        }
    },

    componentDidUpdate: function(prevProps, prevState) {
        // Finds all hgvs terms in <li> and <td> nodes
        // Then sets 'title' and 'class' attributes if text overflows
        let nodeList = document.querySelectorAll('.hgvs-term span');
        let hgvsNodes = Array.from(nodeList);
        if (hgvsNodes) {
            hgvsNodes.forEach(node => {
                if (node.offsetWidth < node.scrollWidth) {
                    node.setAttribute('title', node.innerHTML);
                    node.className += ' dotted';
                }
            });
        }
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
        this.setState({
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
        this.getPrimaryTranscript(variantData.clinvarVariantTitle, variantData.RefSeqTranscripts.NucleotideChangeList, variantData.RefSeqTranscripts.MolecularConsequenceList);
    },

    // Create ClinVar primary transcript object
    // Called in the "parseClinVarEutils" method after various states are set
    getPrimaryTranscript: function(str, nucleotide_change, molecular_consequence) {
        // Get the primary RefSeq transcript from VEP response
        let ensemblTranscripts = this.state.ensembl_transcripts;
        let transcript = {},
            exon = '--',
            protein_hgvs = '--',
            SO_id_term = '--';
        let result = nucleotide_change.find((n) => str.indexOf(n.AccessionVersion) > -1);
        if (result && molecular_consequence.length) {
            let item = molecular_consequence.find((x) => x.HGVS === result.HGVS);
            // 'SO_terms' is defined via requiring external mapping file
            if (item) {
                let found = SO_terms.find((entry) => entry.SO_id === item.SOid);
                if (found) {
                    SO_id_term = found.SO_term + ' ' + found.SO_id;
                }
            }
        }
        // Find RefSeq transcript (from VEP) whose nucleotide HGVS matches ClinVar's
        // and map the Exon and Protein HGVS of the found RefSeq transcript to ClinVar
        // Filter RefSeq transcripts by 'source' and 'hgvsc' flags
        ensemblTranscripts.forEach(refseqTranscript => {
            if (refseqTranscript.source === 'RefSeq') {
                if (refseqTranscript.hgvsc && refseqTranscript.hgvsc === result.HGVS) {
                    exon = refseqTranscript.exon ? refseqTranscript.exon : '--';
                    protein_hgvs = refseqTranscript.hgvsp ? refseqTranscript.hgvsp : '--';
                }
            }
        });
        // Set transcript object properties
        transcript = {
            "nucleotide": result.HGVS,
            "exon": exon,
            "protein": protein_hgvs,
            "molecular": SO_id_term
        };
        this.setState({primary_transcript: transcript});
    },

    //Render RefSeq or Ensembl transcripts table rows
    renderRefSeqEnsemblTranscripts: function(item, key, source) {
        // Only if nucleotide transcripts exist
        if (item.hgvsc && item.source === source) {
            return (
                <tr key={key} className={(item.canonical && item.canonical === 1) ? 'primary-transcript' : null}>
                    <td className="hgvs-term"><span className="title-ellipsis">{item.hgvsc}</span></td>
                    <td>{(item.exon) ? item.exon : '--'}</td>
                    <td>{(item.hgvsp) ? item.hgvsp : '--'}</td>
                    <td className="clearfix">
                        {(item.consequence_terms) ? this.handleSOTerms(item.consequence_terms) : '--'}
                    </td>
                </tr>
            );
        }
    },

    // Render ClinVar Interpretations table rows
    renderClinvarInterpretations: function(item, key) {
        let self = this;
        return (
            <tr key={key} className="clinvar-interpretation">
                <td className="accession"><a href={external_url_map['ClinVar'] + item.RCV} target="_blank">{item.RCV}</a></td>
                <td className="review-status">{item.reviewStatus}</td>
                <td className="clinical-significance">{item.clinicalSignificance}</td>
                <td className="disease">
                    {item.conditions.map(function(condition, i) {
                        return (self.handleCondition(condition, i));
                    })}
                </td>
            </tr>
        );
    },

    // Method to render each associated condition, which also consists of multiple identifiers
    handleCondition: function(condition, key) {
        let self = this;
        return (
            <div key={condition.name}>
                <span className="condition-name">{condition.name}</span>
                <span className="identifiers"> [<ul className="clearfix">
                    {condition.identifiers.map(function(identifier, i) {
                        return (
                            <li key={i} className="xref-linkout">
                                <a href={self.handleLinkOuts(identifier.id, identifier.db)} target="_blank">{identifier.db}</a>
                            </li>
                        );
                    })}
                </ul>]</span>
            </div>
        );
    },

    // Method to return linkout url given a db name
    handleLinkOuts: function(id, db) {
        let url;
        switch (db) {
            case "MedGen":
                url = external_url_map['MedGen'] + id;
                break;
            case "Orphanet":
                url = external_url_map['OrphaNet'] + id;
                break;
            case "OMIM":
                url = external_url_map['OMIMEntry'] + id;
                break;
            case "Gene":
                url = external_url_map['Entrez'] + id;
                break;
            default:
                url = '#';
        }
        return url;
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
            this.getRestData(this.props.href_url.protocol + external_url_map['HGNCFetch'] + gene_symbol).then(result => {
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
                url = this.props.href_url.protocol + external_url_map['UCSCGenomeBrowser'] + '?db=' + db + '&position=Chr' + SequenceLocationObj.Chr + '%3A' + SequenceLocationObj.start + '-' + SequenceLocationObj.stop;
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
                url = this.props.href_url.protocol + external_url_map['NCBIVariationViewer'] + '?chr=' + SequenceLocationObj.Chr + '&q=' + gene_symbol + '&assm=' + SequenceLocationObj.AssemblyAccessionVersion + '&from=' + SequenceLocationObj.start + '&to=' + SequenceLocationObj.stop;
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
        var clinVarRCV = this.state.clinVarRCV;
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
                            {(GRCh38) ? <li className="hgvs-term"><span className="title-ellipsis title-ellipsis-short">{GRCh38}</span><span> (GRCh38)</span></li> : null}
                            {(GRCh37) ? <li className="hgvs-term"><span className="title-ellipsis title-ellipsis-short">{GRCh37}</span><span> (GRCh37)</span></li> : null}
                        </ul>
                    </div>
                </div>

                <div className="panel panel-info datasource-clinvar-interpretaions">
                    <div className="panel-heading"><h3 className="panel-title">ClinVar Interpretations</h3></div>
                    <div className="panel-content-wrapper">
                        {this.state.isClinVarLoading ? showActivityIndicator('Retrieving data... ') : null}
                        {(clinVarRCV.length > 0) ?
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Reference Accession</th>
                                        <th>Review Status</th>
                                        <th>Clinical Significance</th>
                                        <th>Disease [Source]</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clinVarRCV.map(function(item, i) {
                                        return (self.renderClinvarInterpretations(item, i));
                                    })}
                                </tbody>
                            </table>
                            :
                            <div className="panel-body">
                                <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank">Search ClinVar</a> for this variant.</span>
                            </div>
                        }
                    </div>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">ClinVar Primary Transcript</h3></div>
                    {(clinvar_id && primary_transcript) ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nucleotide Change</th>
                                    <th>Exon</th>
                                    <th>Protein Change</th>
                                    <th>Molecular Consequence</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="hgvs-term">
                                        <span className="title-ellipsis">{(primary_transcript) ? primary_transcript.nucleotide : '--'}</span>
                                    </td>
                                    <td>
                                        {primary_transcript.exon}
                                    </td>
                                    <td>
                                        {primary_transcript.protein}
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
                    <div className="panel-heading">
                        <h3 className="panel-title">RefSeq Transcripts<a href="#credit-vep" className="label label-primary">VEP</a>
                            <span className="help-note panel-subtitle pull-right"><i className="icon icon-asterisk"></i> Canonical transcript</span>
                        </h3>
                    </div>
                    {(this.state.hasHgvsGRCh38 && GRCh38) ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nucleotide Change</th>
                                    <th>Exon</th>
                                    <th>Protein Change</th>
                                    <th>Molecular Consequence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ensembl_data.map(function(item, i) {
                                    return (self.renderRefSeqEnsemblTranscripts(item, i, 'RefSeq'));
                                })}
                            </tbody>
                        </table>
                        :
                        <table className="table"><tbody><tr><td>No data was found for this allele in RefSeq. <a href="http://www.ncbi.nlm.nih.gov/refseq/" target="_blank">Search RefSeq</a> for this variant.</td></tr></tbody></table>
                    }
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Ensembl Transcripts<a href="#credit-vep" className="label label-primary">VEP</a>
                            <span className="help-note panel-subtitle pull-right"><i className="icon icon-asterisk"></i> Canonical transcript</span>
                        </h3>
                    </div>
                    {(this.state.hasHgvsGRCh38 && GRCh38) ?
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Nucleotide Change</th>
                                    <th>Exon</th>
                                    <th>Protein Change</th>
                                    <th>Molecular Consequence</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ensembl_data.map(function(item, i) {
                                    return (self.renderRefSeqEnsemblTranscripts(item, i, 'Ensembl'));
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

                {renderDataCredit('vep')}

            </div>
        );
    }
});
