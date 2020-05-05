'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { RestMixin } from '../../rest';
import { external_url_map } from '../../globals';
import { setContextLinks } from './shared/externalLinks';
import { renderDataCredit } from './shared/credit';
import { showActivityIndicator } from '../../activity_indicator';
import PopOverComponent from '../../../libs/bootstrap/popover';
import { sortListByDate } from '../../../libs/helpers/sort';
import { getAffiliationName } from '../../../libs/get_affiliation_name';
import { renderInterpretationStatus } from '../../../libs/render_interpretation_status';
import { renderInProgressStatus } from '../../../libs/render_in_progress_status';
import { renderStatusExplanation } from '../../../libs/render_status_explanation';

const SO_terms = require('./mapping/SO_term.json');

// Display the curator data of the curation data
var CurationInterpretationBasicInfo = module.exports.CurationInterpretationBasicInfo = createReactClass({
    mixins: [RestMixin],

    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        href_url: PropTypes.object,
        ext_ensemblHgvsVEP: PropTypes.array,
        ext_clinvarEutils: PropTypes.object,
        ext_clinVarSCV: PropTypes.array,
        ext_clinvarInterpretationSummary: PropTypes.object,
        loading_clinvarEutils: PropTypes.bool,
        loading_clinvarSCV: PropTypes.bool,
        loading_ensemblHgvsVEP: PropTypes.bool,
        session: PropTypes.object,
        affiliation: PropTypes.object
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
            clinVarSCV: [],
            clinVarInterpretationSummary: {},
            hgvs_GRCh37: null,
            hgvs_GRCh38: null,
            hasHgvsGRCh37: false,
            hasHgvsGRCh38: false,
            gene_symbol: null,
            uniprot_id: null,
            loading_clinvarEutils: this.props.loading_clinvarEutils,
            loading_clinvarSCV: this.props.loading_clinvarSCV,
            loading_ensemblHgvsVEP: this.props.loading_ensemblHgvsVEP
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
        if (this.props.ext_clinVarSCV) {
            this.setState({clinVarSCV: this.props.ext_clinVarSCV});
        }
        if (this.props.ext_clinvarInterpretationSummary) {
            this.setState({clinVarInterpretationSummary: this.props.ext_clinvarInterpretationSummary});
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.data && this.props.data) {
            this.parseData(nextProps.data);
        }
        // update data based on api call results
        if (nextProps.ext_ensemblHgvsVEP) {
            this.setState({ensembl_transcripts: nextProps.ext_ensemblHgvsVEP[0].transcript_consequences});
        }
        if (nextProps.ext_clinvarEutils) {
            this.parseClinVarEutils(nextProps.ext_clinvarEutils);
        }
        if (nextProps.ext_clinVarSCV) {
            this.setState({clinVarSCV: nextProps.ext_clinVarSCV});
        }
        if (nextProps.ext_clinvarInterpretationSummary) {
            this.setState({clinVarInterpretationSummary: nextProps.ext_clinvarInterpretationSummary});
        }
        this.setState({
            loading_ensemblHgvsVEP: nextProps.loading_ensemblHgvsVEP,
            loading_clinvarEutils: nextProps.loading_clinvarEutils,
            loading_clinvarSCV: nextProps.loading_clinvarSCV
        });
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
            nucleotide_hgvs,
            exon = '--',
            protein_hgvs = '--',
            SO_id_term = '--';
        let result = nucleotide_change.find((n) => str.indexOf(n.AccessionVersion) > -1);
        if (result) {
            nucleotide_hgvs = result.HGVS;
        }
        if (nucleotide_hgvs && molecular_consequence.length) {
            let item = molecular_consequence.find((x) => x.HGVS === nucleotide_hgvs);
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
                if (refseqTranscript.hgvsc && refseqTranscript.hgvsc === nucleotide_hgvs) {
                    exon = refseqTranscript.exon ? refseqTranscript.exon : '--';
                    protein_hgvs = refseqTranscript.hgvsp ? refseqTranscript.hgvsp : '--';
                }
            }
        });
        // Set transcript object properties
        transcript = {
            "nucleotide": nucleotide_hgvs,
            "exon": exon,
            "protein": protein_hgvs,
            "molecular": SO_id_term
        };
        this.setState({primary_transcript: transcript});
    },

    //Render RefSeq or Ensembl transcripts table rows
    renderRefSeqEnsemblTranscripts: function(item, key, source) {
        // Only if nucleotide transcripts exist
        if (item.source === source) {
            const isCanonicalTranscript = item.canonical && item.canonical === 1;
            
            // only enable MANE transcript label in RefSeq Transcripts section
            const isMANETranscript = !!item.mane;

            return (
                <tr key={key} className={isCanonicalTranscript || isMANETranscript ? "marked-transcript" : null}>
                    <td className="hgvs-term">
                        <span>{item.hgvsc || item.transcript_id} {item.gene_symbol && `(${item.gene_symbol})`}</span>
                        {/* show label for canonical transcript */}
                        {isCanonicalTranscript && <span className="label label-primary" data-toggle="tooltip" data-placement="top" data-tooltip="Canonical Transcript">C</span>}

                        {/* show label for MANE transcript */}
                        {isMANETranscript && <span className="label label-warning" data-toggle="tooltip" data-placement="top" data-tooltip="MANE Preferred">MANE</span>}
                    </td>
                    <td className="exon-column">{(item.exon) ? item.exon : '--'}</td>
                    <td>{(item.hgvsp) ? item.hgvsp : '--'}</td>
                    <td className="clearfix">
                        {(item.consequence_terms) ? this.handleSOTerms(item.consequence_terms) : '--'}
                    </td>
                </tr>
            );
        }
    },

    // Render Clinical Assertions table rows
    renderClinicalAssertions: function(item, key) {
        let self = this;
        return (
            <tr key={key} className="clinical-assertion">
                <td className="clinical-significance">
                    {item.clinicalSignificance}<br/>{item.dateLastEvaluated ? '(' + item.dateLastEvaluated + ')' : null}
                </td>
                <td className="review-status">
                    <div>{item.reviewStatus}</div><div>{this.handleAssertionMethodLinkOut(item)}</div>
                </td>
                <td className="disease">
                    {item.phenotypeList.map((phenotype, i) => {
                        return (self.handleCondition(phenotype, i, item.modeOfInheritance));
                    })}
                </td>
                <td className="submitter">
                    <a href={external_url_map['ClinVar'] + 'submitters/' + item.orgID + '/'} target="_blank">{item.submitterName}</a>
                    {item.studyDescription ?
                        <PopOverComponent popOverWrapperClass={'study-description org-' + item.orgID}
                            actuatorTitle="Study description" popOverRef={ref => (this.popover = ref)}>
                            {item.studyDescription}
                        </PopOverComponent>
                        : null}
                </td>
                <td className="submission-accession">{item.accession}.{item.version}</td>
            </tr>
        );
    },

    // Method to render Clinical Assertions table header content
    renderClinvarAssertionsHeader: function(clinvar_id, loading_clinvarSCV) {
        if (clinvar_id && !loading_clinvarSCV) {
            return (
                <h3 className="panel-title">Interpretations Submitted to ClinVar <span className="panel-title-note">(Germline SCVs only)</span>
                    <a className="panel-subtitle pull-right" href={external_url_map['ClinVarSearch'] + clinvar_id} target="_blank">See data in ClinVar</a>
                </h3>
            );
        } else {
            return (
                <h3 className="panel-title">Interpretations Submitted to ClinVar <span className="panel-title-note">(Germline SCVs only)</span></h3>
            );
        }
    },

    /**
     * Method to render all existing 'approved' interpretations on a given variant
     * @param {object} interpretation - The variant interpretation object
     * @param {integer} key - Unique identifier for each mapped node
     */
    renderAllExistingInterpretations(interpretation, key) {
        const affiliation = this.props.affiliation;
        const session = this.props.session;
        // Evaluate whether to render link to provisional summary for current logged-in user
        let showProvisionalLink = false;
        if (interpretation.affiliation && affiliation && interpretation.affiliation === affiliation.affiliation_id) {
            showProvisionalLink = true;
        } else if (!interpretation.affiliation && !affiliation && interpretation.submitted_by.uuid === session.user_properties.uuid) {
            showProvisionalLink = true;
        } else {
            showProvisionalLink = false;
        }
        return (
            <tr key={key} className="approved-interpretation">
                <td className="clinical-significance">
                    {interpretation.provisional_variant && interpretation.provisional_variant[0].autoClassification ?
                        <span><strong>Calculated:</strong> {interpretation.provisional_variant[0].autoClassification}</span>
                        : '--'}
                    {interpretation.provisional_variant && interpretation.provisional_variant[0].alteredClassification ?
                        <span><br /><strong>Modified:</strong> {interpretation.provisional_variant[0].alteredClassification}</span>
                        : null}
                </td>
                <td className="interpretation-status">
                    {interpretation.provisional_variant && interpretation.provisional_variant[0].classificationStatus ? renderInterpretationStatus(interpretation.provisional_variant[0], showProvisionalLink) : renderInProgressStatus()}
                </td>
                <td className="condition-mode-of-inheritance">
                    {interpretation.disease ?
                        <span>
                            {interpretation.disease.term}
                            <span>&nbsp;</span>
                            {!interpretation.disease.freetext ? 
                                <span>(<a href={external_url_map['MondoSearch'] + interpretation.disease.diseaseId} target="_blank">{interpretation.disease.diseaseId.replace('_', ':')}</a>)</span>
                                :
                                <span>
                                    {interpretation.disease.phenotypes && interpretation.disease.phenotypes.length ?
                                        <PopOverComponent popOverWrapperClass="gdm-disease-phenotypes"
                                            actuatorTitle="View HPO term(s)" popOverRef={ref => (this.popoverPhenotypes = ref)}>
                                            {interpretation.disease.phenotypes.join(', ')}
                                        </PopOverComponent>
                                        : null}
                                </span>
                            }
                        </span>
                        :
                        <span>Not provided</span>
                    }
                    {interpretation.modeInheritance ?
                        <span><span className="condition-moi-separator">&nbsp;-&nbsp;</span>
                            {interpretation.modeInheritance.indexOf('(HP:') === -1 ?
                                <i>{interpretation.modeInheritance}</i>
                                :
                                <i>{interpretation.modeInheritance.substr(0, interpretation.modeInheritance.indexOf('(HP:')-1)}</i>
                            }
                            {interpretation.modeInheritanceAdjective ?
                                <span className="condition-moi-separator">&nbsp;-&nbsp;
                                    {interpretation.modeInheritanceAdjective.indexOf('(HP:') === -1 ?
                                        <i>{interpretation.modeInheritanceAdjective}</i>
                                        :
                                        <i>{interpretation.modeInheritanceAdjective.substr(0, interpretation.modeInheritanceAdjective.indexOf('(HP:')-1)}</i>
                                    }
                                </span> 
                                : null}
                        </span>
                        : null}
                </td>
                <td className="submitter">
                    {interpretation.affiliation ?
                        <span>{getAffiliationName(interpretation.affiliation)}</span>
                        :
                        <a href={'mailto:' + interpretation.submitted_by.email}>{interpretation.submitted_by.title }</a>
                    }
                </td>
            </tr>
        );
    },

    // Method to contruct linkouts for assertion methods
    // based on a given url or pubmed id
    handleAssertionMethodLinkOut(item) {
        if (item.assertionMethod) {
            if (item.AssertionMethodCitationURL) {
                return (
                    <a href={item.AssertionMethodCitationURL} target="_blank">{item.assertionMethod}</a>
                );
            } else if (item.AssertionMethodCitationPubMedID) {
                return (
                    <a href={external_url_map['PubMed'] + item.AssertionMethodCitationPubMedID} target="_blank">{item.assertionMethod}</a>
                );
            } else {
                return (
                    <span>{item.assertionMethod}</span>
                );
            }
        } else {
            // Certain SCVs don't have assertion methods, such as
            // https://www.ncbi.nlm.nih.gov/clinvar/variation/17000/#clinical-assertions
            return '';
        }
    },

    // Method to render each associated condition, which also consists of multiple identifiers
    handleCondition: function(condition, key, moi) {
        let self = this;
        return (
            <div className="condition" key={condition.name}>
                <span className="condition-name">{condition.name}</span>&nbsp;
                {moi ? <span className="mode-of-inheritance">({moi})&nbsp;</span> : null}
                {condition.identifiers && condition.identifiers.length ?
                    <span className="identifiers">[<ul className="clearfix">
                        {condition.identifiers.map(function(identifier, i) {
                            let url = self.handleLinkOuts(identifier.id, identifier.db);
                            return (
                                <li key={i} className="xref-linkout">
                                    {url ?
                                        <a href={url} target="_blank">{identifier.db === 'Human Phenotype Ontology' ? 'HPO' : identifier.db}</a>
                                        :
                                        <span>{identifier.db + ': ' + identifier.id}</span>
                                    }
                                </li>
                            );
                        })}
                    </ul>]</span>
                    :
                    null
                }
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
            case "Human Phenotype Ontology":
                url = external_url_map['HPO'] + id;
                break;
            case "MeSH":
                url = external_url_map['MeSH'] + id + '%5BMeSH%20Unique%20ID%5D';
                break;
            default:
                url = null;
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
                url = external_url_map['NCBIVariationViewer'] + '?chr=' + SequenceLocationObj.Chr + '&q=' + gene_symbol + '&assm=' + SequenceLocationObj.AssemblyAccessionVersion + '&from=' + SequenceLocationObj.start + '&to=' + SequenceLocationObj.stop;
            }
        });
        return url;
    },

    // Function to render message for ClinVar Primary transcript table
    // when no transcript data is found
    renderClinvarTranscriptMessage: function(clinvarId) {
        if (clinvarId) {
            return (
                <span>Unable to return ClinVar Primary Transcript for ClinVar VariationID <a href={'http://www.ncbi.nlm.nih.gov/clinvar/variation/' + clinvarId} target="_blank">{clinvarId}</a>.</span>
            );
        } else {
            return (
                <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer">Search ClinVar</a> for this variant.</span>
            );
        }
    },

    render: function() {
        const variant = this.props.data;
        const clinvar_id = this.state.clinvar_id;
        const ensembl_data = this.state.ensembl_transcripts;
        const GRCh37 = this.state.hgvs_GRCh37;
        const GRCh38 = this.state.hgvs_GRCh38;
        const primary_transcript = this.state.primary_transcript;
        const clinVarSCV = this.state.clinVarSCV;
        const clinVarInterpretationSummary = this.state.clinVarInterpretationSummary;
        const self = this;

        let links_38 = null;
        let links_37 = null;
        if (GRCh38) {
            links_38 = setContextLinks(GRCh38, 'GRCh38');
        }
        if (GRCh37) {
            links_37 = setContextLinks(GRCh37, 'GRCh37');
        }
        // Ensure the transcripts have the expected 'hgvsc' values to render table rows
        let transcriptsWithHgvsc = [];
        if (ensembl_data && ensembl_data.length) {
            transcriptsWithHgvsc = ensembl_data.filter(item => item.hgvsc && item.hgvsc.length);
        }

        let sortedInterpretations = variant && variant.associatedInterpretations && variant.associatedInterpretations.length ? sortListByDate(variant.associatedInterpretations, 'date_created') : null;

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

                <div className="panel panel-info all-existing-interpretaions">
                    <div className="panel-heading">
                        <h3 className="panel-title">All interpretations for this variant in the Variant Curation Interface (VCI){renderStatusExplanation('Interpretations')}</h3>
                    </div>
                    <div className="panel-content-wrapper">
                        {sortedInterpretations && sortedInterpretations.length > 0 ?
                            <div className="all-existing-interpretaions-content-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Clinical significance</th>
                                            <th>Status</th>
                                            <th>Condition - <i>Mode of inheritance</i></th>
                                            <th>Curator/Affiliation</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedInterpretations.map((interpretation, i) => {
                                            return (self.renderAllExistingInterpretations(interpretation, i));
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            :
                            <div className="panel-body"><span>This variant has no existing interpretations.</span></div>
                        }
                    </div>
                </div>

                <div className="panel panel-info datasource-clinvar-interpretaions">
                    <div className="panel-heading">
                        <h3 className="panel-title">Overall ClinVar Interpretation
                            {clinvar_id ? <a className="panel-subtitle pull-right" href={external_url_map['ClinVarSearch'] + clinvar_id} target="_blank">See data in ClinVar</a> : null}
                        </h3>
                    </div>
                    <div className="panel-content-wrapper">
                        {this.state.loading_clinvarEutils ? showActivityIndicator('Retrieving data... ') : null}
                        {Object.keys(clinVarInterpretationSummary).length > 0 ?
                            <div className="clinvar-interpretaions-content-wrapper">
                                <div className="panel-body clearfix clinvar-interpretation-summary">
                                    <dl className="inline-dl clearfix col-sm-8">
                                        <dt>Review status:</dt><dd className="reviewStatus">{clinVarInterpretationSummary['ReviewStatus']}</dd>
                                        <dt>Clinical significance:</dt>
                                        <dd className="clinicalSignificance">
                                            {clinVarInterpretationSummary['ClinicalSignificance']}<br/>{clinVarInterpretationSummary['Explanation']}
                                        </dd>
                                    </dl>
                                    <dl className="inline-dl clearfix col-sm-4">
                                        <dt>Last evaluated:</dt><dd className="dateLastEvaluated">{moment(clinVarInterpretationSummary['DateLastEvaluated']).format('MMM DD, YYYY')}</dd>
                                        <dt>Number of submission(s):</dt><dd className="submissionCount">{clinVarInterpretationSummary['SubmissionCount']}</dd>
                                    </dl>
                                </div>
                            </div>
                            :
                            <div className="panel-body">
                                <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer">Search ClinVar</a> for this variant.</span>
                            </div>
                        }
                    </div>
                </div>

                <div className="panel panel-info datasource-clinical-assertions">
                    <div className="panel-heading">
                        {this.renderClinvarAssertionsHeader(clinvar_id, this.state.loading_clinvarSCV)}
                    </div>
                    <div className="panel-content-wrapper">
                        {this.state.loading_clinvarSCV ? showActivityIndicator('Retrieving data... ') : null}
                        {(clinVarSCV.length > 0) ?
                            <div className="clinical-assertions-content-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Clinical significance (Last evaluated)</th>
                                            <th>Review Status (Assertion method)</th>
                                            <th>Condition(s) (Mode of inheritance)</th>
                                            <th>Submitter - Study name</th>
                                            <th>Submission accession</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clinVarSCV.map((item, i) => {
                                            return (self.renderClinicalAssertions(item, i));
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            :
                            <div className="panel-body">
                                <span>No data was found for this allele in ClinVar. <a href="http://www.ncbi.nlm.nih.gov/clinvar/" target="_blank" rel="noopener noreferrer">Search ClinVar</a> for this variant.</span>
                            </div>
                        }
                    </div>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading"><h3 className="panel-title">ClinVar Primary Transcript</h3></div>
                    <div className="panel-content-wrapper">
                        {this.state.loading_clinvarEutils ? showActivityIndicator('Retrieving data... ') : null}
                        {(primary_transcript && primary_transcript.nucleotide) && ensembl_data.length ?
                            <table className="table clinvar-primary-transcript">
                                <thead>
                                    <tr>
                                        <th>Nucleotide Change</th>
                                        <th className="exon-column">Exon</th>
                                        <th>Protein Change</th>
                                        <th>Molecular Consequence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="hgvs-term">
                                            <span>{primary_transcript.nucleotide}</span>
                                        </td>
                                        <td className="exon-column">
                                            {primary_transcript.exon}
                                        </td>
                                        <td>
                                            {primary_transcript.protein}
                                        </td>
                                        <td>
                                            {primary_transcript.molecular}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            :
                            <div className="panel-body">{self.renderClinvarTranscriptMessage(clinvar_id)}</div>
                        }
                    </div>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">RefSeq Transcripts<a href="#credit-vep" className="credit-vep" title="VEP"><span>VEP</span></a></h3>
                    </div>
                    <div className="panel-content-wrapper">
                        {this.state.loading_ensemblHgvsVEP ? showActivityIndicator('Retrieving data... ') : null}
                        {(this.state.hasHgvsGRCh38 && GRCh38) && ensembl_data.length && transcriptsWithHgvsc.length ?
                            <table className="table refseq-transcript">
                                <thead>
                                    <tr>
                                        <th>Nucleotide Change</th>
                                        <th className="exon-column">Exon</th>
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
                            <div className="panel-body">
                                <span>Unable to return RefSeq transcripts for this allele. <a href="http://www.ncbi.nlm.nih.gov/refseq/" target="_blank" rel="noopener noreferrer">Search RefSeq</a> for transcripts.</span>
                            </div>
                        }
                    </div>
                </div>

                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Ensembl Transcripts<a href="#credit-vep" className="credit-vep" title="VEP"><span>VEP</span></a></h3>
                    </div>
                    <div className="panel-content-wrapper">
                        {this.state.loading_ensemblHgvsVEP ? showActivityIndicator('Retrieving data... ') : null}
                        {(this.state.hasHgvsGRCh38 && GRCh38) && ensembl_data.length && transcriptsWithHgvsc.length ?
                            <table className="table ensembl-transcript">
                                <thead>
                                    <tr>
                                        <th>Nucleotide Change</th>
                                        <th className="exon-column">Exon</th>
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
                            <div className="panel-body">
                                <span>Unable to return Ensembl transcripts for this allele. <a href="http://www.ensembl.org/Homo_sapiens/Info/Index" target="_blank" rel="noopener noreferrer">Search Ensembl</a> for transcripts.</span>
                            </div>
                        }
                    </div>
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
                                <dd className="col-lg-3"><a href={external_url_map['UCSCBrowserHome']} target="_blank">UCSC Browser</a></dd>
                            }
                            {(links_38 || links_37) ?
                                <dd>Variation Viewer [
                                    {links_38 ? <a href={links_38.viewer_url_38} target="_blank" title={'Variation Viewer page for ' + GRCh38 + ' in a new window'}>GRCh38</a> : null }
                                    {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {links_37 ? <a href={links_37.viewer_url_37} target="_blank" title={'Variation Viewer page for ' + GRCh37 + ' in a new window'}>GRCh37</a> : null }
                                    ]
                                </dd>
                                :
                                <dd className="col-lg-4"><a href={external_url_map['VariationViewerHome']} target="_blank">Variation Viewer</a></dd>
                            }
                            {(links_38 || links_37) ?
                                <dd>Ensembl Browser [
                                    {links_38 ? <a href={links_38.ensembl_url_38} target="_blank" title={'Ensembl Browser page for ' + GRCh38 + ' in a new window'}>GRCh38</a> : null }
                                    {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                    {links_37 ? <a href={links_37.ensembl_url_37} target="_blank" title={'Ensembl Browser page for ' + GRCh37 + ' in a new window'}>GRCh37</a> : null }
                                    ]
                                </dd>
                                :
                                <dd className="col-lg-3"><a href={external_url_map['EnsemblBrowserHome']} target="_blank">Ensembl Browser</a></dd>
                            }
                        </dl>
                    </div>
                </div>

                {renderDataCredit('vep')}

            </div>
        );
    }
});
