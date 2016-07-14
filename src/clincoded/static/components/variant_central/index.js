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

// Variant Curation Hub
var VariantCurationHub = React.createClass({
    mixins: [RestMixin],

    getInitialState: function() {
        return {
            variantUuid: queryKeyValue('variant', this.props.href),
            interpretationUuid: queryKeyValue('interpretation', this.props.href),
            interpretation: null,
            editKey: queryKeyValue('edit', this.props.href),
            data: null,
            variantObj: null,
            isLoadingComplete: false,
            ext_myVariantInfo: null,
            ext_ensemblHgvsVEP: null,
            ext_ensemblVEP: null,
            ext_ensemblVariation: null,
            ext_clinvarEutils: null,
            ext_clinVarEsearch: null
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
            this.setState({variantObj: response, data: response});
            this.setState({isLoadingComplete: true});

            this.fetchExternalData('myVariantInfo');
            this.fetchExternalData('Ensembl');
            this.fetchEnsemblData();
            this.fetchRefseqData();
            this.fetchExternalData2('clinvar');
        }).catch(function(e) {
            console.log('FETCH CLINVAR ERROR=: %o', e);
        });
    },

        // Retrieve ExAC population data from myvariant.info
    fetchExternalData: function(mode) {
        var variant = this.state.data;
        var url = this.props.href_url.protocol + external_url_map['MyVariantInfo'];
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
            // Extract genomic substring from HGVS name whose assembly is GRCh37
            // Both of "GRCh37" and "gRCh37" instances are possibly present in the variant object
            var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
            var NC_genomic = hgvs_GRCh37 ? hgvs_GRCh37.substr(0, hgvs_GRCh37.indexOf(':')) : null;
            // 'genomic_chr_mapping' is defined via requiring external mapping file
            var found = genomic_chr_mapping.GRCh37.find((entry) => entry.GenomicRefSeq === NC_genomic);
            // Format variant_id for use of myvariant.info REST API
            var variant_id = (hgvs_GRCh37 && found) ? found.ChrFormat + hgvs_GRCh37.slice(hgvs_GRCh37.indexOf(':')) : null;
            if (variant_id && variant_id.indexOf('del') > 0) {
                variant_id = variant_id.substring(0, variant_id.indexOf('del') + 3);
            }
            if (mode === 'myVariantInfo') {
                if (variant_id) {
                    this.getRestData(url + variant_id).then(response => {
                        // Calling methods to update global object with ExAC & ESP population data
                        // FIXME: Need to create a new copy of the global object with new data
                        // while leaving the original object with pre-existing data
                        // for comparison of any potential changed values
                        this.setState({ext_myVariantInfo: response});
                        //this.parseExacData(response);
                        //this.parseEspData(response);
                        //this.calculateHighestMAF();
                    }).catch(function(e) {
                        console.log('MyVariant Fetch Error=: %o', e);
                    });
                }
                if (rsid) {
                    this.getRestData(this.props.href_url.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json').then(response => {
                        // Calling method to update global object with ExAC Allele Frequency data
                        this.setState({ext_ensemblVEP: response});
                        //this.parseAlleleFrequencyData(response);
                        //this.parseGeneConstraintScores(response);
                        //this.calculateHighestMAF();
                    }).catch(function(e) {
                        console.log('VEP Allele Frequency Fetch Error=: %o', e);
                    });
                }
            } else if (mode === 'Ensembl') {
                if (rsid) {
                    this.getRestData(this.props.href_url.protocol + external_url_map['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1').then(response => {
                        this.setState({ext_ensemblVariation: response});
                        //this.parseTGenomesData(response);
                        //this.calculateHighestMAF();
                    }).catch(function(e) {
                        console.log('Ensembl Fetch Error=: %o', e);
                    });
                }
            }
        }
    },

        // Retrieve the variant data from NCBI REST API
    fetchRefseqData: function() {
        //var refseq_data = {};
        var variant = this.state.data;
        var url = this.props.href_url.protocol + external_url_map['ClinVarEutils'];
        if (variant) {
            if (variant.clinvarVariantId) {
                this.setState({clinvar_id: variant.clinvarVariantId});
                // Get ClinVar data via the parseClinvar method defined in parse-resources.js
                this.getRestDataXml(url + variant.clinvarVariantId).then(xml => {
                    // Passing 'true' option to invoke 'mixin' function
                    // To extract more ClinVar data for 'Basic Information' tab
                    var variantData = parseClinvar(xml, true);
                    this.setState({ext_clinvarEutils: variantData});
                    /*
                    this.setState({
                        hasRefseqData: true,
                        clinvar_hgvs_names: this.parseHgvsNames(variantData.hgvsNames),
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
                    */
                }).catch(function(e) {
                    console.log('RefSeq Fetch Error=: %o', e);
                });
            }
            /*
            if (variant.carId) {
                this.setState({car_id: variant.carId});
            }
            if (variant.dbSNPIds.length) {
                this.setState({dbSNP_id: variant.dbSNPIds[0]});
            }
            // Extract genomic substring from HGVS name whose assembly is GRCh37 or GRCh38
            // Both of "GRCh37" and "gRCh37" (same for GRCh38) instances are possibly present in the variant object
            // FIXME: this GRCh vs gRCh needs to be reconciled in the data model and data import
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
            */
        }
    },

        // Retrieve variant data from Ensembl REST API
    fetchEnsemblData: function() {
        var variant = this.state.data;
        if (variant) {
            // Due to GRCh38 HGVS notations being used at Ensembl for their VEP API
            // We are extracting genomic substring from HGVS name whose assembly is GRCh38
            // Both of "GRCh38" and "gRCh38" instances are possibly present in the variant object
            var hgvs_GRCh38 = (variant.hgvsNames.GRCh38) ? variant.hgvsNames.GRCh38 : variant.hgvsNames.gRCh38;
            if (hgvs_GRCh38) {
                var NC_genomic = hgvs_GRCh38.substr(0, hgvs_GRCh38.indexOf(':'));
                // 'genomic_chr_mapping' is defined via requiring external mapping file
                var found = genomic_chr_mapping.GRCh38.find((entry) => entry.GenomicRefSeq === NC_genomic);
                // Can't simply filter alpha letters due to the presence of 'chrX' and 'chrY'
                var chrosome = (found.ChrFormat) ? found.ChrFormat.substr(3) : '';
                // Format hgvs_notation for vep/:species/hgvs/:hgvs_notation api
                var hgvs_notation = chrosome + hgvs_GRCh38.slice(hgvs_GRCh38.indexOf(':'));
                if (hgvs_notation) {
                    if (hgvs_notation.indexOf('del') > 0) {
                        hgvs_notation = hgvs_notation.substring(0, hgvs_notation.indexOf('del') + 3);
                    }
                    this.getRestData(this.props.href_url.protocol + external_url_map['EnsemblHgvsVEP'] + hgvs_notation + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1&domains=1').then(response => {
                        /*
                        this.setState({
                            hasEnsemblData: true,
                            ensembl_transcripts: response[0].transcript_consequences
                        });
                        */
                        this.setState({ext_ensemblHgvsVEP: response});
                    }).catch(function(e) {
                        console.log('Ensembl Fetch Error=: %o', e);
                    });
                }
            }
        }
    },

        // Retrieve predictors data from myvariant.info
    fetchExternalData2: function(source) {
        var variant = this.state.data;
        var url = this.props.href_url.protocol + external_url_map['MyVariantInfo'];
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
            // Extract genomic substring from HGVS name whose assembly is GRCh37
            // Both of "GRCh37" and "gRCh37" instances are possibly present in the variant object
            var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
            var NC_genomic = hgvs_GRCh37 ? hgvs_GRCh37.substr(0, hgvs_GRCh37.indexOf(':')) : null;
            // 'genomic_chr_mapping' is defined via requiring external mapping file
            var found = genomic_chr_mapping.GRCh37.find((entry) => entry.GenomicRefSeq === NC_genomic);
            // Format variant_id for use of myvariant.info REST API
            var variant_id = (hgvs_GRCh37 && found) ? found.ChrFormat + hgvs_GRCh37.slice(hgvs_GRCh37.indexOf(':')) : null;
            if (variant_id && variant_id.indexOf('del') > 0) {
                variant_id = variant_id.substring(0, variant_id.indexOf('del') + 3);
            }
            if (source === 'myVariantInfo') {
                /*
                if (variant_id) {
                    this.getRestData(url + variant_id).then(response => {
                        // Calling methods to update global object with predictors data
                        // FIXME: Need to create a new copy of the global object with new data
                        // while leaving the original object with pre-existing data
                        // for comparison of any potential changed values
                        this.parseOtherPredData(response);
                        this.parseConservationData(response);
                    }).catch(function(e) {
                        console.log('MyVariant Fetch Error=: %o', e);
                    });
                }
                */
            } else if (source === 'clinvar') {
                if (variant.clinvarVariantId) {
                    // Get ClinVar data via the parseClinvar method defined in parse-resources.js
                    this.getRestDataXml(this.props.href_url.protocol + external_url_map['ClinVarEutils'] + variant.clinvarVariantId).then(xml => {
                        // Passing 'true' option to invoke 'mixin' function
                        // To extract more ClinVar data for codon data
                        var variantData = parseClinvar(xml, true);
                        var clinVarObj = {};
                        clinVarObj.protein_change = variantData.allele.ProteinChange;
                        clinVarObj.gene_symbol = variantData.gene.symbol;
                        if (clinVarObj) {
                            return Promise.resolve(clinVarObj);
                        }
                    }).then(clinvar => {
                        var term = clinvar.protein_change.substr(0, clinvar.protein_change.length-1);
                        var symbol = clinvar.gene_symbol;
                        this.getRestData(this.props.href_url.protocol + external_url_map['ClinVarEsearch'] + 'db=clinvar&term=' + term + '*+%5Bvariant+name%5D+and+' + symbol + '&retmode=json').then(result => {
                            this.setState({ext_clinVarEsearch: result});
                            /*
                            var codonObj = {};
                            codonObj.count = result.esearchresult.count;
                            codonObj.term = term;
                            codonObj.symbol = symbol;
                            this.setState({hasClinVarData: true, codonObj: codonObj});
                            */
                        });
                    }).catch(function(e) {
                        console.log('ClinVar Fetch Error=: %o', e);
                    });
                }
            }
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
        var isLoadingComplete = this.state.isLoadingComplete;
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;

        return (
            <div>
                <VariantCurationHeader variantData={variantData} interpretationUuid={interpretationUuid} session={session} interpretation={interpretation} />
                <VariantCurationActions variantData={variantData} interpretation={interpretation} editKey={editKey} session={session}
                    href_url={this.props.href} updateInterpretationObj={this.updateInterpretationObj} />
                <VariantCurationInterpretation variantData={variantData} interpretation={interpretation} editKey={editKey} session={session}
                    ext_myVariantInfo={this.state.ext_myVariantInfo}
                    ext_ensemblHgvsVEP={this.state.ext_ensemblHgvsVEP}
                    ext_ensemblVEP={this.state.ext_ensemblVEP}
                    ext_ensemblVariation={this.state.ext_ensemblVariation} ext_clinvarEutils={this.state.ext_clinvarEutils}
                    ext_clinVarEsearch={this.state.ext_clinVarEsearch}
                    href_url={this.props.href_url} updateInterpretationObj={this.updateInterpretationObj} />
            </div>
        );
    }
});

globals.curator_page.register(VariantCurationHub, 'curator_page', 'variant-central');
