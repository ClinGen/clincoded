'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { RestMixin } from '../../rest';
import { parseClinvar } from '../../../libs/parse-resources';
import { queryKeyValue, dbxref_prefix_map, external_url_map } from '../../globals';
import { renderDataCredit } from './shared/credit';
import { showActivityIndicator } from '../../activity_indicator';
import { parseKeyValue } from '../helpers/parse_key_value';
import { Form, FormMixin, Input } from '../../../libs/bootstrap/form';
import { PanelGroup, Panel } from '../../../libs/bootstrap/panel';
import { findDiffKeyValuesMixin } from './shared/find_diff';
import { CompleteSection } from './shared/complete_section';
import { parseAndLogError } from '../../mixins';

var vciFormHelper = require('./shared/form');
var CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
var genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');
var extraEvidence = require('./shared/extra_evidence');

var populationStatic = {
    page: {
        _labels: {
            AfricanAmerican: 'African American', Asian: 'Asian', CentralAmerican: 'Central American', Cuban: 'Cuban', Dominican: 'Dominican', Mexican: 'Mexican',
            NativeAmerican: 'Native American', NativeHawaiian: 'Native Hawaiian', PuertoRican: 'Puerto Rican', SouthAmerican: 'South American', SouthAsian: 'South Asian'
        }
    },
    exac: {
        _order: ['afr', 'amr', 'sas', 'nfe', 'eas', 'fin', 'oth'],
        _labels: {afr: 'African', amr: 'Latino', eas: 'East Asian', fin: 'European (Finnish)', nfe: 'European (Non-Finnish)', oth: 'Other', sas: 'South Asian'}
    },
    gnomAD: {
        _order: ['afr', 'amr', 'asj', 'sas', 'nfe', 'eas', 'fin', 'oth'],
        _labels: {afr: 'African', amr: 'Latino', asj: 'Ashkenazi Jewish', eas: 'East Asian', fin: 'European (Finnish)', nfe: 'European (Non-Finnish)', oth: 'Other', sas: 'South Asian'}
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
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = createReactClass({
    mixins: [RestMixin, findDiffKeyValuesMixin],

    propTypes: {
        data: PropTypes.object, // ClinVar data payload
        interpretation: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
        ext_pageData: PropTypes.object,
        ext_myVariantInfo: PropTypes.object,
        ext_ensemblHgvsVEP: PropTypes.array,
        ext_ensemblVariation: PropTypes.object,
        ext_singleNucleotide: PropTypes.bool,
        loading_pageData: PropTypes.bool,
        loading_myVariantInfo: PropTypes.bool,
        loading_ensemblVariation: PropTypes.bool,
        href_url: PropTypes.object,
        affiliation: PropTypes.object,
        session: PropTypes.object
    
    },

    getInitialState: function() {
        return {
            data: this.props.data,
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            interpretation: this.props.interpretation,
            ensembl_exac_allele: {},
            hasExacData: false, // flag to display ExAC table
            hasGnomadData: false, // flag to display gnomAD table
            hasTGenomesData: false,
            hasEspData: false, // flag to display ESP table
            hasPageData: false,
            CILow: null,
            CIhigh: null,
            populationObj: {
                highestMAF: null,
                desiredCI: 95,
                mafCutoff: 5,
                exac: {
                    afr: {}, amr: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {}
                },
                gnomAD: {
                    afr: {}, amr: {}, asj: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {}
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
            loading_pageData: this.props.loading_pageData,
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
        if (this.props.ext_pageData) {
            this.setState({hasPageData: true});
        }
        if (this.props.ext_myVariantInfo) {
            this.parseExacData(this.props.ext_myVariantInfo);
            this.parseGnomadData(this.props.ext_myVariantInfo);
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
        if (nextProps.ext_pageData) {
            this.setState({hasPageData: true});
        }
        if (nextProps.ext_myVariantInfo) {
            this.parseExacData(nextProps.ext_myVariantInfo);
            this.parseGnomadData(nextProps.ext_myVariantInfo);
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
            loading_myVariantInfo: nextProps.loading_myVariantInfo,
            loading_pageData: nextProps.loading_pageData
        });
    },

    componentWillUnmount: function() {
        this.setState({
            hasExacData: false,
            hasGnomadData: false,
            hasTGenomesData: false,
            hasEspData: false,
            hasPageData: false
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
            // get filter information
            if (response.exac.filter) {
                if (Array.isArray(response.exac.filter)) {
                    populationObj.exac._extra.filter = response.exac.filter;
                } else {
                    populationObj.exac._extra.filter = [response.exac.filter];
                }
            }
            // update populationObj, and set flag indicating that we have ExAC data
            this.setState({hasExacData: true, populationObj: populationObj});
        }
    },

    // Method to assign gnomAD population data to global population object
    parseGnomadData: function(response) {
        let populationObj = this.state.populationObj;

        // Parse gnomAD exome data in myvariant.info response
        if (response.gnomad_exome && (response.gnomad_exome.ac || response.gnomad_exome.an || response.gnomad_exome.hom)) {
            let indexHOM = -2;
            let gnomADExomeAC, gnomADExomeAN, gnomADExomeHOM, gnomADExomeAF;

            populationObj.gnomAD._extra.hasExomeData = true;

            // Possible resulting values for indexHOM (and what each indicates):
            // -2  - default set above, response data either doesn't exist or isn't in tested format (variant likely isn't multi-allelic),
            //       so any homozygote numbers would be in response.gnomad_*.hom['hom_' + key] ("default" location)
            // -1  - response data exists, but current minor allele (response.gnomad_*.alt) not found within it,
            //       so homozygote numbers are not available
            // >=0 - response data exists and current minor allele (response.gnomad_*.alt) found within it,
            //       so homozygote numbers should be in response.gnomad_*.hom['hom_' + key][indexHOM]
            if (Array.isArray(response.gnomad_exome.alleles) && response.gnomad_exome.hom && Array.isArray(response.gnomad_exome.hom.hom)) {
                indexHOM = response.gnomad_exome.alleles.indexOf(response.gnomad_exome.alt);
            }

            // Retrieve allele and homozygote exome data for each population
            populationStatic.gnomAD._order.map(key => {
                gnomADExomeAC = response.gnomad_exome.ac ? parseInt(response.gnomad_exome.ac['ac_' + key]) : null;
                populationObj.gnomAD[key].ac = isNaN(gnomADExomeAC) ? null : gnomADExomeAC;

                gnomADExomeAN = response.gnomad_exome.an ? parseInt(response.gnomad_exome.an['an_' + key]) : null;
                populationObj.gnomAD[key].an = isNaN(gnomADExomeAN) ? null : gnomADExomeAN;

                if (indexHOM < -1) {
                    gnomADExomeHOM = response.gnomad_exome.hom ? parseInt(response.gnomad_exome.hom['hom_' + key]) : null;
                    populationObj.gnomAD[key].hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
                } else if (indexHOM > -1) {
                    gnomADExomeHOM = parseInt(response.gnomad_exome.hom['hom_' + key][indexHOM]);
                    populationObj.gnomAD[key].hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
                }

                gnomADExomeAF = populationObj.gnomAD[key].ac / populationObj.gnomAD[key].an;
                populationObj.gnomAD[key].af = isFinite(gnomADExomeAF) ? gnomADExomeAF : null;
            });

            // Retrieve allele and homozygote exome totals
            gnomADExomeAC = response.gnomad_exome.ac ? parseInt(response.gnomad_exome.ac.ac) : null;
            populationObj.gnomAD._tot.ac = isNaN(gnomADExomeAC) ? null : gnomADExomeAC;

            gnomADExomeAN = response.gnomad_exome.an ? parseInt(response.gnomad_exome.an.an) : null;
            populationObj.gnomAD._tot.an = isNaN(gnomADExomeAN) ? null : gnomADExomeAN;

            if (indexHOM < -1) {
                gnomADExomeHOM = response.gnomad_exome.hom ? parseInt(response.gnomad_exome.hom.hom) : null;
                populationObj.gnomAD._tot.hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
            } else if (indexHOM > -1) {
                gnomADExomeHOM = parseInt(response.gnomad_exome.hom.hom[indexHOM]);
                populationObj.gnomAD._tot.hom = isNaN(gnomADExomeHOM) ? null : gnomADExomeHOM;
            }

            gnomADExomeAF = populationObj.gnomAD._tot.ac / populationObj.gnomAD._tot.an;
            populationObj.gnomAD._tot.af = isFinite(gnomADExomeAF) ? gnomADExomeAF : null;

            // Retrieve variant information
            populationObj.gnomAD._extra.chrom = response.gnomad_exome.chrom;
            populationObj.gnomAD._extra.pos = response.gnomad_exome.pos;
            populationObj.gnomAD._extra.ref = response.gnomad_exome.ref;
            populationObj.gnomAD._extra.alt = response.gnomad_exome.alt;

            // Retrieve any available filter information
            if (response.gnomad_exome.filter) {
                if (Array.isArray(response.gnomad_exome.filter)) {
                    populationObj.gnomAD._extra.exome_filter = response.gnomad_exome.filter;
                } else {
                    populationObj.gnomAD._extra.exome_filter = [response.gnomad_exome.filter];
                }
            }
        }

        // Parse gnomAD genome data in myvariant.info response
        if (response.gnomad_genome && (response.gnomad_genome.ac || response.gnomad_genome.an || response.gnomad_genome.hom)) {
            let indexHOM = -2;
            let gnomADGenomeAC, gnomADGenomeAN, gnomADGenomeHOM, gnomADGenomeAF;

            populationObj.gnomAD._extra.hasGenomeData = true;

            if (Array.isArray(response.gnomad_genome.alleles) && response.gnomad_genome.hom && Array.isArray(response.gnomad_genome.hom.hom)) {
                indexHOM = response.gnomad_genome.alleles.indexOf(response.gnomad_genome.alt);
            }

            // Retrieve allele and homozygote genome data for each population and add it to any corresponding exome data
            populationStatic.gnomAD._order.map(key => {
                gnomADGenomeAC = response.gnomad_genome.ac ? parseInt(response.gnomad_genome.ac['ac_' + key]) : null;
                if (!(isNaN(gnomADGenomeAC) || gnomADGenomeAC == null)) {
                    populationObj.gnomAD[key].ac += gnomADGenomeAC;
                }

                gnomADGenomeAN = response.gnomad_genome.an ? parseInt(response.gnomad_genome.an['an_' + key]) : null;
                if (!(isNaN(gnomADGenomeAN) || gnomADGenomeAN == null)) {
                    populationObj.gnomAD[key].an += gnomADGenomeAN;
                }

                if (indexHOM < -1) {
                    gnomADGenomeHOM = response.gnomad_genome.hom ? parseInt(response.gnomad_genome.hom['hom_' + key]) : null;
                    if (!(isNaN(gnomADGenomeHOM) || gnomADGenomeHOM == null)) {
                        populationObj.gnomAD[key].hom += gnomADGenomeHOM;
                    }
                } else if (indexHOM > -1) {
                    gnomADGenomeHOM = parseInt(response.gnomad_genome.hom['hom_' + key][indexHOM]);
                    if (!(isNaN(gnomADGenomeHOM) || gnomADGenomeHOM == null)) {
                        populationObj.gnomAD[key].hom += gnomADGenomeHOM;
                    }
                }

                gnomADGenomeAF = populationObj.gnomAD[key].ac / populationObj.gnomAD[key].an;
                populationObj.gnomAD[key].af = isFinite(gnomADGenomeAF) ? gnomADGenomeAF : null;
            });

            // Retrieve allele and homozygote genome totals and add them to any corresponding exome totals
            gnomADGenomeAC = response.gnomad_genome.ac ? parseInt(response.gnomad_genome.ac.ac) : null;
            if (!(isNaN(gnomADGenomeAC) || gnomADGenomeAC == null)) {
                populationObj.gnomAD._tot.ac += gnomADGenomeAC;
            }

            gnomADGenomeAN = response.gnomad_genome.an ? parseInt(response.gnomad_genome.an.an) : null;
            if (!(isNaN(gnomADGenomeAN) || gnomADGenomeAN == null)) {
                populationObj.gnomAD._tot.an += gnomADGenomeAN;
            }

            if (indexHOM < -1) {
                gnomADGenomeHOM = response.gnomad_genome.hom ? parseInt(response.gnomad_genome.hom.hom) : null;
                if (!(isNaN(gnomADGenomeHOM) || gnomADGenomeHOM == null)) {
                    populationObj.gnomAD._tot.hom += gnomADGenomeHOM;
                }
            } else if (indexHOM > -1) {
                gnomADGenomeHOM = parseInt(response.gnomad_genome.hom.hom[indexHOM]);
                if (!(isNaN(gnomADGenomeHOM) || gnomADGenomeHOM == null)) {
                    populationObj.gnomAD._tot.hom += gnomADGenomeHOM;
                }
            }

            gnomADGenomeAF = populationObj.gnomAD._tot.ac / populationObj.gnomAD._tot.an;
            populationObj.gnomAD._tot.af = isFinite(gnomADGenomeAF) ? gnomADGenomeAF : null;

            // Retrieve variant information (if not already collected)
            if (!populationObj.gnomAD._extra.chrom) {
                populationObj.gnomAD._extra.chrom = response.gnomad_genome.chrom;
            }

            if (!populationObj.gnomAD._extra.pos) {
                populationObj.gnomAD._extra.pos = response.gnomad_genome.pos;
            }

            if (!populationObj.gnomAD._extra.ref) {
                populationObj.gnomAD._extra.ref = response.gnomad_genome.ref;
            }

            if (!populationObj.gnomAD._extra.alt) {
                populationObj.gnomAD._extra.alt = response.gnomad_genome.alt;
            }

            // Retrieve any available filter information
            if (response.gnomad_genome.filter) {
                if (Array.isArray(response.gnomad_genome.filter)) {
                    populationObj.gnomAD._extra.genome_filter = response.gnomad_genome.filter;
                } else {
                    populationObj.gnomAD._extra.genome_filter = [response.gnomad_genome.filter];
                }
            }
        }

        if (populationObj.gnomAD._extra.hasExomeData || populationObj.gnomAD._extra.hasGenomeData) {
            this.setState({hasGnomadData: true, populationObj: populationObj});
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
        // check gnomAD data
        populationStatic.gnomAD._order.map(pop => {
            if (populationObj.gnomAD[pop].af > highestMAFObj.af) {
                highestMAFObj.pop = pop;
                highestMAFObj.popLabel = populationStatic.gnomAD._labels[pop];
                highestMAFObj.ac = populationObj.gnomAD[pop].ac;
                highestMAFObj.ac_tot = populationObj.gnomAD[pop].an;
                highestMAFObj.source = 'gnomAD';
                highestMAFObj.af = populationObj.gnomAD[pop].af;
            }
        });
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

    // Method to render external ExAC/gnomAD linkout when no relevant population data is found
    renderExacGnomadLinkout: function(response, datasetName) {
        let datasetCheck, datasetHomeURLKey, datasetLink, datasetRegionURLKey, linkText;
        // If no ExAC/gnomAD population data, construct external linkout for one of the following:
        // 1) clinvar/cadd data found & the variant type is substitution
        // 2) clinvar/cadd data found & the variant type is NOT substitution
        // 3) no data returned by myvariant.info
        switch (datasetName) {
            case 'ExAC':
                datasetCheck = this.state.hasExacData;
                datasetHomeURLKey = 'EXACHome';
                datasetRegionURLKey = 'ExACRegion';
            break;
            case 'gnomAD':
                datasetCheck = this.state.hasGnomadData;
                datasetHomeURLKey = 'gnomADHome';
                datasetRegionURLKey = 'gnomADRegion';
            break;
        }
        if (response) {
            let chrom = response.chrom;
            let pos = response.hg19 ? response.hg19.start : (response.clinvar.hg19 ? response.clinvar.hg19.start : response.cadd.hg19.start);
            let regionStart = response.hg19 ? parseInt(response.hg19.start) - 30 : (response.clinvar.hg19 ? parseInt(response.clinvar.hg19.start) - 30 : parseInt(response.cadd.hg19.start) - 30);
            let regionEnd = response.hg19 ? parseInt(response.hg19.end) + 30 : (response.clinvar.hg19 ? parseInt(response.clinvar.hg19.end) + 30 : parseInt(response.cadd.hg19.end) + 30);
            // Applies to 'Duplication', 'Deletion', 'Insertion', 'Indel' (deletion + insertion)
            // Or there is no ExAC/gnomAD data object in the returned myvariant.info JSON response
            if (!this.state.ext_singleNucleotide || !datasetCheck) {
                datasetLink = external_url_map[datasetRegionURLKey] + chrom + '-' + regionStart + '-' + regionEnd;
                linkText = 'View the coverage of this region (+/- 30 bp) in ' + datasetName;
            }
        } else {
            // 404 response from myvariant.info
            datasetLink = external_url_map[datasetHomeURLKey];
            linkText = 'Search ' + datasetName;
        }
        return (
            <span>
                <a href={datasetLink} target="_blank">{linkText}</a> for this variant.
            </span>
        );
    },

    /* The following methods are related to the rendering of population data tables */
    /**
     * Method to render a row of data for the PAGE table
     * @param {object} pageObj - Individual PAGE population data object (e.g. African American)
     * @param {number} key - Unique number
     */
    renderPageRow(pageObj, key) {
        let popKey = pageObj['pop'];
        return (
            <tr key={key} className="page-data-item">
                <td>{populationStatic.page._labels[popKey]}</td>
                <td>{pageObj['nobs']}</td>
                <td>{pageObj['alleles'][1] + ': ' + this.parseFloatShort(1 - parseFloat(pageObj['rawfreq']))}</td>
                <td>{pageObj['alleles'][0] + ': ' + this.parseFloatShort(pageObj['rawfreq'])}</td>
            </tr>
        );
    },

    // method to render a row of data for the ExAC/gnomAD table
    renderExacGnomadRow: function(key, dataset, datasetStatic, rowNameCustom, className) {
        let rowName = datasetStatic._labels[key];
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{dataset[key].ac || dataset[key].ac === 0 ? dataset[key].ac : '--'}</td>
                <td>{dataset[key].an || dataset[key].an === 0 ? dataset[key].an : '--'}</td>
                <td>{dataset[key].hom || dataset[key].hom === 0 ? dataset[key].hom : '--'}</td>
                <td>{dataset[key].af || dataset[key].af === 0 ? this.parseFloatShort(dataset[key].af) : '--'}</td>
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

    /**
     * Method to render PAGE population table header content
     * @param {boolean} hasPageData - Flag for response from querying PAGE Rest api
     * @param {boolean} loading_pageData - Flag for status on receiving/loading data
     * @param {object} pageVariant - Data object abstracted from PAGE response
     * @param (boolean) singleNucleotide - Flag for  single nucleotide variant
     */
    renderPageHeader: function(hasPageData, loading_pageData, pageVariant, singleNucleotide) {
        const variantData = this.state.data;
        const nc_genomic = variantData && variantData.hgvsNames && variantData.hgvsNames.GRCh37 ? variantData.hgvsNames.GRCh37 : null;
        if (hasPageData && !loading_pageData && singleNucleotide) {
            // const variantPage = pageVariant.chrom + ':' + pageVariant.pos + ' ' + pageVariant['alleles'][0] + '/' + pageVariant['alleles'][1];
            return (
                <h3 className="panel-title">PAGE: {nc_genomic} (GRCh37)
                    <a href="#credit-pagestudy" className="credit-pagestudy" title="pagestudy.org"><i className="icon icon-info-circle"></i> <span>PAGE Study</span></a>
                    <a className="panel-subtitle pull-right" href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">GGV Browser</a>
                </h3>
            );
        } else {
            return (
                <h3 className="panel-title">PAGE: {nc_genomic} (GRCh37)
                    <a href="#credit-pagestudy" className="credit-pagestudy" title="pagestudy.org"><i className="icon icon-info-circle"></i> <span>PAGE Study</span></a>
                </h3>
            );
        }
    },

    // Method to render ExAC/gnomAD population table header content
    renderExacGnomadHeader: function(datasetCheck, loading_myVariantInfo, dataset, singleNucleotide, response, datasetName) {
        let datasetVariant = '';
        let datasetLink;

        if (datasetCheck) {
            datasetVariant = ' ' + dataset._extra.chrom + ':' + dataset._extra.pos + ' ' + dataset._extra.ref + '/' + dataset._extra.alt + ' (GRCh37)';
        } else if (response) {
            let alleleData = this.parseAlleleMyVariant(response);

            if (Object.keys(alleleData).length) {
                datasetVariant = ' ' + alleleData.chrom + ':' + alleleData.pos + ' ' + alleleData.ref + '/' + alleleData.alt + ' (GRCh37)';
            }
        }

        if (datasetCheck && !loading_myVariantInfo && singleNucleotide) {
            const datasetVariantURLKey = (datasetName === 'ExAC') ? 'EXAC' : (datasetName === 'gnomAD') ? 'gnomAD' : null;
            const datasetURL = 'http:' + external_url_map[datasetVariantURLKey] + dataset._extra.chrom + '-' + dataset._extra.pos + '-' + dataset._extra.ref + '-' + dataset._extra.alt;
            datasetLink = <a className="panel-subtitle pull-right" href={datasetURL} target="_blank">See data in {datasetName}</a>
        }

        return (
            <h3 className="panel-title">{datasetName}{datasetVariant}
                <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                {datasetLink}
            </h3>
        );
    },

    // Method to render a single filter status in ExAC/gnomAD population table
    renderExacGnomadFilter: function(filter, filterKey, filterClass) {
        return (<li key={filterKey} className={'label label-' + filterClass}>{filter}</li>);
    },

    // Method to render additional information (data sources, filter status) in ExAC/gnomAD population table
    // If filter(s) not provided by myvariant.info, assume there was a "Pass"; if no data is provided, assume there was a "No variant"
    renderExacGnomadAddlInfo: function(dataset, datasetName) {
        if (datasetName === 'ExAC') {
            return (
                <table className="table additional-info">
                    <tbody>
                        <tr>
                            <td className="filter">
                                <span>Filter:</span>
                                <ul>
                                    {dataset._extra.filter ?
                                        dataset._extra.filter.map((filter, index) => {
                                            return (this.renderExacGnomadFilter(filter, (filter + '-' + index), 'danger'));
                                        })
                                        :
                                        this.renderExacGnomadFilter('Pass', 'Pass', 'success')}
                                </ul>
                            </td>
                        </tr>
                    </tbody>
                </table>
            );
        } else if (datasetName === 'gnomAD') {
            return (
                <table className="table additional-info">
                    <tbody>
                        {dataset._extra.hasExomeData ?
                            <tr>
                                <td className="included-data"><i className="icon icon-check-circle" /><span>Exomes</span></td>
                                <td className="filter">
                                    <span>Filter:</span>
                                    <ul>
                                        {dataset._extra.exome_filter ?
                                            dataset._extra.exome_filter.map((filter, index) => {
                                                return (this.renderExacGnomadFilter(filter, (filter + '-' + index), 'warning'));
                                            })
                                            :
                                            this.renderExacGnomadFilter('Pass', 'Pass', 'success')}
                                    </ul>
                                </td>
                            </tr>
                            :
                            <tr>
                                <td className="included-data"><i className="icon icon-times-circle" /><span>Exomes</span></td>
                                <td className="filter">
                                    <span>Filter:</span>
                                    <ul>{this.renderExacGnomadFilter('No variant', 'No variant', 'danger')}</ul>
                                </td>
                            </tr>
                        }{dataset._extra.hasGenomeData ?
                            <tr>
                                <td className="included-data"><i className="icon icon-check-circle" /><span>Genomes</span></td>
                                <td className="filter">
                                    <span>Filter:</span>
                                    <ul>
                                        {dataset._extra.genome_filter ?
                                            dataset._extra.genome_filter.map((filter, index) => {
                                                return (this.renderExacGnomadFilter(filter, (filter + '-' + index), 'warning'));
                                            })
                                            :
                                            this.renderExacGnomadFilter('Pass', 'Pass', 'success')}
                                    </ul>
                                </td>
                            </tr>
                            :
                            <tr>
                                <td className="included-data"><i className="icon icon-times-circle" /><span>Genomes</span></td>
                                <td className="filter">
                                    <span>Filter:</span>
                                    <ul>{this.renderExacGnomadFilter('No variant', 'No variant', 'danger')}</ul>
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            );
        } else {
            return;
        }
    },

    // Method to render 1000 Genomes population table header content
    renderTGenomesHeader: function(hasTGenomesData, loading_ensemblVariation, tGenomes, singleNucleotide) {
        if (hasTGenomesData && !loading_ensemblVariation && singleNucleotide) {
            const variantTGenomes = tGenomes._extra.name + ' ' + tGenomes._extra.var_class;
            const linkoutEnsembl = external_url_map['EnsemblPopulationPage'] + tGenomes._extra.name;
            return (
                <h3 className="panel-title">1000 Genomes: {variantTGenomes} (GRCh38)
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
                <h3 className="panel-title">Exome Sequencing Project (ESP): {variantEsp} (GRCh37)
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

    /**
     * Sort population data table by allele frequency from highest to lowest
     */
    sortObjKeys(obj) {
        let arr = []; // Array converted from object
        let filteredArray = []; // filtered array without the '_tot' and '_extra' key/value pairs
        let sortedArray = []; // Sorting the filtered array from highest to lowest allele frequency
        let sortedKeys = []; // Sorted order for the rendering of populations
        if (Object.keys(obj).length) {
            arr = Object.entries(obj);
            filteredArray = arr.filter(item => {
                return item[0].indexOf('_') < 0;
            });
            sortedArray = filteredArray.sort((x, y) => y[1]['af'] - x[1]['af']);
            sortedArray.forEach(item => {
                sortedKeys.push(item[0]);
            });
        }
        return sortedKeys;
    },

    render() {
        var exacStatic = populationStatic.exac,
            gnomADStatic = populationStatic.gnomAD,
            tGenomesStatic = populationStatic.tGenomes,
            espStatic = populationStatic.esp;
        var highestMAF = this.state.populationObj && this.state.populationObj.highestMAF ? this.state.populationObj.highestMAF : null,
            pageData = this.props.ext_pageData && this.props.ext_pageData.data ? this.props.ext_pageData.data : [], // Get PAGE data from response
            pageVariant = this.props.ext_pageData && this.props.ext_pageData.variant ? this.props.ext_pageData.variant : null, // Get PAGE data from response
            exac = this.state.populationObj && this.state.populationObj.exac ? this.state.populationObj.exac : null, // Get ExAC data from global population object
            gnomAD = this.state.populationObj && this.state.populationObj.gnomAD ? this.state.populationObj.gnomAD : null, // Get gnomAD data from global population object
            tGenomes = this.state.populationObj && this.state.populationObj.tGenomes ? this.state.populationObj.tGenomes : null,
            esp = this.state.populationObj && this.state.populationObj.esp ? this.state.populationObj.esp : null; // Get ESP data from global population object
        var desiredCI = this.state.populationObj && this.state.populationObj.desiredCI ? this.state.populationObj.desiredCI : CI_DEFAULT;
        var populationObjDiffFlag = this.state.populationObjDiffFlag;
        var singleNucleotide = this.state.ext_singleNucleotide;
        let exacSortedAlleleFrequency = this.sortObjKeys(exac);
        let gnomADSortedAlleleFrequency = this.sortObjKeys(gnomAD);
        const affiliation = this.props.affiliation, session = this.props.session;

        return (
            <div className="variant-interpretation population">
                <PanelGroup accordion><Panel title="Population Criteria Evaluation" panelBodyClassName="panel-wide-content" open>
                    {(this.state.data && this.state.interpretation) ?
                        <div className="row">
                            <div className="col-sm-12">
                                <CurationInterpretationForm renderedFormContent={criteriaGroup1}
                                    evidenceData={this.state.populationObj} evidenceDataUpdated={populationObjDiffFlag} formChangeHandler={criteriaGroup1Change}
                                    formDataUpdater={criteriaGroup1Update} variantUuid={this.state.data['@id']}
                                    criteria={['BA1', 'PM2', 'BS1']} criteriaCrossCheck={[['BA1', 'PM2', 'BS1']]}
                                    interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                    affiliation={affiliation} session={session} />
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

                    <div className="bs-callout bs-callout-info clearfix">
                        <h4>Subpopulation with Highest Minor Allele Frequency</h4>
                        <p className="header-note">(Note: this calculation does not currently include PAGE study minor allele data)</p>
                        <p>This reflects the highest MAF observed, as calculated by the interface, across all subpopulations in the versions of gnomAD, ExAC, 1000 Genomes, and ESP shown below.</p>
                        <div className="clearfix">
                            <div className="bs-callout-content-container">
                                <dl className="inline-dl clearfix">
                                    <dt>Subpopulation: </dt><dd>{highestMAF && highestMAF.popLabel ? highestMAF.popLabel : 'N/A'}</dd>
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
                            <br/>
                            <p className="header-note">(Note: View ExAC Constraint Scores on the Gene-centric tab)</p>
                    </div>
                    <div className="panel panel-info datasource-gnomAD">
                        <div className="panel-heading">
                            {this.renderExacGnomadHeader(this.state.hasGnomadData, this.state.loading_myVariantInfo, gnomAD, singleNucleotide, this.props.ext_myVariantInfo, 'gnomAD')}
                        </div>
                        <div className="panel-content-wrapper">
                            {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                            {!singleNucleotide ?
                                <div className="panel-body">
                                    <span>Data is currently only returned for single nucleotide variants. {this.renderExacGnomadLinkout(this.props.ext_myVariantInfo, 'gnomAD')}</span>
                                </div>
                                :
                                <div>
                                    {this.state.hasGnomadData ?
                                        <div>
                                            {this.renderExacGnomadAddlInfo(gnomAD, 'gnomAD')}
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
                                                    {gnomADSortedAlleleFrequency.map(key => {
                                                        return (this.renderExacGnomadRow(key, gnomAD, gnomADStatic));
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    {this.renderExacGnomadRow('_tot', gnomAD, gnomADStatic, 'Total', 'count')}
                                                </tfoot>
                                            </table>
                                        </div>
                                        :
                                        <div className="panel-body">
                                            <span>No population data was found for this allele in gnomAD. {this.renderExacGnomadLinkout(this.props.ext_myVariantInfo, 'gnomAD')}</span>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                    <div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading">
                            {this.renderExacGnomadHeader(this.state.hasExacData, this.state.loading_myVariantInfo, exac, singleNucleotide, this.props.ext_myVariantInfo, 'ExAC')}
                        </div>
                        <div className="panel-content-wrapper">
                            {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                            {!singleNucleotide ?
                                <div className="panel-body">
                                    <span>Data is currently only returned for single nucleotide variants. {this.renderExacGnomadLinkout(this.props.ext_myVariantInfo, 'ExAC')}</span>
                                </div>
                                :
                                <div>
                                    {this.state.hasExacData ?
                                        <div>
                                            {this.renderExacGnomadAddlInfo(exac, 'ExAC')}
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
                                                    {exacSortedAlleleFrequency.map(key => {
                                                        return (this.renderExacGnomadRow(key, exac, exacStatic));
                                                    })}
                                                </tbody>
                                                <tfoot>
                                                    {this.renderExacGnomadRow('_tot', exac, exacStatic, 'Total', 'count')}
                                                </tfoot>
                                            </table>
                                        </div>
                                        :
                                        <div className="panel-body">
                                            <span>No population data was found for this allele in ExAC. {this.renderExacGnomadLinkout(this.props.ext_myVariantInfo, 'ExAC')}</span>
                                        </div>
                                    }
                                </div>
                            }
                        </div>
                    </div>
                    <div className="panel panel-info datasource-PAGE">
                        <div className="panel-heading">
                            {this.renderPageHeader(this.state.hasPageData, this.state.loading_pageData, pageVariant, singleNucleotide)}
                        </div>
                        <div className="panel-content-wrapper">
                            {this.state.loading_pageData ? showActivityIndicator('Retrieving data... ') : null}
                            {!singleNucleotide ?
                                <div className="panel-body">
                                    <span>Data is currently only returned for single nucleotide variants. <a href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">Search GGV</a> for this variant.</span>
                                </div>
                                :
                                <div>
                                    {this.state.hasPageData ?
                                        <div>
                                            <table className="table">
                                                <thead>
                                                    <tr>
                                                        <th>Population</th>
                                                        <th>Allele Number</th>
                                                        <th colSpan="2">Allele Frequency</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pageData.length ?
                                                        pageData.map((item, i) => {
                                                            return (this.renderPageRow(item, i));
                                                        })
                                                        : null}
                                                </tbody>
                                            </table>
                                        </div>
                                        :
                                        <div className="panel-body">
                                            {session && session.user_properties && session.user_properties.email === 'clingen.demo.curator@genome.stanford.edu' ?
                                                <span>PAGE population data is not available to demo users. Please login or request an account for the ClinGen interfaces by emailing the <a href='mailto:clingen-helpdesk@lists.stanford.edu'>clingen-helpdesk@lists.stanford.edu <i className="icon icon-envelope"></i></a>.</span>
                                                :
                                                <span>No population data was found for this allele in PAGE. <a href="http://popgen.uchicago.edu/ggv/" target="_blank" rel="noopener noreferrer">Search GGV</a> for this variant.</span>
                                            }
                                        </div>
                                    }
                                </div>
                            }
                        </div>
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
                    <extraEvidence.ExtraEvidenceTable category="population" subcategory="population" session={session}
                        href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Population)</span>}
                        variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                        viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} />
                </Panel></PanelGroup>

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="population" updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}

                {renderDataCredit('pagestudy')}

                {renderDataCredit('myvariant')}

                {renderDataCredit('vep')}

            </div>
        );
    }
});


// code for rendering of this group of interpretation forms
var criteriaGroup1 = function() {
    let criteriaList1 = ['BA1', 'BS1', 'PM2'], // array of criteria code handled subgroup of this section
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
