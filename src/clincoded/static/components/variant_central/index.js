'use strict';
var React = require('react');
var _ = require('underscore');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;

var VariantCurationHeader = require('./header').VariantCurationHeader;
var VariantCurationActions = require('./actions').VariantCurationActions;
var VariantCurationInterpretation = require('./interpretation').VariantCurationInterpretation;
var SO_terms = require('./interpretation/mapping/SO_term.json');
var genomic_chr_mapping = require('./interpretation/mapping/NC_genomic_chr_format.json');
var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;
var queryKeyValue = globals.queryKeyValue;
var parseClinvar = require('../../libs/parse-resources').parseClinvar;
import { getHgvsNotation } from './helpers/hgvs_notation';
import { setPrimaryTranscript } from './helpers/primary_transcript';
import { getClinvarRCVs, parseClinvarInterpretation } from './helpers/clinvar_interpretations';

var CurationInterpretationCriteria = require('./interpretation/criteria').CurationInterpretationCriteria;

// Variant Curation Hub
var VariantCurationHub = React.createClass({
    mixins: [RestMixin],

    getInitialState: function() {
        return {
            variantUuid: queryKeyValue('variant', this.props.href),
            interpretationUuid: queryKeyValue('interpretation', this.props.href),
            interpretation: null,
            editKey: queryKeyValue('edit', this.props.href),
            variantObj: null,
            ext_myVariantInfo: null,
            ext_bustamante: null,
            ext_ensemblVariation: null,
            ext_ensemblHgvsVEP: null,
            ext_clinvarEutils: null,
            ext_clinVarEsearch: null,
            ext_clinVarRCV: null,
            ext_myGeneInfo_MyVariant: null,
            ext_myGeneInfo_VEP: null,
            ext_ensemblGeneId: null,
            ext_geneSynonyms: null,
            loading_clinvarEutils: true,
            loading_clinvarEsearch: true,
            loading_clinvarRCV: true,
            loading_ensemblHgvsVEP: true,
            loading_ensemblVariation: true,
            loading_myVariantInfo: true,
            loading_myGeneInfo: true,
            loading_bustamante: true
        };
    },

    componentDidMount: function() {
        this.getClinVarData(this.state.variantUuid);
        if (this.state.interpretationUuid) {
            this.getRestData('/interpretation/' + this.state.interpretationUuid).then(interpretation => {
                this.setState({interpretation: interpretation});
            });
        }
    },

    // Retrieve the variant object from db with the given uuid
    getClinVarData: function(uuid) {
        return this.getRestData('/variants/' + uuid, null, true).then(response => {
            // The variant object successfully retrieved
            this.setState({variantObj: response});
            // ping out external resources (all async)
            this.fetchClinVarEutils(this.state.variantObj);
            this.fetchMyVariantInfoAndBustamante(this.state.variantObj);
            this.fetchEnsemblVariation(this.state.variantObj);
            this.fetchEnsemblHGVSVEP(this.state.variantObj);
        }).catch(function(e) {
            console.log('FETCH CLINVAR ERROR=: %o', e);
        });
    },

    // Retrieve ClinVar data from Eutils
    fetchClinVarEutils: function(variant) {
        if (variant) {
            if (variant.clinvarVariantId) {
                this.setState({clinvar_id: variant.clinvarVariantId});
                // Get ClinVar data via the parseClinvar method defined in parse-resources.js
                this.getRestDataXml(this.props.href_url.protocol + external_url_map['ClinVarEutils'] + variant.clinvarVariantId).then(xml => {
                    // Passing 'true' option to invoke 'mixin' function
                    // To extract more ClinVar data for 'Basic Information' tab
                    var variantData = parseClinvar(xml, true);
                    this.setState({ext_clinvarEutils: variantData, loading_clinvarEutils: false});
                    this.handleCodonEsearch(variantData);
                    let clinVarRCVs = getClinvarRCVs(xml);
                    return Promise.resolve(clinVarRCVs);
                }).then(RCVs => {
                    // If RCVs is not an empty array,
                    // parse associated disease and clinical significance for each id
                    if (RCVs.length) {
                        let clinvarInterpretations = [];
                        let Urls = [];
                        for (let RCV of RCVs.values()) {
                            Urls.push(this.props.href_url.protocol + external_url_map['ClinVarEfetch'] + '&rettype=clinvarset&id=' + RCV);
                        }
                        return this.getRestDatasXml(Urls).then(xml => {
                            xml.forEach(result => {
                                let clinvarInterpretation = parseClinvarInterpretation(result);
                                clinvarInterpretations.push(clinvarInterpretation);
                                this.setState({ext_clinVarRCV: clinvarInterpretations});
                            });
                            this.setState({loading_clinvarRCV: false});
                        }).catch(err => {
                            this.setState({loading_clinvarRCV: false});
                            console.log('ClinVarEfetch for RCV Error=: %o', err);
                        });
                    } else {
                        this.setState({loading_clinvarRCV: false});
                    }
                }).catch(err => {
                    this.setState({
                        loading_clinvarEutils: false,
                        loading_clinvarRCV: false,
                        loading_clinvarEsearch: false
                    });
                    console.log('ClinVarEutils Fetch Error=: %o', err);
                });
            } else {
                this.setState({
                    loading_clinvarEutils: false,
                    loading_clinvarRCV: false,
                    loading_clinvarEsearch: false
                });
            }
        }
    },

    // Retrieve data from MyVariantInfo and Bustamante data
    fetchMyVariantInfoAndBustamante: function(variant) {
        if (variant) {
            let hgvs_notation = getHgvsNotation(variant, 'GRCh37');
            if (hgvs_notation) {
                this.getRestData(this.props.href_url.protocol + external_url_map['MyVariantInfo'] + hgvs_notation).then(response => {
                    this.setState({ext_myVariantInfo: response, loading_myVariantInfo: false});
                    this.parseMyVariantInfo(response);
                    // check dbsnfp data for bustamante query
                    let hgvsObj = {};
                    hgvsObj.chrom = (response.chrom) ? response.chrom : null;
                    hgvsObj.pos = (response.hg19.start) ? response.hg19.start : null;
                    if (response.dbnsfp) {
                        hgvsObj.alt = (response.dbnsfp.alt) ? response.dbnsfp.alt : null;
                        return Promise.resolve(hgvsObj);
                    } else if (response.clinvar) {
                        hgvsObj.alt = (response.clinvar.alt) ? response.clinvar.alt : null;
                        return Promise.resolve(hgvsObj);
                    } else if (response.dbsnp) {
                        hgvsObj.alt = (response.dbsnp.alt) ? response.dbsnp.alt : null;
                        return Promise.resolve(hgvsObj);
                    }
                }).then(data => {
                    this.getRestData('https:' + external_url_map['Bustamante'] + data.chrom + '/' + data.pos + '/' + data.alt + '/').then(result => {
                        this.setState({ext_bustamante: result, loading_bustamante: false});
                    });
                }).catch(err => {
                    this.setState({
                        loading_myVariantInfo: false,
                        loading_bustamante: false
                    });
                    console.log('MyVariant or Bustamante Fetch Error=: %o', err);
                });
            } else {
                this.setState({
                    loading_myVariantInfo: false,
                    loading_bustamante: false
                });
            }
        }
    },

    // Retrieve data from Ensembl Variation
    fetchEnsemblVariation: function(variant) {
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
            if (rsid) {
                this.getRestData(this.props.href_url.protocol + external_url_map['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1').then(response => {
                    this.setState({ext_ensemblVariation: response, loading_ensemblVariation: false});
                    //this.parseTGenomesData(response);
                    //this.calculateHighestMAF();
                }).catch(err => {
                    this.setState({loading_ensemblVariation: false});
                    console.log('Ensembl Fetch Error=: %o', err);
                });
            } else {
                this.setState({loading_ensemblVariation: false});
            }
        }
    },

    // Retrieve data from Ensembl HGVS VEP
    fetchEnsemblHGVSVEP: function(variant) {
        if (variant) {
            let hgvs_notation = getHgvsNotation(variant, 'GRCh38', true);
            let request_params = '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1&ExAC=1&MaxEntScan=1&GeneSplicer=1&Conservation=1&numbers=1&domains=1&canonical=1&merged=1';
            if (hgvs_notation) {
                this.getRestData(this.props.href_url.protocol + external_url_map['EnsemblHgvsVEP'] + hgvs_notation + request_params).then(response => {
                    this.setState({ext_ensemblHgvsVEP: response, loading_ensemblHgvsVEP: false});
                    this.parseEnsemblGeneId(response);
                    this.parseEnsemblHgvsVEP(response);
                }).catch(err => {
                    this.setState({loading_ensemblHgvsVEP: false});
                    console.log('Ensembl Fetch Error=: %o', err);
                });
            } else {
                this.setState({loading_ensemblHgvsVEP: false});
            }
        }
    },

    // Method to parse Entrez gene symbol and id from myvariant.info
    parseMyVariantInfo: function(myVariantInfo) {
        let geneSymbol, geneId;
        if (myVariantInfo) {
            if (myVariantInfo.clinvar) {
                geneSymbol = myVariantInfo.clinvar.gene.symbol;
                geneId = myVariantInfo.clinvar.gene.id;
            } else if (myVariantInfo.dbsnp) {
                geneSymbol = myVariantInfo.dbsnp.gene.symbol;
                geneId = myVariantInfo.dbsnp.gene.geneid;
            } else if (myVariantInfo.cadd) {
                geneSymbol = myVariantInfo.cadd.gene.genename;
                geneId = myVariantInfo.cadd.gene.gene_id;
            }
            this.fetchMyGeneInfo(geneSymbol, geneId, 'myVariantInfo');
        }
    },

    // Method to parse Ensembl gene_id from VEP
    parseEnsemblGeneId: function(ensemblHgvsVEP) {
        let transcripts = ensemblHgvsVEP[0].transcript_consequences;
        if (transcripts) {
            transcripts.forEach(transcript => {
                // Filter Ensembl transcripts by 'source' and 'canonical' flags
                if (transcript.source === 'Ensembl' && transcript.hgvsc) {
                    if (transcript.canonical && transcript.canonical === 1) {
                        this.setState({ext_ensemblGeneId: transcript.gene_id});
                    }
                }
            });
        }
    },

    // Method to parse Entrez gene symbol and id from VEP
    parseEnsemblHgvsVEP: function(ensemblHgvsVEP) {
        let geneSymbol, geneId;
        if (ensemblHgvsVEP) {
            let primaryTranscript = setPrimaryTranscript(ensemblHgvsVEP);
            if (primaryTranscript) {
                geneSymbol = primaryTranscript.gene_symbol;
                geneId = primaryTranscript.gene_id;
            }
            this.fetchMyGeneInfo(geneSymbol, geneId, 'ensemblHgvsVEP');
        }
    },

    // Method to fetch Gene-centric data from mygene.info
    // and pass the data object to child component
    fetchMyGeneInfo: function(geneSymbol, geneId, source) {
        if (geneSymbol) {
            this.getRestData('/genes/' + geneSymbol).then(response => {
                this.setState({ext_geneSynonyms: response.synonyms});
            }).catch(err => {
                console.log('Local Gene Symbol Fetch ERROR=: %o', err);
            });
        }
        if (geneId) {
            let fields = 'fields=entrezgene,exac,HGNC,MIM,homologene.id,interpro,name,pathway.kegg,pathway.netpath,pathway.pid,pdb,pfam,pharmgkb,prosite,uniprot.Swiss-Prot,summary,symbol';
            this.getRestData(this.props.href_url.protocol + external_url_map['MyGeneInfo'] + geneId + '&species=human&' + fields).then(result => {
                let geneObj = result.hits[0];
                if (source === 'myVariantInfo') {
                    this.setState({ext_myGeneInfo_MyVariant: geneObj});
                } else if (source === 'ensemblHgvsVEP') {
                    this.setState({ext_myGeneInfo_VEP: geneObj});
                }
                this.setState({loading_myGeneInfo: false});
            }).catch(err => {
                this.setState({loading_myGeneInfo: false});
                console.log('MyGeneInfo Fetch Error=: %o', err);
            });
        }
    },

    // Retrieve codon data from ClinVar Esearch given Eutils/ClinVar response
    handleCodonEsearch: function(response) {
        let aminoAcidLocation = response.allele.ProteinChange;
        let symbol = response.gene.symbol;
        if (aminoAcidLocation && symbol) {
            let term = aminoAcidLocation.substr(0, aminoAcidLocation.length-1);
            this.getRestData(this.props.href_url.protocol + external_url_map['ClinVarEsearch'] + 'db=clinvar&term=' + term + '+%5Bvariant+name%5D+and+' + symbol + '&retmode=json').then(result => {
                // pass in these additional values, in case receiving component needs them
                result.vci_term = term;
                result.vci_symbol = symbol;
                this.setState({ext_clinVarEsearch: result, loading_clinvarEsearch: false});
            }).catch(err => {
                this.setState({loading_clinvarEsearch: false});
                console.log('ClinVarEsearch Fetch Error=: %o', err);
            });
        } else {
            this.setState({loading_clinvarEsearch: false});
        }
    },

    // method to update the interpretation object and send it down to child components on demand
    updateInterpretationObj: function() {
        this.getRestData('/interpretation/' + this.state.interpretationUuid).then(interpretation => {
            this.setState({interpretation: interpretation});
        });
    },

    render: function() {
        var variantData = this.state.variantObj;
        var interpretation = (this.state.interpretation) ? this.state.interpretation : null;
        var interpretationUuid = (this.state.interpretationUuid) ? this.state.interpretationUuid : null;
        var editKey = this.state.editKey;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        return (
            <div>
                <VariantCurationHeader variantData={variantData} interpretationUuid={interpretationUuid} session={session} interpretation={interpretation} />
                <CurationInterpretationCriteria interpretation={interpretation} />
                <VariantCurationActions variantData={variantData} interpretation={interpretation} editKey={editKey} session={session}
                    href_url={this.props.href} updateInterpretationObj={this.updateInterpretationObj} />
                <VariantCurationInterpretation variantData={variantData} interpretation={interpretation} editKey={editKey} session={session}
                    href_url={this.props.href_url} updateInterpretationObj={this.updateInterpretationObj}
                    ext_myGeneInfo={(this.state.ext_myGeneInfo_MyVariant) ? this.state.ext_myGeneInfo_MyVariant : this.state.ext_myGeneInfo_VEP}
                    ext_myVariantInfo={this.state.ext_myVariantInfo}
                    ext_bustamante={this.state.ext_bustamante}
                    ext_ensemblVariation={this.state.ext_ensemblVariation}
                    ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                    ext_clinvarEutils={this.state.ext_clinvarEutils}
                    ext_clinVarEsearch={this.state.ext_clinVarEsearch}
                    ext_clinVarRCV={this.state.ext_clinVarRCV}
                    ext_ensemblGeneId={this.state.ext_ensemblGeneId}
                    ext_geneSynonyms={this.state.ext_geneSynonyms}
                    loading_clinvarEutils={this.state.loading_clinvarEutils}
                    loading_clinvarEsearch={this.state.loading_clinvarEsearch}
                    loading_clinvarRCV={this.state.loading_clinvarRCV}
                    loading_ensemblHgvsVEP={this.state.loading_ensemblHgvsVEP}
                    loading_ensemblVariation={this.state.loading_ensemblVariation}
                    loading_myVariantInfo={this.state.loading_myVariantInfo}
                    loading_myGeneInfo={this.state.loading_myGeneInfo}
                    loading_bustamante={this.state.loading_bustamante} />
            </div>
        );
    }
});

globals.curator_page.register(VariantCurationHub, 'curator_page', 'variant-central');
