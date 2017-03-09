'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var vciFormHelper = require('./shared/form');
var CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
var findDiffKeyValuesMixin = require('./shared/find_diff').findDiffKeyValuesMixin;
var CompleteSection = require('./shared/complete_section').CompleteSection;
var parseAndLogError = require('../../mixins').parseAndLogError;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
var genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');
var extraEvidence = require('./shared/extra_evidence');

var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;
var queryKeyValue = globals.queryKeyValue;

var panel = require('../../../libs/bootstrap/panel');
var form = require('../../../libs/bootstrap/form');

import { renderDataCredit } from './shared/credit';
import { showActivityIndicator } from '../../activity_indicator';
import { parseKeyValue } from '../helpers/parse_key_value';

var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

var populationStatic = {
    exac: {
        _order: ['afr', 'amr', 'sas', 'nfe', 'eas', 'fin', 'oth'],
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
var CI_DEFAULT = 95;

// Display the population data of external sources
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [RestMixin, findDiffKeyValuesMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        ext_myVariantInfo: React.PropTypes.object,
        ext_ensemblHgvsVEP: React.PropTypes.array,
        ext_ensemblVariation: React.PropTypes.object,
        ext_singleNucleotide: React.PropTypes.bool,
        loading_myVariantInfo: React.PropTypes.bool,
        loading_ensemblVariation: React.PropTypes.bool,
        href_url: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            data: this.props.data,
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            interpretation: this.props.interpretation,
            ensembl_exac_allele: {},
            interpretationUuid: this.props.interpretationUuid,
            hasExacData: false, // flag to display ExAC table
            hasTGenomesData: false,
            hasEspData: false, // flag to display ESP table
            CILow: null,
            CIhigh: null,
            populationObj: {
                highestMAF: null,
                desiredCI: 95,
                mafCutoff: 5,
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
            },
            populationObjDiff: null,
            populationObjDiffFlag: false,
            ext_singleNucleotide: this.props.ext_singleNucleotide,
            loading_myVariantInfo: this.props.loading_myVariantInfo,
            loading_ensemblVariation: this.props.loading_ensemblVariation
        };
    },

    componentDidMount: function() {
        if (this.props.data) {
            this.setState({data: this.props.data});
        }
        if (this.props.interpretation) {
            this.setState({interpretation: this.props.interpretation});
            // set desired CI if previous data for it exists
            this.getPrevSetDesiredCI(this.props.interpretation);
        }
        if (this.props.ext_myVariantInfo) {
            this.parseExacData(this.props.ext_myVariantInfo);
            this.parseEspData(this.props.ext_myVariantInfo);
            this.calculateHighestMAF();
        }
        if (this.props.ext_ensemblHgvsVEP) {
            this.parseAlleleFrequencyData(this.props.ext_ensemblHgvsVEP);
            this.calculateHighestMAF();
        }
        if (this.props.ext_ensemblVariation) {
            this.parseTGenomesData(this.props.ext_ensemblVariation);
            this.calculateHighestMAF();
        }

        if (this.state.interpretation && this.state.interpretation.evaluations) {
            this.compareExternalDatas(this.state.populationObj, this.state.interpretation.evaluations);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({data: nextProps.data, interpretation: nextProps.interpretation});
        // set desired CI if previous data for it exists
        this.getPrevSetDesiredCI(nextProps.interpretation);
        // update data based on api call results
        if (nextProps.ext_myVariantInfo) {
            this.parseExacData(nextProps.ext_myVariantInfo);
            this.parseEspData(nextProps.ext_myVariantInfo);
            this.calculateHighestMAF();
        }
        if (nextProps.ext_ensemblHgvsVEP) {
            this.parseAlleleFrequencyData(nextProps.ext_ensemblHgvsVEP);
            this.calculateHighestMAF();
        }
        if (nextProps.ext_ensemblVariation) {
            this.parseTGenomesData(nextProps.ext_ensemblVariation);
            this.calculateHighestMAF();
        }
        if (nextProps.interpretation && nextProps.interpretation.evaluations) {
            this.compareExternalDatas(this.state.populationObj, nextProps.interpretation.evaluations);
        }
        this.setState({
            ext_singleNucleotide: nextProps.ext_singleNucleotide,
            loading_ensemblVariation: nextProps.loading_ensemblVariation,
            loading_myVariantInfo: nextProps.loading_myVariantInfo
        });
    },

    componentWillUnmount: function() {
        this.setState({
            hasExacData: false,
            hasTGenomesData: false,
            hasEspData: false
        });
    },

    // helper function to shorten display of imported float values to 5 decimal places;
    // if float being displayed has less than 5 decimal places, just show the value with no changes
    // Returns a string for display purposes.
    parseFloatShort: function(float) {
        let splitFloat = (float + "").split('.');
        if (splitFloat.length > 1 && splitFloat[1].length > 5) {
            return float.toFixed(5) + '';
        } else {
            return float.toString();
        }
    },

    // function to compare current external data with external data saved with a previous interpretation
    compareExternalDatas: function(newData, savedEvals) {
        for (var i in savedEvals) {
            if (['BA1', 'PM2', 'BS1'].indexOf(savedEvals[i].criteria) > -1) {
                var tempCompare = this.findDiffKeyValues(newData, savedEvals[i].population.populationData);
                this.setState({populationObjDiff: tempCompare[0], populationObjDiffFlag: tempCompare[1]});
                break;
            }
        }
    },

    // Get ExAC allele frequency from Ensembl (VEP) directly
    // Because myvariant.info doesn't always return ExAC allele frequency data
    parseAlleleFrequencyData: function(response) {
        let populationObj = this.state.populationObj;
        populationStatic.exac._order.map(key => {
            populationObj.exac[key].af = typeof populationObj.exac[key].af !== 'undefined' ? (isNaN(populationObj.exac[key].af) ? null : populationObj.exac[key].af) : parseFloat(response[0].colocated_variants[0]['exac_' + key + '_maf']);
        });
        populationObj.exac._tot.af = typeof populationObj.exac._tot.af !== 'undefined' ? (isNaN(populationObj.exac._tot.af) ? null : populationObj.exac._tot.af) : parseFloat(response[0].colocated_variants[0].exac_adj_maf);

        this.setState({populationObj: populationObj});
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
                populationObj.exac[key].af = populationObj.exac[key].ac / populationObj.exac[key].an;
            });
            // get the allele count, allele number, and homozygote count totals
            populationObj.exac._tot.ac = parseInt(response.exac.ac.ac_adj);
            populationObj.exac._tot.an = parseInt(response.exac.an.an_adj);
            populationObj.exac._tot.hom = parseInt(response.exac.hom.ac_hom);
            populationObj.exac._tot.af = populationObj.exac._tot.ac / populationObj.exac._tot.an;
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
            // update off of this.props.data as it is more stable, and this.state.data does not contain relevant updates
            let hgvs_GRCh37 = this.props.data.hgvsNames.GRCh37 ? this.props.data.hgvsNames.GRCh37 : this.props.data.hgvsNames.gRCh37;
            let hgvs_GRCh38 = this.props.data.hgvsNames.GRCh38 ? this.props.data.hgvsNames.GRCh38 : this.props.data.hgvsNames.gRCh38;
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
                        populationStatic.tGenomes._order.indexOf(populationCode) > -1) {
                        // ... for specific populations =
                        populationObj.tGenomes[populationCode].ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes[populationCode].af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    } else if (population.population == '1000GENOMES:phase_3:ALL') {
                        // ... and totals
                        populationObj.tGenomes._tot.ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes._tot.af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    } else if (population.population == 'ESP6500:African_American') {
                        // ... and ESP AA
                        populationObj.tGenomes.espaa.ac[population.allele] = parseInt(population.allele_count);
                        populationObj.tGenomes.espaa.af[population.allele] = parseFloat(population.frequency);
                        updated1000GData = true;
                    } else if (population.population == 'ESP6500:European_American') {
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
                        populationStatic.tGenomes._order.indexOf(populationCode) > -1) {
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
        // check against esp data - done before 1000g's so that it takes precedence in case of tie
        // due to 1000g also carrying esp data
        populationStatic.esp._order.map(pop => {
            let alt = populationObj.esp._extra.alt;
            if (populationObj.esp[pop].ac) {
                let ref = populationObj.esp._extra.ref,
                    alt = populationObj.esp._extra.alt;
                // esp does not report back frequencies, so we have to calculate it off counts
                let tempMAF = parseFloat(populationObj.esp[pop].ac[alt] / (populationObj.esp[pop].ac[ref] + populationObj.esp[pop].ac[alt]));
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
                    highestMAFObj.source = (pop == 'espaa' || pop == 'espea') ? 'ESP (provided by 1000 Genomes)' : '1000 Genomes';
                    highestMAFObj.af = populationObj.tGenomes[pop].af[alt];
                }
            }
        });
        // embed highest MAF and related data into population obj, and update to state
        populationObj.highestMAF = highestMAFObj;
        this.setState({populationObj: populationObj}, () => {
            this.changeDesiredCI(); // we have highest MAF data, so calculate the CI ranges
        });
    },

    // Method to render external ExAC linkout when no ExAC population data found
    renderExacLinkout: function(response, singleNucleotide) {
        let exacLink;
        // If no ExAC population data, construct external linkout for one of the following:
        // 1) clinvar/cadd data found & the variant type is substitution
        // 2) clinvar/cadd data found & the variant type is NOT substitution
        // 3) no data returned by myvariant.info
        if (response && singleNucleotide) {
            let chrom = response.chrom,
                pos = response.hg19.start,
                regionStart = parseInt(response.hg19.start) - 30,
                regionEnd = parseInt(response.hg19.end) + 30;
            if (response.clinvar) {
                // Try 'clinvar' as primary data object
                let clinvar = response.clinvar;
                // Applies to substitution variant (e.g. C>T in which '>' means 'changes to')
                if (clinvar.type && clinvar.type === 'single nucleotide variant') {
                    exacLink = 'http:' + external_url_map['EXAC'] + chrom + '-' + pos + '-' + clinvar.ref + '-' + clinvar.alt;
                } else {
                    // Applies to 'Duplication', 'Deletion', 'Insertion', 'Indel' (deletion + insertion)
                    exacLink = external_url_map['ExACRegion'] + chrom + '-' + regionStart + '-' + regionEnd;
                }
            } else if (response.cadd) {
                // Fallback to 'cadd' as alternative data object
                let cadd = response.cadd;
                if (cadd.type && cadd.type === 'SNV') {
                    exacLink = 'http:' + external_url_map['EXAC'] + chrom + '-' + pos + '-' + cadd.ref + '-' + cadd.alt;
                } else {
                    exacLink = external_url_map['ExACRegion'] + chrom + '-' + regionStart + '-' + regionEnd;
                }
            }
        } else {
            exacLink = external_url_map['EXACHome'];
        }
        return exacLink;
    },

    /* the following methods are related to the rendering of population data tables */
    // method to render a row of data for the ExAC table
    renderExacRow: function(key, exac, exacStatic, rowNameCustom, className) {
        let rowName = exacStatic._labels[key];
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{exac[key].ac || exac[key].ac === 0 ? exac[key].ac : '--'}</td>
                <td>{exac[key].an || exac[key].an === 0 ? exac[key].an : '--'}</td>
                <td>{exac[key].hom || exac[key].hom === 0 ? exac[key].hom : '--'}</td>
                <td>{exac[key].af || exac[key].af === 0 ? this.parseFloatShort(exac[key].af) : '--'}</td>
            </tr>
        );
    },

    // method to render a row of data for the 1000Genomes table
    renderTGenomesRow: function(key, tGenomes, tGenomesStatic, rowNameCustom, className) {
        let rowName = tGenomesStatic._labels[key];
        // for when generating difference object:
        //let tGenomesDiff = this.state.populationObjDiff && this.state.populationObjDiff.tGenomes ? this.state.populationObjDiff.tGenomes : null; // this null creates issues when populationObjDiff is not set because it compraes on null later
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
                <td>{tGenomes[key].af[tGenomes._extra.ref] || tGenomes[key].af[tGenomes._extra.ref] === 0 ? tGenomes._extra.ref + ': ' + this.parseFloatShort(tGenomes[key].af[tGenomes._extra.ref]) : '--'}{tGenomes[key].ac[tGenomes._extra.ref] ? ' (' + tGenomes[key].ac[tGenomes._extra.ref] + ')' : ''}</td>
                <td>{tGenomes[key].af[tGenomes._extra.alt] || tGenomes[key].af[tGenomes._extra.alt] === 0 ? tGenomes._extra.alt + ': ' + this.parseFloatShort(tGenomes[key].af[tGenomes._extra.alt]) : '--'}{tGenomes[key].ac[tGenomes._extra.alt] ? ' (' + tGenomes[key].ac[tGenomes._extra.alt] + ')' : ''}</td>
                <td>{tGenomes[key].gf[g_ref] || tGenomes[key].gf[g_ref] === 0 ? g_ref + ': ' + this.parseFloatShort(tGenomes[key].gf[g_ref]) : '--'}{tGenomes[key].gc[g_ref] ? ' (' + tGenomes[key].gc[g_ref] + ')' : ''}</td>
                <td>{tGenomes[key].gf[g_alt] || tGenomes[key].gf[g_alt] === 0 ? g_alt + ': ' + this.parseFloatShort(tGenomes[key].gf[g_alt]) : '--'}{tGenomes[key].gc[g_alt] ? ' (' + tGenomes[key].gc[g_alt] + ')' : ''}</td>
                <td>{tGenomes[key].gf[g_mixed] || tGenomes[key].gf[g_mixed] === 0 ? g_mixed + ': ' + this.parseFloatShort(tGenomes[key].gf[g_mixed]) : '--'}{tGenomes[key].gc[g_mixed] ? ' (' + tGenomes[key].gc[g_mixed] + ')' : ''}</td>
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
                <td>{esp[key].ac[esp._extra.ref] || esp[key].ac[esp._extra.ref] === 0 ? esp._extra.ref + ': ' + esp[key].ac[esp._extra.ref] : '--'}</td>
                <td>{esp[key].ac[esp._extra.alt] || esp[key].ac[esp._extra.alt] === 0 ? esp._extra.alt + ': ' + esp[key].ac[esp._extra.alt] : '--'}</td>
                <td>{esp[key].gc[g_ref] || esp[key].gc[g_ref] ? g_ref + ': ' + esp[key].gc[g_ref] : '--'}</td>
                <td>{esp[key].gc[g_alt] || esp[key].gc[g_alt] ? g_alt + ': ' + esp[key].gc[g_alt] : '--'}</td>
                <td>{esp[key].gc[g_mixed] || esp[key].gc[g_mixed] ? g_mixed + ': ' + esp[key].gc[g_mixed] : '--'}</td>
            </tr>
        );
    },

    /* the following methods are related to the desired CI field and its related calculated values */
    // method to determine desired CI value from previously saved interpretation
    getPrevSetDesiredCI: function(interpretation) {
        if (interpretation && interpretation.evaluations && interpretation.evaluations.length > 0) {
            for (var i = 0; i < interpretation.evaluations.length; i++) {
                if (interpretation.evaluations[i].criteria == 'BA1') {
                    let tempPopulationObj = this.state.populationObj;
                    tempPopulationObj.desiredCI = interpretation.evaluations[i].population.populationData.desiredCI;
                    this.setState({populationObj: tempPopulationObj});
                    break;
                }
            }
        }
        if (!this.state.populationObj.desiredCI) {
            // previously saved value does not exist for some reason... set it to default value
            let tempPopulationObj = this.state.populationObj;
            tempPopulationObj.desiredCI = CI_DEFAULT;
            this.setState({populationObj: tempPopulationObj});
        }
        // update CI low and high values
        this.changeDesiredCI();
    },

    // wrapper function to calculateCI on value change
    changeDesiredCI: function() {
        if (this.refs && this.refs.desiredCI) {
            this.calculateCI(parseInt(this.refs.desiredCI.getValue()), this.state.populationObj && this.state.populationObj.highestMAF ? this.state.populationObj.highestMAF : null);
        }
    },

    // checking for empty text when clicking away from desired CI field
    onBlurDesiredCI: function(event) {
        let desiredCI = parseInt(this.refs.desiredCI.getValue());
        if (desiredCI == '' || isNaN(desiredCI)) {
            // if the user clicks away from the desired CI field, but it is blank/filled with
            // bad input, re-set it to the default value
            let tempPopulationObj = this.state.populationObj;
            this.refs.desiredCI.setValue(CI_DEFAULT);
            tempPopulationObj.desiredCI = CI_DEFAULT;
            this.setState({populationObj: tempPopulationObj});
            this.changeDesiredCI();
        }
    },

    // function to calculate confidence intervals (CI). Formula taken from Steven's excel spreadsheet
    calculateCI: function(CIp, highestMAF) {
        // store user-input desired CI value into population object
        let populationObj = this.state.populationObj;
        populationObj.desiredCI = CIp;
        if (highestMAF) {
            if (isNaN(CIp) || CIp < 0 || CIp > 100) {
                // the field is blank... clear CI low and high values
                // note that the user did not necessary navigate away from field just yet, so do not
                // automatically set value to default here
                this.setState({populationObj: populationObj, CILow: null, CIHigh: null});
            } else if (highestMAF.ac && highestMAF.ac_tot) {
                // calculate CI
                let xp = highestMAF.ac,
                    np = highestMAF.ac_tot;
                let zp = -this.normSInv((1 - CIp / 100) / 2),
                    pp = xp / np,
                    qp = 1 - pp;
                let CILow = ((2 * np * pp) + (zp * zp) - zp * Math.sqrt((zp * zp) + (4 * np * pp * qp))) / (2 * (np + (zp * zp))),
                    CIHigh = ((2 * np * pp) + (zp * zp) + zp * Math.sqrt((zp * zp) + (4 * np * pp * qp))) / (2 * (np + (zp * zp)));
                this.setState({populationObj: populationObj, CILow: CILow, CIHigh: CIHigh});
            } else {
                this.setState({populationObj: populationObj, CILow: 'N/A', CIHigh: 'N/A'});
            }
        } else {
            this.setState({populationObj: populationObj, CILow: 'N/A', CIHigh: 'N/A'});
        }
    },

    // NORMSINV implementation taken from http://stackoverflow.com/a/8843728
    // used for CI calculation
    normSInv: function (p) {
        let a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
        let a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
        let b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
        let b4 = 66.8013118877197, b5 = -13.2806815528857, c1 = -7.78489400243029E-03;
        let c2 = -0.322396458041136, c3 = -2.40075827716184, c4 = -2.54973253934373;
        let c5 = 4.37466414146497, c6 = 2.93816398269878, d1 = 7.78469570904146E-03;
        let d2 = 0.32246712907004, d3 = 2.445134137143, d4 = 3.75440866190742;
        let p_low = 0.02425, p_high = 1 - p_low;
        let q, r;
        let retVal;

        if ((p < 0) || (p > 1)) {
            alert("NormSInv: Argument out of range.");
            retVal = 0;
        } else if (p < p_low) {
            q = Math.sqrt(-2 * Math.log(p));
            retVal = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        } else if (p <= p_high) {
            q = p - 0.5;
            r = q * q;
            retVal = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
        } else {
            q = Math.sqrt(-2 * Math.log(1 - p));
            retVal = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
        }
        return retVal;
    },

    // Method to render ExAC population table header content
    renderExacHeader: function(hasExacData, loading_myVariantInfo, exac, singleNucleotide) {
        if (hasExacData && !loading_myVariantInfo && singleNucleotide) {
            const variantExac = exac._extra.chrom + ':' + exac._extra.pos + ' ' + exac._extra.ref + '/' + exac._extra.alt;
            const linkoutExac = 'http:' + external_url_map['EXAC'] + exac._extra.chrom + '-' + exac._extra.pos + '-' + exac._extra.ref + '-' + exac._extra.alt;
            return (
                <h3 className="panel-title">ExAC {variantExac}
                    <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                    <a className="panel-subtitle pull-right" href={linkoutExac} target="_blank">See data in ExAC</a>
                </h3>
            );
        } else {
            return (
                <h3 className="panel-title">ExAC
                    <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                </h3>
            );
        }
    },

    // Method to render 1000 Genomes population table header content
    renderTGenomesHeader: function(hasTGenomesData, loading_ensemblVariation, tGenomes, singleNucleotide) {
        if (hasTGenomesData && !loading_ensemblVariation && singleNucleotide) {
            const variantTGenomes = tGenomes._extra.name + ' ' + tGenomes._extra.var_class;
            const linkoutEnsembl = external_url_map['EnsemblPopulationPage'] + tGenomes._extra.name;
            return (
                <h3 className="panel-title">1000 Genomes: {variantTGenomes}
                    <a href="#credit-vep" className="credit-vep" title="VEP"><span>VEP</span></a>
                    <a className="panel-subtitle pull-right" href={linkoutEnsembl} target="_blank">See data in Ensembl</a>
                </h3>
            );
        } else {
            return (
                <h3 className="panel-title">1000 Genomes
                    <a href="#credit-vep" className="credit-vep" title="VEP"><span>VEP</span></a>
                </h3>
            );
        }
    },

    // Method to render ESP population table header content
    renderEspHeader: function(hasEspData, loading_myVariantInfo, esp, singleNucleotide) {
        if (hasEspData && !loading_myVariantInfo && singleNucleotide) {
            const variantEsp = esp._extra.rsid + '; ' + esp._extra.chrom + '.' + esp._extra.hg19_start + '; Alleles ' + esp._extra.ref + '>' + esp._extra.alt;
            const linkoutEsp = dbxref_prefix_map['ESP_EVS'] + 'searchBy=rsID&target=' + esp._extra.rsid + '&x=0&y=0';
            return (
                <h3 className="panel-title">Exome Sequencing Project (ESP): {variantEsp}
                    <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                    <a className="panel-subtitle pull-right" href={linkoutEsp} target="_blank">See data in ESP</a>
                </h3>
            );
        } else {
            return (
                <h3 className="panel-title">Exome Sequencing Project (ESP)
                    <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                </h3>
            );
        }
    },

    parseAlleleMyVariant(response) {
        let alleleData = {};
        let chrom = parseKeyValue(response, 'chrom'),
            hg19 = parseKeyValue(response, 'hg19'),
            ref = parseKeyValue(response, 'ref'),
            alt = parseKeyValue(response, 'alt');
        if (response) {
            alleleData = {
                chrom: (chrom && typeof chrom === 'string') ? chrom : null,
                pos: (hg19 && typeof hg19 === 'object' && hg19.start) ? hg19.start : null,
                ref: (ref && typeof ref === 'string') ? ref : null,
                alt: (alt && typeof alt === 'string') ? alt : null
            };
        }
        return alleleData;
    },

    // Method to render gnomAD population table header content
    rendergnomADHeader(data) {
        let variantgnomAD = '';
        if (data) {
            let alleleData = this.parseAlleleMyVariant(data);
            if (Object.keys(alleleData).length) {
                variantgnomAD = alleleData.chrom + ':' + alleleData.pos + ' ' + alleleData.ref + '/' + alleleData.alt;
            }
        }
        return (
            <h3 className="panel-title">{variantgnomAD.length ? 'gnomAD ' + variantgnomAD : 'gnomAD'}</h3>
        );
    },

    // Method to render external gnomAD linkouts
    rendergnomADLinkout(data) {
        let gnomADLink = external_url_map['gnomADHome'];
        // 1) clinvar/cadd/vcf data found in myvariant.info
        // 2) no data returned by myvariant.info
        if (data) {
            let alleleData = this.parseAlleleMyVariant(data);
            if (Object.keys(alleleData).length) {
                gnomADLink = 'http:' + external_url_map['gnomAD'] + alleleData.chrom + '-' + alleleData.pos + '-' + alleleData.ref + '-' + alleleData.alt;
            }
        }
        return gnomADLink;
    },

    render: function() {
        var exacStatic = populationStatic.exac,
            tGenomesStatic = populationStatic.tGenomes,
            espStatic = populationStatic.esp;
        var highestMAF = this.state.populationObj && this.state.populationObj.highestMAF ? this.state.populationObj.highestMAF : null,
            exac = this.state.populationObj && this.state.populationObj.exac ? this.state.populationObj.exac : null, // Get ExAC data from global population object
            tGenomes = this.state.populationObj && this.state.populationObj.tGenomes ? this.state.populationObj.tGenomes : null,
            esp = this.state.populationObj && this.state.populationObj.esp ? this.state.populationObj.esp : null; // Get ESP data from global population object
        var desiredCI = this.state.populationObj && this.state.populationObj.desiredCI ? this.state.populationObj.desiredCI : CI_DEFAULT;
        var populationObjDiffFlag = this.state.populationObjDiffFlag;
        var singleNucleotide = this.state.ext_singleNucleotide;

        return (
            <div className="variant-interpretation population">
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
                                <dt>Allele Frequency: </dt><dd>{highestMAF && (highestMAF.af || highestMAF.af === 0) ? this.parseFloatShort(highestMAF.af) : 'N/A'}</dd>
                                {(this.state.interpretation && highestMAF) ?
                                    <span>
                                        <dt className="dtFormLabel">Desired CI:</dt>
                                        <dd className="ddFormInput">
                                            <Input type="number" inputClassName="desired-ci-input" ref="desiredCI" value={desiredCI} handleChange={this.changeDesiredCI} inputDisabled={true}
                                                onBlur={this.onBlurDesiredCI} minVal={0} maxVal={100} maxLength="2" placeholder={CI_DEFAULT.toString()} />
                                        </dd>
                                        <dt>CI - lower: </dt><dd>{this.state.CILow || this.state.CILow === 0 ? this.parseFloatShort(this.state.CILow) : ''}</dd>
                                        <dt>CI - upper: </dt><dd>{this.state.CIHigh || this.state.CIHigh === 0 ? this.parseFloatShort(this.state.CIHigh) : ''}</dd>
                                    </span>
                                : null}
                            </dl>
                        </div>
                    </div>
                </div>

                <PanelGroup accordion><Panel title="Population Criteria Evaluation" panelBodyClassName="panel-wide-content" open>
                    {(this.state.data && this.state.interpretation) ?
                    <div className="row">
                        <div className="col-sm-12">
                            <CurationInterpretationForm renderedFormContent={criteriaGroup1}
                                evidenceData={this.state.populationObj} evidenceDataUpdated={populationObjDiffFlag} formChangeHandler={criteriaGroup1Change}
                                formDataUpdater={criteriaGroup1Update} variantUuid={this.state.data['@id']}
                                criteria={['BA1', 'PM2', 'BS1']} criteriaCrossCheck={[['BA1', 'PM2', 'BS1']]}
                                interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </div>
                    : null}
                    {populationObjDiffFlag ?
                        <div className="row">
                            <p className="alert alert-warning">
                                <strong>Notice:</strong> Some of the data retrieved below has changed since the last time you evaluated these criteria. Please update your evaluation as needed.
                            </p>
                        </div>
                    : null}
                    <div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading">
                            {this.renderExacHeader(this.state.hasExacData, this.state.loading_myVariantInfo, exac, singleNucleotide)}
                        </div>
                        <div className="panel-content-wrapper">
                            {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                            {!singleNucleotide ?
                                <div className="panel-body">
                                    <span>Data is currently only returned for single nucleotide variants. <a href={this.renderExacLinkout(this.props.ext_myVariantInfo)} target="_blank">Search ExAC</a> for this variant.</span>
                                </div>
                                :
                                <div>
                                {this.state.hasExacData ?
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
                                    :
                                    <div className="panel-body">
                                        <span>No population data was found for this allele in ExAC. <a href={this.renderExacLinkout(this.props.ext_myVariantInfo)} target="_blank">Search ExAC</a> for this variant.</span>
                                    </div>
                                }
                                </div>
                            }
                        </div>
                    </div>
                    <div className="panel panel-info datasource-gnomAD">
                        <div className="panel-heading">
                            {this.rendergnomADHeader(this.props.ext_myVariantInfo)}
                        </div>
                        {!singleNucleotide ?
                            <div className="panel-body">
                                <span>Data is currently only returned for single nucleotide variants. <a href={external_url_map['gnomADHome']} target="_blank">Search gnomAD</a> for this variant.</span>
                            </div>
                        :
                            <div className="panel-body">
                                <div className="description">
                                    <span>gnomAD data is not currently available via API or download; however, a direct link to gnomAD is provided whenever possible in addition to a link to gnomAD's home page.</span>
                                </div>
                                <ul>
                                    <li><a href={this.rendergnomADLinkout(this.props.ext_myVariantInfo)} target="_blank">Link to this variant in gnomAD</a></li>
                                    <li><a href={external_url_map['gnomADHome']} target="_blank">Search gnomAD</a></li>
                                </ul>
                            </div>
                        }
                    </div>
                    <div className="panel panel-info datasource-1000G">
                        <div className="panel-heading">
                            {this.renderTGenomesHeader(this.state.hasTGenomesData, this.state.loading_ensemblVariation, tGenomes, singleNucleotide)}
                        </div>
                        <div className="panel-content-wrapper">
                            {this.state.loading_ensemblVariation ? showActivityIndicator('Retrieving data... ') : null}
                            {!singleNucleotide ?
                                <div className="panel-body">
                                    <span>Data is currently only returned for single nucleotide variants. <a href={external_url_map['1000GenomesHome']} target="_blank">Search 1000 Genomes</a> for this variant.</span>
                                </div>
                                :
                                <div>
                                {this.state.hasTGenomesData ?
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
                                    :
                                    <div className="panel-body">
                                        <span>No population data was found for this allele in 1000 Genomes. <a href={external_url_map['1000GenomesHome']} target="_blank">Search 1000 Genomes</a> for this variant.</span>
                                    </div>
                                }
                                </div>
                            }
                        </div>
                    </div>
                    <div className="panel panel-info datasource-ESP">
                        <div className="panel-heading">
                            {this.renderEspHeader(this.state.hasEspData, this.state.loading_myVariantInfo, esp, singleNucleotide)}
                        </div>
                        <div className="panel-content-wrapper">
                            {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                            {!singleNucleotide ?
                                <div className="panel-body">
                                    <span>Data is currently only returned for single nucleotide variants. <a href={external_url_map['ESPHome']} target="_blank">Search ESP</a> for this variant.</span>
                                </div>
                                :
                                <div>
                                {this.state.hasEspData ?
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
                                                <td colSpan="6">Average Sample Read Depth: {esp._extra.avg_sample_read}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    :
                                    <div className="panel-body">
                                        <span>No population data was found for this allele in ESP. <a href={external_url_map['ESPHome']} target="_blank">Search ESP</a> for this variant.</span>
                                    </div>
                                }
                                </div>
                            }
                        </div>
                    </div>
                    <extraEvidence.ExtraEvidenceTable category="population" subcategory="population" session={this.props.session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Population)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} />
                </Panel></PanelGroup>

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="population" updateInterpretationObj={this.props.updateInterpretationObj} />
                : null}

                {renderDataCredit('myvariant')}

                {renderDataCredit('vep')}

            </div>
        );
    }
});


// code for rendering of this group of interpretation forms
var criteriaGroup1 = function() {
    let criteriaList1 = ['BA1', 'PM2', 'BS1'], // array of criteria code handled subgroup of this section
        hiddenList1 = [false, true, true]; // array indicating hidden status of explanation boxes for above list of criteria codes
    let mafCutoffInput = (
        <span>
            <Input type="number" ref="maf-cutoff" label="MAF cutoff:" minVal={0} maxVal={100} maxLength="2" handleChange={this.handleFormChange}
                value={this.state.evidenceData && this.state.evidenceData.mafCutoff ? this.state.evidenceData.mafCutoff : "5"} inputDisabled={true}
                labelClassName="col-xs-4 control-label" wrapperClassName="col-xs-3 input-right" groupClassName="form-group" onBlur={mafCutoffBlur.bind(this)} />
            <span className="col-xs-5 after-input">%</span>
            <div className="clear"></div>
        </span>
    );
    return (
        <div>
            {vciFormHelper.evalFormSectionWrapper.call(this,
                vciFormHelper.evalFormNoteSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormDropdownSectionWrapper.call(this, criteriaList1),
                vciFormHelper.evalFormExplanationSectionWrapper.call(this, criteriaList1, hiddenList1, mafCutoffInput, null),
                false
            )}
        </div>
    );
};
// code for updating the form values of interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    // define custom form update function for MAF Cutoff field in BA1
    let mafCutoffUpdate = function(evaluation) {
        this.refs['maf-cutoff'].setValue(evaluation.population.populationData.mafCutoff);
    };
    // add custom form update functions into customActions dictionary
    let customActions = {
        'BA1': mafCutoffUpdate
    };
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BA1', 'PM2', 'BS1'], customActions);
};
// code for handling logic within the form
var criteriaGroup1Change = function(ref, e) {
    // Both explanation boxes for both criteria of each group must be the same
    vciFormHelper.shareExplanation.call(this, ref, ['BA1', 'PM2', 'BS1']);
    // if the MAF cutoff field is changed, update the populationObj payload with the updated value
    if (ref === 'maf-cutoff') {
        let tempEvidenceData = this.state.evidenceData;
        tempEvidenceData.mafCutoff = parseInt(this.refs[ref].getValue());
        this.setState({evidenceData: tempEvidenceData});
    }
};
// special function to handle the MAF cutoff % field
var mafCutoffBlur = function(event) {
    let mafCutoff = parseInt(this.refs['maf-cutoff'].getValue());
    if (mafCutoff == '' || isNaN(mafCutoff)) {
        let tempEvidenceData = this.state.evidenceData;
        // if the user clicks away from the MAF cutoff field, but it is blank/filled with
        // bad input, re-set it to the default value of 5
        this.refs['maf-cutoff'].setValue(5);
        tempEvidenceData.mafCutoff = 5;
        this.setState({evidenceData: tempEvidenceData});
    }
};
