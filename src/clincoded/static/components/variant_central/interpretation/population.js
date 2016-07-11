'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
//var LocalStorageMixin = require('react-localstorage');
var CurationInterpretationForm = require('./shared/form').CurationInterpretationForm;
var parseAndLogError = require('../../mixins').parseAndLogError;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
var genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');

var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;
var queryKeyValue = globals.queryKeyValue;

var form = require('../../../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

var populationStatic = {
    exac: {
        _order: ['afr', 'oth', 'amr', 'sas', 'nfe', 'eas', 'fin'],
        _labels: {afr: 'African', amr: 'Latino', eas: 'East Asian', fin: 'European (Finnish)', nfe: 'European (Non-Finnish)', oth: 'Other', sas: 'South Asian'}
    },
    tGenomes: {
        _order: ['afr', 'amr', 'eas', 'eur', 'sas', 'espaa', 'espea'],
        _labels: {afr: 'AFR', amr: 'AMR', eas: 'EAS', eur: 'EUR', sas: 'SAS', espaa: 'ESP6500: African American', espea: 'ESP6500: European American'}
    },
    esp: {
        _order: ['ea', 'aa'],
        _labels: {ea: 'EA Allele', aa: 'AA Allele'}
    }
};

// Display the population data of external sources
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            interpretation: this.props.interpretation,
            ensembl_exac_allele: {},
            interpretationUuid: this.props.interpretationUuid,
            hasExacData: false, // flag to display ExAC table
            hasTGenomesData: false,
            hasEspData: false, // flag to display ESP table
            geneENSG: null,
            populationObj: {
                highestMAF: null,
                exac: {
                    afr: {}, amr: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {}
                },
                tGenomes: {
                    afr: {ac: {}, af: {}, gc: {}, gf: {}},
                    amr: {ac: {}, af: {}, gc: {}, gf: {}},
                    eas: {ac: {}, af: {}, gc: {}, gf: {}},
                    eur: {ac: {}, af: {}, gc: {}, gf: {}},
                    sas: {ac: {}, af: {}, gc: {}, gf: {}},
                    espaa: {ac: {}, af: {}, gc: {}, gf: {}},
                    espea: {ac: {}, af: {}, gc: {}, gf: {}},
                    _tot: {ac: {}, af: {}, gc: {}, gf: {}},
                    _extra: {}
                },
                esp: {
                    aa: {ac: {}, gc: {}},
                    ea: {ac: {}, gc: {}},
                    _tot: {ac: {}, gc: {}},
                    _extra: {}
                }
            }
        };
    },

    componentDidMount: function() {
        this.setState({interpretation: this.props.interpretation});
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
        if (nextProps.data && this.props.data) {
            if (!this.state.hasExacData || !this.state.hasEspData) {
                this.fetchExternalData('myVariantInfo');
            }
            if (!this.state.hasTGenomesData) {
                this.fetchExternalData('Ensembl');
            }
        }
    },

    componentWillUnmount: function() {
        this.setState({
            hasExacData: false,
            hasTGenomesData: false,
            hasEspData: false
        });
    },

    // Retrieve ExAC population data from myvariant.info
    fetchExternalData: function(mode) {
        var variant = this.props.data;
        var url = this.props.protocol + external_url_map['MyVariantInfo'];
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds && variant.dbSNPIds.length > 0) ? variant.dbSNPIds[0].match(numberPattern) : null;
            // Extract genomic substring from HGVS name whose assembly is GRCh37
            // Both of "GRCh37" and "gRCh37" instances are possibly present in the variant object
            var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
            var NC_genomic = hgvs_GRCh37 ? hgvs_GRCh37.substr(0, hgvs_GRCh37.indexOf(':')) : null;
            // 'genomic_chr_mapping' is defined via requiring external mapping file
            var found = genomic_chr_mapping.find((entry) => entry.GenomicRefSeq === NC_genomic);
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
                        this.parseExacData(response);
                        this.parseEspData(response);
                        this.calculateHighestMAF();
                    }).catch(function(e) {
                        console.log('MyVariant Fetch Error=: %o', e);
                    });
                }
                if (rsid) {
                    this.getRestData(this.props.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json').then(response => {
                        // Calling method to update global object with ExAC Allele Frequency data
                        this.parseAlleleFrequencyData(response);
                        this.parseGeneConstraintScores(response);
                        this.calculateHighestMAF();
                    }).catch(function(e) {
                        console.log('VEP Allele Frequency Fetch Error=: %o', e);
                    });
                }
            } else if (mode === 'Ensembl') {
                if (rsid) {
                    this.getRestData(this.props.protocol + external_url_map['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1').then(response => {
                        this.parseTGenomesData(response);
                        this.calculateHighestMAF();
                    }).catch(function(e) {
                        console.log('Ensembl Fetch Error=: %o', e);
                    });
                }
            }
        }
    },

    // Get ExAC allele frequency from Ensembl (VEP) directly
    // Because myvariant.info doesn't always return ExAC allele frequency data
    parseAlleleFrequencyData: function(response) {
        let populationObj = this.state.populationObj;
        populationStatic.exac._order.map(key => {
            populationObj.exac[key].af = parseFloat(response[0].colocated_variants[0]['exac_' + key + '_maf']);
        });
        populationObj.exac._tot.af = parseFloat(response[0].colocated_variants[0].exac_adj_maf);

        this.setState({populationObj: populationObj});
    },

    // Get gene ENSG value to link out to Gene's page on ExAC, as temporary stop gap for displaying
    // constraint scores (see #750)
    parseGeneConstraintScores: function(response) {
        if (response && response.length > 0 && response[0].transcript_consequences && response[0].transcript_consequences.length > 0) {
            this.setState({geneENSG: response[0].transcript_consequences[0].gene_id});
        }
    },

    // Method to assign ExAC population data to global population object
    parseExacData: function(response) {
        // Not all variants can be found in ExAC
        // Do nothing if the exac{...} object is not returned from myvariant.info
        if (response.exac) {
            let populationObj = this.state.populationObj;
            // get the allele count, allele number, and homozygote count for desired populations
            populationStatic.exac._order.map(key => {
                populationObj.exac[key].ac = parseInt(response.exac.ac['ac_' + key]);
                populationObj.exac[key].an = parseInt(response.exac.an['an_' + key]);
                populationObj.exac[key].hom = parseInt(response.exac.hom['hom_' + key]);
            });
            // get the allele count, allele number, and homozygote count totals
            populationObj.exac._tot.ac = parseInt(response.exac.ac.ac_adj);
            populationObj.exac._tot.an = parseInt(response.exac.an.an_adj);
            populationObj.exac._tot.hom = parseInt(response.exac.hom.ac_hom);
            // get extra ExAC information
            populationObj.exac._extra.chrom = response.exac.chrom + ''; // ensure that the chromosome is stored as a String
            populationObj.exac._extra.pos = parseInt(response.exac.pos);
            populationObj.exac._extra.ref = response.exac.ref;
            populationObj.exac._extra.alt = response.exac.alt;
            // update populationObj, and set flag indicating that we have ExAC data
            this.setState({hasExacData: true, populationObj: populationObj});
        }
    },

    // parse 1000Genome data
    parseTGenomesData: function(response) {
        // not all variants are SNPs. Do nothing if variant is not a SNP
        if (response.var_class && response.var_class == 'SNP') {
            // FIXME: this GRCh vs gRCh needs to be reconciled in the data model and data import
            let hgvs_GRCh37 = (this.props.data.hgvsNames.GRCh37) ? this.props.data.hgvsNames.GRCh37 : this.props.data.hgvsNames.gRCh37;
            let hgvs_GRCh38 = (this.props.data.hgvsNames.GRCh38) ? this.props.data.hgvsNames.GRCh38 : this.props.data.hgvsNames.gRCh38;
            let populationObj = this.state.populationObj;
            let updated1000GData = false;
            // get extra 1000Genome information
            populationObj.tGenomes._extra.name = response.name;
            populationObj.tGenomes._extra.var_class = response.var_class;
            if (hgvs_GRCh37.indexOf('>') > -1 || hgvs_GRCh38.indexOf('>') > -1) {
                // if SNP variant, extract allele information from hgvs names, preferring grch38
                populationObj.tGenomes._extra.ref = hgvs_GRCh38 ? hgvs_GRCh38.charAt(hgvs_GRCh38.length - 3) : hgvs_GRCh37.charAt(hgvs_GRCh37.length - 3);
                populationObj.tGenomes._extra.alt = hgvs_GRCh38 ? hgvs_GRCh38.charAt(hgvs_GRCh38.length - 1) : hgvs_GRCh37.charAt(hgvs_GRCh37.length - 1);
            } else {
                // fallback for non-SNP variants
                populationObj.tGenomes._extra.ref = response.ancestral_allele;
                populationObj.tGenomes._extra.alt = response.minor_allele;
            }
            // get the allele count and frequencies...
            if (response.populations) {
                response.populations.map(population => {
                    // extract 20 characters and forward to get population code (not always relevant)
                    let populationCode = population.population.substring(20).toLowerCase();
                    if (population.population.indexOf('1000GENOMES:phase_3') == 0 &&
                        populationStatic.tGenomes._order.indexOf(populationCode) > 0) {
                        this.parseTGenomesDataAltAllele(populationObj, population);
                        // ... for specific populations =
                        populationObj.tGenomes[populationCode].ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes[populationCode].af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    } else if (population.population == '1000GENOMES:phase_3:ALL') {
                        this.parseTGenomesDataAltAllele(populationObj, population);
                        // ... and totals
                        populationObj.tGenomes._tot.ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes._tot.af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    } else if (population.population == 'ESP6500:African_American') {
                        this.parseTGenomesDataAltAllele(populationObj, population);
                        // ... and ESP AA
                        populationObj.tGenomes.espaa.ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes.espaa.af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    } else if (population.population == 'ESP6500:European_American') {
                        this.parseTGenomesDataAltAllele(populationObj, population);
                        // ... and ESP EA
                        populationObj.tGenomes.espea.ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes.espea.af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    }
                });
            }
            // get the genotype counts and frequencies...
            if (response.population_genotypes) {
                response.population_genotypes.map(population_genotype => {
                    // extract 20 characters and forward to get population code (not always relevant)
                    let populationCode = population_genotype.population.substring(20).toLowerCase();
                    if (population_genotype.population.indexOf('1000GENOMES:phase_3:') == 0 &&
                        populationStatic.tGenomes._order.indexOf(populationCode) > 0) {
                        // ... for specific populations
                        populationObj.tGenomes[populationCode].gc[population_genotype.genotype] = parseInt(population_genotype.count);
                        populationObj.tGenomes[populationCode].gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
                        updated1000GData = true;
                    } else if (population_genotype.population == '1000GENOMES:phase_3:ALL') {
                        // ... and totals
                        populationObj.tGenomes._tot.gc[population_genotype.genotype] = parseInt(population_genotype.count);
                        populationObj.tGenomes._tot.gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
                        updated1000GData = true;
                    } else if (population_genotype.population == 'ESP6500:African_American') {
                        // ... and ESP AA
                        populationObj.tGenomes.espaa.gc[population_genotype.genotype] = parseInt(population_genotype.count);
                        populationObj.tGenomes.espaa.gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
                        updated1000GData = true;
                    } else if (population_genotype.population == 'ESP6500:European_American') {
                        // ... and ESP EA
                        populationObj.tGenomes.espea.gc[population_genotype.genotype] = parseInt(population_genotype.count);
                        populationObj.tGenomes.espea.gf[population_genotype.genotype] = parseFloat(population_genotype.frequency);
                        updated1000GData = true;
                    }
                });
            }
            if (updated1000GData) {
                // update populationObj, and set flag indicating that we have 1000Genomes data
                this.setState({hasTGenomesData: true, populationObj: populationObj});
            }
        }
    },

    parseTGenomesDataAltAllele: function(populationObj, population) {
        if (!populationObj.tGenomes._extra.alt && population.allele != populationObj.tGenomes._extra.ref) {
            populationObj.tGenomes._extra.alt = population.allele;
        }
        return populationObj;
    },

    // Method to assign ESP population data to global population object
    parseEspData: function(response) {
        // Not all variants return the evs{...} object from myvariant.info
        if (response.evs) {
            let populationObj = this.state.populationObj;
            // get relevant numbers and extra information from ESP
            populationObj.esp.aa.ac = this.dictValuesToInt(response.evs.allele_count.african_american);
            populationObj.esp.aa.gc = this.dictValuesToInt(response.evs.genotype_count.african_american);
            populationObj.esp.ea.ac = this.dictValuesToInt(response.evs.allele_count.european_american);
            populationObj.esp.ea.gc = this.dictValuesToInt(response.evs.genotype_count.european_american);
            populationObj.esp._tot.ac = this.dictValuesToInt(response.evs.allele_count.all);
            populationObj.esp._tot.gc = this.dictValuesToInt(response.evs.genotype_count.all_genotype);
            populationObj.esp._extra.avg_sample_read = response.evs.avg_sample_read;
            populationObj.esp._extra.rsid = response.evs.rsid;
            populationObj.esp._extra.chrom = response.evs.chrom + ''; // ensure that the chromosome is stored as a String
            populationObj.esp._extra.hg19_start = parseInt(response.evs.hg19.start);
            populationObj.esp._extra.ref = response.evs.ref;
            populationObj.esp._extra.alt = response.evs.alt;
            // update populationObj, and set flag indicating that we have ESP data
            this.setState({hasEspData: true, populationObj: populationObj});
        }
    },

    // method to run through dictionary/Object's values and convert them to Int
    dictValuesToInt: function(dict) {
        for (var key in dict) {
            dict[key] = parseInt(dict[key]);
        }
        return dict;
    },

    // calculate highest MAF value and related info from external data
    calculateHighestMAF: function() {
        let populationObj = this.state.populationObj;
        let highestMAFObj = {af: 0};
        // check against exac data
        populationStatic.exac._order.map(pop => {
            if (populationObj.exac[pop].af && populationObj.exac[pop].af) {
                if (populationObj.exac[pop].af > highestMAFObj.af) {
                    highestMAFObj.pop = pop;
                    highestMAFObj.popLabel = populationStatic.exac._labels[pop];
                    highestMAFObj.ac = populationObj.exac[pop].ac;
                    highestMAFObj.ac_tot = populationObj.exac[pop].an;
                    highestMAFObj.source = 'ExAC';
                    highestMAFObj.af = populationObj.exac[pop].af;
                }
            }
        });
        // check against 1000g data
        populationStatic.tGenomes._order.map(pop => {
            let ref = populationObj.tGenomes._extra.ref,
                alt = populationObj.tGenomes._extra.alt;
            if (populationObj.tGenomes[pop].af && populationObj.tGenomes[pop].af[alt]) {
                if (populationObj.tGenomes[pop].af[alt] > highestMAFObj.af) {
                    highestMAFObj.pop = pop;
                    highestMAFObj.popLabel = populationStatic.tGenomes._labels[pop];
                    highestMAFObj.ac = populationObj.tGenomes[pop].ac[alt];
                    highestMAFObj.ac_tot = populationObj.tGenomes[pop].ac[ref] + populationObj.tGenomes[pop].ac[alt];
                    highestMAFObj.source = '1000 Genomes';
                    highestMAFObj.af = populationObj.tGenomes[pop].af[alt];
                }
            }
        });
        // check against esp data
        populationStatic.esp._order.map(pop => {
            let alt = populationObj.esp._extra.alt;
            if (populationObj.esp[pop].ac) {
                let ref = populationObj.esp._extra.ref,
                    alt = populationObj.esp._extra.alt;
                // esp does not report back frequencies, so we have to calculate it off counts
                let tempMAF = populationObj.esp[pop].ac[alt] / (populationObj.esp[pop].ac[ref] + populationObj.esp[pop].ac[alt]);
                if (tempMAF > highestMAFObj.af) {
                    highestMAFObj.pop = pop;
                    highestMAFObj.popLabel = populationStatic.esp._labels[pop];
                    highestMAFObj.ac = populationObj.esp[pop].ac[alt];
                    highestMAFObj.ac_tot = populationObj.esp[pop].ac[ref] + populationObj.esp[pop].ac[alt];
                    highestMAFObj.source = 'ESP';
                    highestMAFObj.af = tempMAF;
                }
            }
        });
        // embed highest MAF and related data into population obj, and update to state
        populationObj.highestMAF = highestMAFObj;
        this.setState({populationObj: populationObj});
    },

    // method to render a row of data for the ExAC table
    renderExacRow: function(key, exac, exacStatic, rowNameCustom, className) {
        let rowName = exacStatic._labels[key];
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{exac[key].ac ? exac[key].ac : '--'}</td>
                <td>{exac[key].an ? exac[key].an : '--'}</td>
                <td>{exac[key].hom ? exac[key].hom : '--'}</td>
                <td>{exac[key].af ? exac[key].af : '--'}</td>
            </tr>
        );
    },

    // method to render a row of data for the 1000Genomes table
    renderTGenomesRow: function(key, tGenomes, tGenomesStatic, rowNameCustom, className) {
        let rowName = tGenomesStatic._labels[key];
        // generate genotype strings from reference and alt allele information
        let g_ref = tGenomes._extra.ref + '|' + tGenomes._extra.ref,
            g_alt = tGenomes._extra.alt + '|' + tGenomes._extra.alt,
            g_mixed = tGenomes._extra.ref + '|' + tGenomes._extra.alt;
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{tGenomes[key].af[tGenomes._extra.ref] ? tGenomes._extra.ref + ': ' + tGenomes[key].af[tGenomes._extra.ref] : '--'}{tGenomes[key].ac[tGenomes._extra.ref] ? ' (' + tGenomes[key].ac[tGenomes._extra.ref] + ')' : ''}</td>
                <td>{tGenomes[key].af[tGenomes._extra.alt] ? tGenomes._extra.alt + ': ' + tGenomes[key].af[tGenomes._extra.alt] : '--'}{tGenomes[key].ac[tGenomes._extra.alt] ? ' (' + tGenomes[key].ac[tGenomes._extra.alt] + ')' : ''}</td>
                <td>{tGenomes[key].gf[g_ref] ? g_ref + ': ' + tGenomes[key].gf[g_ref] : '--'}{tGenomes[key].gc[g_ref] ? ' (' + tGenomes[key].gc[g_ref] + ')' : ''}</td>
                <td>{tGenomes[key].gf[g_alt] ? g_alt + ': ' + tGenomes[key].gf[g_alt] : '--'}{tGenomes[key].gc[g_alt] ? ' (' + tGenomes[key].gc[g_alt] + ')' : ''}</td>
                <td>{tGenomes[key].gf[g_mixed] ? g_mixed + ': ' + tGenomes[key].gf[g_mixed] : '--'}{tGenomes[key].gc[g_mixed] ? ' (' + tGenomes[key].gc[g_mixed] + ')' : ''}</td>
            </tr>
        );
    },

    // method to render a row of data for the ESP table
    renderEspRow: function(key, esp, espStatic, rowNameCustom, className) {
        let rowName = espStatic._labels[key];
        // generate genotype strings from reference and alt allele information
        let g_ref = esp._extra.ref + esp._extra.ref,
            g_alt = esp._extra.alt + esp._extra.alt,
            g_mixed = esp._extra.alt + esp._extra.ref;
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{esp[key].ac[esp._extra.ref] ? esp._extra.ref + ': ' + esp[key].ac[esp._extra.ref] : '--'}</td>
                <td>{esp[key].ac[esp._extra.alt] ? esp._extra.alt + ': ' + esp[key].ac[esp._extra.alt] : '--'}</td>
                <td>{esp[key].gc[g_ref] ? g_ref + ': ' + esp[key].gc[g_ref] : '--'}</td>
                <td>{esp[key].gc[g_alt] ? g_alt + ': ' + esp[key].gc[g_alt] : '--'}</td>
                <td>{esp[key].gc[g_mixed] ? g_mixed + ': ' + esp[key].gc[g_mixed] : '--'}</td>
            </tr>
        );
    },

    render: function() {
        var exacStatic = populationStatic.exac,
            tGenomesStatic = populationStatic.tGenomes,
            espStatic = populationStatic.esp;
        var highestMAF = this.state.populationObj && this.state.populationObj.highestMAF ? this.state.populationObj.highestMAF : null,
            exac = this.state.populationObj && this.state.populationObj.exac ? this.state.populationObj.exac : null, // Get ExAC data from global population object
            tGenomes = this.state.populationObj && this.state.populationObj.tGenomes ? this.state.populationObj.tGenomes : null,
            esp = this.state.populationObj && this.state.populationObj.esp ? this.state.populationObj.esp : null; // Get ESP data from global population object

        return (
            <div className="variant-interpretation population">
                {(this.props.data && this.state.interpretation) ?
                <div className="row">
                    <div className="col-sm-12">
                        <CurationInterpretationForm formTitle={"Population Criteria Evaluation"} renderedFormContent={criteriaGroup1}
                            evidenceType={'population'} evidenceData={this.state.populationObj} evidenceDataUpdated={true} formChangeHandler={criteriaGroup1Change}
                            formDataUpdater={criteriaGroup1Update} variantUuid={this.props.data['@id']} criteria={['ba1', 'pm2']} criteriaDisease={['bs1']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                </div>
                : null}

                <div className="bs-callout bs-callout-info clearfix">
                    <h4>Highest Minor Allele Frequency</h4>
                    <div className="clearfix">
                        <div className="bs-callout-content-container">
                            <dl className="inline-dl clearfix">
                                <dt>Population: </dt><dd>{highestMAF && highestMAF.popLabel ? highestMAF.popLabel : 'N/A'}</dd>
                                <dt># Variant Alleles: </dt><dd>{highestMAF && highestMAF.ac ? highestMAF.ac : 'N/A'}</dd>
                                <dt>Total # Alleles Tested: </dt><dd>{highestMAF && highestMAF.ac_tot ? highestMAF.ac_tot : 'N/A'}</dd>
                            </dl>
                        </div>
                        <div className="bs-callout-content-container">
                            <dl className="inline-dl clearfix">
                                <dt>Source: </dt><dd>{highestMAF && highestMAF.source ? highestMAF.source : 'N/A'}</dd>
                                <dt>Allele Frequency: </dt><dd>{highestMAF && highestMAF.af ? highestMAF.af : 'N/A'}</dd>
                                {(this.state.interpretation) ?
                                    <span>
                                        <dt>CI - lower: </dt><dd>XXXXXX</dd>
                                        <dt>CI - upper: </dt><dd>XXXXXX</dd>
                                    </span>
                                : null}
                            </dl>
                        </div>
                    </div>
                    {this.state.geneENSG ?
                        <div>
                            <br />
                            <h4>ExAC Constraint Score</h4>
                            <div className="clearfix">
                                <div className="bs-callout-content-container"><a href={external_url_map['ExACGene'] + this.state.geneENSG} target="_blank">View pLI in ExAC <i className="icon icon-external-link"></i></a></div>
                            </div>
                        </div>
                    : null}
                </div>

                {(this.state.interpretationUuid) ?
                <ul className="section-criteria-evaluation clearfix">
                    <li className="col-xs-12 gutter-exc">
                        <CurationInterpretationForm />
                    </li>
                </ul>
                : null}

                {this.state.hasExacData ?
                    <div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading">
                            <h3 className="panel-title">ExAC {exac._extra.chrom + ':' + exac._extra.pos + ' ' + exac._extra.ref + '/' + exac._extra.alt}
                                <a className="panel-subtitle pull-right" href={this.props.protocol + external_url_map['EXAC'] + exac._extra.chrom + '-' + exac._extra.pos + '-' + exac._extra.ref + '-' + exac._extra.alt} target="_blank">See data in ExAC <i className="icon icon-external-link"></i></a>
                            </h3>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Population</th>
                                    <th>Allele Count</th>
                                    <th>Allele Number</th>
                                    <th>Number of Homozygotes</th>
                                    <th>Allele Frequency</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exacStatic._order.map(key => {
                                    return (this.renderExacRow(key, exac, exacStatic));
                                })}
                            </tbody>
                            <tfoot>
                                {this.renderExacRow('_tot', exac, exacStatic, 'Total', 'count')}
                            </tfoot>
                        </table>
                    </div>
                :
                    <div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading"><h3 className="panel-title">ExAC</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No population data was found for this allele in ExAC. <a href={external_url_map['EXACHome']}>Search ExAC</a> for this variant.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }
                {this.state.hasTGenomesData ?
                    <div className="panel panel-info datasource-1000G">
                        <div className="panel-heading">
                            <h3 className="panel-title">1000 Genomes: {tGenomes._extra.name + ' ' + tGenomes._extra.var_class}
                                <a className="panel-subtitle pull-right" href={external_url_map['EnsemblPopulationPage'] + tGenomes._extra.name} target="_blank">See data in Ensembl <i className="icon icon-external-link"></i></a>
                            </h3>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Population</th>
                                    <th colSpan="2">Allele Frequency (count)</th>
                                    <th colSpan="3">Genotype Frequency (count)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {this.renderTGenomesRow('_tot', tGenomes, tGenomesStatic, 'ALL')}
                                {tGenomesStatic._order.map(key => {
                                    return (this.renderTGenomesRow(key, tGenomes, tGenomesStatic));
                                })}
                            </tbody>
                        </table>
                    </div>
                :
                    <div className="panel panel-info datasource-1000G">
                        <div className="panel-heading"><h3 className="panel-title">1000 Genomes</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No population data was found for this allele in 1000 Genomes. <a href={external_url_map['1000GenomesHome']}>Search 1000 Genomes</a> for this variant.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }
                {this.state.hasEspData ?
                    <div className="panel panel-info datasource-ESP">
                        <div className="panel-heading">
                            <h3 className="panel-title">Exome Sequencing Project (ESP): {esp._extra.rsid + '; ' + esp._extra.chrom + '.' + esp._extra.hg19_start + '; Alleles ' + esp._extra.ref + '>' + esp._extra.alt}
                                <a className="panel-subtitle pull-right" href={dbxref_prefix_map['ESP_EVS'] + 'searchBy=rsID&target=' + esp._extra.rsid + '&x=0&y=0'} target="_blank">See data in ESP <i className="icon icon-external-link"></i></a>
                            </h3>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Population</th>
                                    <th colSpan="2">Allele Count</th>
                                    <th colSpan="3">Genotype Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {espStatic._order.map(key => {
                                    return (this.renderEspRow(key, esp, espStatic));
                                })}
                                {this.renderEspRow('_tot', esp, espStatic, 'All Allele', 'count')}
                            </tbody>
                            <tfoot>
                                <tr className="count">
                                    <td>Average Sample Read Depth</td>
                                    <td colSpan="5">{esp._extra.avg_sample_read}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                :
                    <div className="panel panel-info datasource-ESP">
                        <div className="panel-heading"><h3 className="panel-title">Exome Sequencing Project (ESP)</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>No population data was found for this allele in ESP. <a href={external_url_map['ESPHome']}>Search ESP</a> for this variant.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }
            </div>
        );
    }
});

// code for rendering of population tab interpretation forms
var criteriaGroup1 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-info">
                    <strong>BA1 (Benign):</strong> &gt;0.1% with a 99% CI<br />
                        CI – lower must be &gt;0.1%
                    <br /><br />
                    <strong>PM2 (Rare Enough to be Absent):</strong> &lt;0.5% with a 95% CI<br />
                        CI – lower must be ~0%; CI – upper must stay below (0.05%)
                </p>
            </div>
            <Input type="checkbox" ref="ba1-value" label="BA1 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['ba1-value'] ? this.state.checkboxes['ba1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-8 col-sm-offset-4 input-note-below-no-bottom">- or -</p>
            <Input type="checkbox" ref="pm2-value" label="PM2 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['pm2-value'] ? this.state.checkboxes['pm2-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="ba1-description" label="Explain criteria selection:" rows="5" placeholder="e.g. free text"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <Input type="textarea" ref="pm2-description" label="Explain criteria selection (PM2):" rows="5" placeholder="e.g. free text"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5">
                <p className="alert alert-info">
                    <strong>BS1 (Benign):</strong> Allele frequency greater than expected due to disorder
                </p>
            </div>
            <Input type="checkbox" ref="bs1-value" label={<span>BS1 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['bs1-value'] ? this.state.checkboxes['bs1-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="bs1-description" label="Explain criteria selection:" rows="5" placeholder="e.g. free text" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of population tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'ba1':
                        tempCheckboxes['ba1-value'] = evaluation.value === 'true';
                        this.refs['ba1-description'].setValue(evaluation.description);
                        break;
                    case 'pm2':
                        tempCheckboxes['pm2-value'] = evaluation.value === 'true';
                        this.refs['pm2-description'].setValue(evaluation.description);
                        break;
                    case 'bs1':
                        tempCheckboxes['bs1-value'] = evaluation.value === 'true';
                        this.refs['bs1-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for handling logic within the form
var criteriaGroup1Change = function(ref, e) {
    // BA1 and PM2 are exclusive. The following is to ensure that if one of the checkboxes
    // are checked, the other is un-checked
    if (ref === 'ba1-value' || ref === 'pm2-value') {
        let tempCheckboxes = this.state.checkboxes,
            altCriteriaValue = 'pm2-value';
        if (ref === 'pm2-value') {
            altCriteriaValue = 'ba1-value';
        }
        if (this.state.checkboxes[ref]) {
            tempCheckboxes[altCriteriaValue] = false;
            this.setState({checkboxes: tempCheckboxes});
        }
    }
    // Since BA1 and PM2 'share' the same description box, and the user only sees the BA1 box,
    // the following is to update the value in the PM2 box to contain the same data on
    // saving of the evaluation. Handles changes going the other way, too, just in case (although
    // this should never happen)
    if (ref === 'ba1-description' || ref === 'pm2-description') {
        let altCriteriaDescription = 'pm2-description';
        if (ref === 'pm2-description') {
            altCriteriaDescription = 'ba1-description';
        }
        this.refs[altCriteriaDescription].setValue(this.refs[ref].getValue());
    }
};
