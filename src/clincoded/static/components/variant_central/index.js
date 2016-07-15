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
            variantObj: null,
            isLoadingComplete: false,
            ext_myVariantInfo: null,
            ext_ensemblHgvsVEP: null,
            ext_ensemblVEP: null,
            ext_ensemblVariation: null,
            ext_clinvarEutils: null,
            ext_clinVarEsearch: null,
            ext_bustamante: null
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
            this.setState({isLoadingComplete: true});
            // ping out external resources (all async)
            this.fetchMyVariantInfoAndBustamante();
            this.fetchEnsemblVEP();
            this.fetchEnsemblVariation();
            this.fetchEnsemblHGVSVEP();
            this.fetchClinVarEutilsEsearch();
        }).catch(function(e) {
            console.log('FETCH CLINVAR ERROR=: %o', e);
        });
    },

    // Retrieve data from MyVariantInfo and Bustamante data
    fetchMyVariantInfoAndBustamante: function() {
        var variant = this.state.variantObj;
        if (variant) {
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
            if (variant_id) {
                this.getRestData(this.props.href_url.protocol + external_url_map['MyVariantInfo'] + variant_id).then(response => {
                    this.setState({ext_myVariantInfo: response});
                    // check dbsnfp data for bustamante query
                    var hgvsObj = {};
                    if (response.dbnsfp) {
                        hgvsObj.chrom = (response.dbnsfp.chrom) ? response.dbnsfp.chrom : null;
                        hgvsObj.pos = (response.dbnsfp.hg19.start) ? response.dbnsfp.hg19.start : null;
                        hgvsObj.alt = (response.dbnsfp.alt) ? response.dbnsfp.alt : null;
                        return Promise.resolve(hgvsObj);
                    } else if (response.clinvar) {
                        hgvsObj.chrom = (response.clinvar.chrom) ? response.clinvar.chrom : null;
                        hgvsObj.pos = (response.clinvar.hg19.start) ? response.clinvar.hg19.start : null;
                        hgvsObj.alt = (response.clinvar.alt) ? response.clinvar.alt : null;
                        return Promise.resolve(hgvsObj);
                    }
                }).then(data => {
                    this.getRestData('https:' + external_url_map['Bustamante'] + data.chrom + '/' + data.pos + '/' + data.alt + '/').then(result => {
                        this.setState({ext_bustamante: result});
                    });
                }).catch(function(e) {
                    console.log('MyVariant or Bustamante Fetch Error=: %o', e);
                });
            }
        }
    },

    // Retrieve data from Ensembl VEP
    fetchEnsemblVEP: function() {
        var variant = this.state.variantObj;
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
            if (rsid) {
                this.getRestData(this.props.href_url.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json').then(response => {
                    this.setState({ext_ensemblVEP: response});
                }).catch(function(e) {
                    console.log('VEP Allele Frequency Fetch Error=: %o', e);
                });
            }
        }
    },

    // Retrieve data from Ensembl Variation
    fetchEnsemblVariation: function() {
        var variant = this.state.variantObj;
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
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
    },

    // Retrieve data from Ensembl HGVS VEP
    fetchEnsemblHGVSVEP: function() {
        var variant = this.state.variantObj;
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
                        this.setState({ext_ensemblHgvsVEP: response});
                    }).catch(function(e) {
                        console.log('Ensembl Fetch Error=: %o', e);
                    });
                }
            }
        }
    },

    // Retrieve data from ClinVar Eutils and Esearch
    fetchClinVarEutilsEsearch: function() {
        var variant = this.state.variantObj;
        if (variant) {
            if (variant.clinvarVariantId) {
                this.setState({clinvar_id: variant.clinvarVariantId});
                // Get ClinVar data via the parseClinvar method defined in parse-resources.js
                this.getRestDataXml(this.props.href_url.protocol + external_url_map['ClinVarEutils'] + variant.clinvarVariantId).then(xml => {
                    // Passing 'true' option to invoke 'mixin' function
                    // To extract more ClinVar data for 'Basic Information' tab
                    var variantData = parseClinvar(xml, true);
                    this.setState({ext_clinvarEutils: variantData});
                    var clinVarObj = {};
                    clinVarObj.protein_change = variantData.allele.ProteinChange;
                    clinVarObj.gene_symbol = variantData.gene.symbol;
                    if (clinVarObj) {
                        return Promise.resolve(clinVarObj);
                    }
                }).then(clinvar => {
                    if (clinvar.protein_change && clinvar.gene_symbol) {
                        var term = clinvar.protein_change.substr(0, clinvar.protein_change.length-1);
                        var symbol = clinvar.gene_symbol;
                        this.getRestData(this.props.href_url.protocol + external_url_map['ClinVarEsearch'] + 'db=clinvar&term=' + term + '*+%5Bvariant+name%5D+and+' + symbol + '&retmode=json').then(result => {
                            // pass in these additional values, in case receiving component needs them
                            result.vci_term = term;
                            result.vci_symbol = symbol;
                            this.setState({ext_clinVarEsearch: result});
                        });
                    }
                }).catch(function(e) {
                    console.log('ClinVarEutils or ClinVarEsearch Fetch Error=: %o', e);
                });
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
                    ext_bustamante={this.state.ext_bustamante}
                    href_url={this.props.href_url} updateInterpretationObj={this.updateInterpretationObj} />
            </div>
        );
    }
});

globals.curator_page.register(VariantCurationHub, 'curator_page', 'variant-central');
