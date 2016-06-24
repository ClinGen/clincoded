'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var LocalStorageMixin = require('react-localstorage');
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

// FIXME: The thousand_genome{} still needs a method to have data assigned
// FIXME: Properties have 'null' values for now in the initial phase.
// They should contain pre-existing values if they exist in the db. Or 'null' if not.
var populationObj = {
    exac: {
        afr: {}, amr: {}, eas: {}, fin: {}, nfe: {}, oth: {}, sas: {}, _tot: {}, _extra: {},
        _order: ['afr', 'oth', 'amr', 'sas', 'nfe', 'eas', 'fin'],
        _labels: {afr: 'African', amr: 'Latino', eas: 'East Asian', fin: 'European (Finnish)', nfe: 'European (Non-Finnish)', oth: 'Other', sas: 'South Asian'}
    },
    thousand_genome: {
        afr: {}, amr: {}, eas: {}, eur: {}, sas: {}, espaa: {}, espea: {}, _tot: {}, _extra: {},
        _order: ['afr', 'amr', 'eas', 'eur', 'sas', 'espaa', 'espea'],
        _labels: {afr: 'AFR', amr: 'AMR', eas: 'EAS', eur: 'EUR', sas: 'SAS', espaa: 'ESP6500: African American', espea: 'ESP6500: European American'}
    },
    esp: {
        aa: {ac: {}, gc: {}},
        ea: {ac: {}, gc: {}},
        _tot: {ac: {}, gc: {}},
        _extra: {},
        _order: ['ea', 'aa'],
        _labels: {ea: 'EA Allele', aa: 'AA Allele'}
    }
};

// Display the population data of external sources
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        shouldFetchData: React.PropTypes.bool,
        updateInterpretationObj: React.PropTypes.func,
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            external_data: null,
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            interpretation: this.props.interpretation,
            dbSNP_id: null,
            hgvs_GRCh37: null,
            gene_symbol: null,
            ensembl_variation_data: {},
            ensembl_populations: [],
            ensembl_population_genotypes: [],
            ensembl_exac_allele: {},
            myvariant_exac_population: {}, // ExAC population counts from myvariant.info
            myvariant_exac_allele: {}, // ExAC population frequencies from myvariant.info
            myvariant_esp_population: {}, // ESP (EVS) population allele from myvariant.info
            interpretationUuid: this.props.interpretationUuid,
            hasExacData: false, // flag to display ExAC table
            hasEspData: false, // flag to display ESP table
            shouldFetchData: false
        };
    },

    // Invoke data fetching when this tab is clicked
    componentDidMount: function() {
        console.log("population component is mounted");
        if (this.state.shouldFetchData === false) {
            this.setState({shouldFetchData: true});
            if (this.state.hasExacData === false) {
                this.fetchMyVariantInfo();
            }
            if (this.state.hasEspData === false) {
                this.fetchEnsemblData();
            }
        }
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
        this.setState({shouldFetchData: nextProps.shouldFetchData});
        if (this.state.shouldFetchData === true) {
            window.localStorage.clear();
            this.fetchMyVariantInfo();
            this.fetchEnsemblData();
        }
    },

    // Retrieve ExAC population data from myvariant.info
    fetchMyVariantInfo: function() {
        var variant = this.props.data;
        var url = this.props.protocol + external_url_map['MyVariantInfo'];
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds) ? variant.dbSNPIds[0].match(numberPattern) : '';
            // Extract genomic substring from HGVS name whose assembly is GRCh37
            // Both of "GRCh37" and "gRCh37" instances are possibly present in the variant object
            var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
            var NC_genomic = hgvs_GRCh37.substr(0, hgvs_GRCh37.indexOf(':'));
            // 'genomic_chr_mapping' is defined via requiring external mapping file
            var found = genomic_chr_mapping.find((entry) => entry.GenomicRefSeq === NC_genomic);
            // Format variant_id for use of myvariant.info REST API
            var variant_id = found.ChrFormat + hgvs_GRCh37.slice(hgvs_GRCh37.indexOf(':'));
            this.getRestData(this.props.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json').then(exac_allele_frequency => {
                // Calling method to update global object with ExAC Allele Frequency data
                this.assignAlleleFrequencyData(exac_allele_frequency);
                this.setState({external_data: populationObj});
            }).catch(function(e) {
                console.log('VEP Allele Frequency Fetch Error=: %o', e);
            });
            this.getRestData(url + variant_id).then(response => {
                this.setState({myvariant_exac_population: response.exac});
                // Calling methods to update global object with ExAC & ESP population data
                // FIXME: Need to create a new copy of the global object with new data
                // while leaving the original object with pre-existing data
                // for comparison of any potential changed values
                this.assignExacData(response);
                this.assignEspData(response);
                this.setState({external_data: populationObj});
            }).catch(function(e) {
                console.log('MyVariant Fetch Error=: %o', e);
            });
        }
    },

    // Get ExAC allele frequency from Ensembl (VEP) directly
    // Because myvariant.info doesn't always return ExAC allele frequency data
    assignAlleleFrequencyData: function(allele_frequency) {
        populationObj.exac._order.map(key => {
            populationObj.exac[key].af = allele_frequency[0].colocated_variants[0]['exac_' + key + '_maf'];
        });
        populationObj.exac._tot.af = allele_frequency[0].colocated_variants[0].exac_adj_maf;
    },

    // Method to assign ExAC population data to global population object
    assignExacData: function(response) {
        // Not all variants can be found in ExAC
        // Do nothing if the exac{...} object is not returned from myvariant.info
        if (response.exac) {
            // Get other ExAC population data from myvariant.info, such allele_count, allele_number, homozygotes number, etc
            populationObj.exac._order.map(key => {
                populationObj.exac[key].ac = response.exac.ac['ac_' + key];
                populationObj.exac[key].an = response.exac.an['an_' + key];
                populationObj.exac[key].hom = response.exac.hom['hom_' + key];
            });
            populationObj.exac._tot.ac = response.exac.ac.ac_adj;
            populationObj.exac._tot.an = response.exac.an.an_adj;
            populationObj.exac._tot.hom = response.exac.hom.ac_hom;
            populationObj.exac._extra.chrom = response.exac.chrom;
            populationObj.exac._extra.pos = response.exac.pos;
            populationObj.exac._extra.ref = response.exac.ref;
            populationObj.exac._extra.alt = response.exac.alt;
            // Set a flag to display data in the table
            this.setState({hasExacData: true});
        }
    },

    // Method to assign ESP population data to global population object
    assignEspData: function(response) {
        // Not all variants return the evs{...} object from myvariant.info
        if (response.evs) {
            populationObj.esp.aa.ac = response.evs.allele_count.african_american;
            populationObj.esp.aa.gc = response.evs.genotype_count.african_american;
            populationObj.esp.ea.ac = response.evs.allele_count.european_american;
            populationObj.esp.ea.gc = response.evs.genotype_count.european_american;
            populationObj.esp._tot.ac = response.evs.allele_count.all;
            populationObj.esp._tot.gc = response.evs.genotype_count.all_genotype;
            populationObj.esp._extra.avg_sample_read = response.evs.avg_sample_read;
            populationObj.esp._extra.rsid = response.evs.rsid;
            populationObj.esp._extra.chrom = response.evs.chrom;
            populationObj.esp._extra.hg19_start = response.evs.hg19.start;
            populationObj.esp._extra.ref = response.evs.ref;
            populationObj.esp._extra.alt = response.evs.alt;
            // Set a flag to display data in the table
            this.setState({hasEspData: true});
        }
    },

    // FIXME: Need to be implemented
    assign1000GData: function(response) {

    },

    // Retrieve 1000GENOMES population data from rest.ensembl.org
    fetchEnsemblData: function() {
        var variant = this.props.data;
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds) ? variant.dbSNPIds[0].match(numberPattern) : '';
            this.getRestData(this.props.protocol + external_url_map['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1').then(response => {
                console.log('ENSEMBL1');
                console.log(response);
                this.setState({
                    ensembl_variation_data: response,
                    ensembl_populations: response.populations,
                    ensembl_population_genotypes: response.population_genotypes
                });
            }).catch(function(e) {
                console.log('Ensembl Fetch Error=: %o', e);
            });
            // Get ExAC allele frequency as a fallback strategy
            // In the event where myvariant.info doesn't return ExAC allele frequency info
            // FIXME: Need to remove this when switching to using the global population object for table UI
            this.getRestData(this.props.protocol + external_url_map['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1').then(response => {
                console.log('ENSEMBL2');
                console.log(response);
                this.setState({ensembl_exac_allele: response[0].colocated_variants[0]});
            }).catch(function(e) {
                console.log('Ensembl Fetch Error=: %o', e);
            });
        }
    },

    // Function to get 1000G values and populate table cells
    handle1000GPopData: function(data, population, allele) {
        var displayVal = '--';
        var pop_items = [], pop_item;
        data.forEach(item => {
            if (item.population === population) {
                pop_items.push(item);
            }
        });
        // It's possible that a variant returns no 1000G population data, such as rs386833446
        if (pop_items.length) {
            pop_item = pop_items.find((n) => n.allele === allele);
            // It's possible that a returned 1000G population object has no matching allele
            if (pop_item) {
                displayVal = pop_item.allele + ': ' + pop_item.frequency + ' (' + pop_item.allele_count + ')';
            }
        }
        return displayVal;
    },

    // Function to get 1000G genotype values and populate table cells
    handle1000GGenotype: function(data, population, genotype) {
        var displayVal = '--';
        var pop_items = [], pop_item;
        data.forEach(item => {
            if (item.population === population) {
                pop_items.push(item);
            }
        });
        // It's possible that a variant returns no 1000G population data
        if (pop_items.length) {
            pop_item = pop_items.find((n) => n.genotype === genotype);
            // It's possible that a returned 1000G population object has no matching genotype
            if (pop_item) {
                displayVal = pop_item.genotype + ': ' + pop_item.frequency + ' (' + pop_item.count + ')';
            }
        }
        return displayVal;
    },

    renderExacRow: function(key, exac, rowNameCustom, className) {
        let rowName = exac._labels[key];
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{exac[key].ac !== null ? exac[key].ac : '--'}</td>
                <td>{exac[key].an !== null ? exac[key].an : '--'}</td>
                <td>{exac[key].hom !== null ? exac[key].hom : '--'}</td>
                <td>{exac[key].af !== null ? exac[key].af : '--'}</td>
            </tr>
        );
    },

    renderEspRow: function(key, esp, rowNameCustom, className) {
        let rowName = esp._labels[key];
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{esp[key].ac[esp._extra.ref] !== null ? esp._extra.ref + ': ' + esp[key].ac[esp._extra.ref] : '--'}</td>
                <td>{esp[key].ac[esp._extra.alt] !== null ? esp._extra.alt + ': ' + esp[key].ac[esp._extra.alt] : '--'}</td>
                <td>{esp[key].gc[esp._extra.ref + esp._extra.ref] !== null ? esp._extra.ref + esp._extra.ref + ': ' + esp[key].gc[esp._extra.ref + esp._extra.ref] : '--'}</td>
                <td>{esp[key].gc[esp._extra.alt + esp._extra.alt] !== null ? esp._extra.alt + esp._extra.alt + ': ' + esp[key].gc[esp._extra.alt + esp._extra.alt] : '--'}</td>
                <td>{esp[key].gc[esp._extra.alt + esp._extra.ref] !== null ? esp._extra.alt + esp._extra.ref + ': ' + esp[key].gc[esp._extra.alt + esp._extra.ref] : '--'}</td>
            </tr>
        );
    },

    render: function() {
        // FIXME: Need to switch to using the global population object
        var ensembl_variation = this.state.ensembl_variation_data,
            ensembl_populations = this.state.ensembl_populations,
            ensembl_population_genotypes = this.state.ensembl_population_genotypes;
        // Genotype alleles (e.g. 'C|C', 'T|T', 'C|T') used by 1000G
        var allele_ancestral, allele_minor, allele_mixed;
        if (ensembl_variation) {
            allele_ancestral = ensembl_variation.ancestral_allele + '|' + ensembl_variation.ancestral_allele;
            allele_minor = ensembl_variation.minor_allele + '|' + ensembl_variation.minor_allele;
            allele_mixed = ensembl_variation.ancestral_allele + '|' + ensembl_variation.minor_allele;
        }

        var exac = this.state.external_data && this.state.external_data.exac ? this.state.external_data.exac : null; // Get ExAC data from global population object
        var thousand_genome = this.state.external_data && this.state.external_data.thousand_genome ? this.state.external_data.thousand_genome : null;
        var esp = this.state.external_data && this.state.external_data.esp ? this.state.external_data.esp : null; // Get ESP data from global population object
        // Genotype alleles (e.g. 'CC', 'TT', 'TC') used by ESP
        var esp_allele_ref, esp_allele_alt, esp_allele_mixed;
        if (esp) {
            esp_allele_ref = esp.ref + esp.ref;
            esp_allele_alt = esp.alt + esp.alt;
            esp_allele_mixed = esp.alt + esp.ref;
        }

        return (
            <div className="variant-interpretation population">
                {(this.state.interpretation) ?
                <div className="row">
                    <div className="col-sm-12">
                        <CurationInterpretationForm formTitle={"Population Demo Criteria Group 1"} renderedFormContent={pop_crit_1}
                            evidenceType={'population'} evidenceData={this.state.external_data} evidenceDataUpdated={true}
                            formDataUpdater={pop_crit_1_update} variantUuid={this.props.data['@id']} criteria={['pm2']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        <CurationInterpretationForm formTitle={"Population Demo Criteria Group 2"} renderedFormContent={pop_crit_2}
                            evidenceType={'population'} evidenceData={this.state.external_data} evidenceDataUpdated={true}
                            formDataUpdater={pop_crit_2_update} variantUuid={this.props.data['@id']} criteria={['ps4', 'ps5']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                </div>
                : null}

                <div className="bs-callout bs-callout-info clearfix">
                    <h4>Highest Minor Allele Frequency</h4>
                    <div className="clearfix">
                        <div className="bs-callout-content-container">
                            <dl className="inline-dl clearfix">
                                <dt>Population: </dt><dd>XXXXXX</dd>
                                <dt># Variant Alleles: </dt><dd>XXXXXX</dd>
                                <dt>Total # Alleles Tested: </dt><dd>XXXXXX</dd>
                            </dl>
                        </div>
                        <div className="bs-callout-content-container">
                            <dl className="inline-dl clearfix">
                                <dt>Source: </dt><dd>XXXXXX</dd>
                                <dt>Allele Frequency: </dt><dd>XXXXXX</dd>
                                <dt>CI - lower: </dt><dd>XXXXXX</dd>
                                <dt>CI - upper: </dt><dd>XXXXXX</dd>
                            </dl>
                        </div>
                    </div>
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
                        <div className="panel-heading"><h3 className="panel-title">ExAC {exac._extra.chrom + ':' + exac._extra.pos + ' ' + exac._extra.ref + '/' + exac._extra.alt}<a href={this.props.protocol + external_url_map['EXAC'] + exac._extra.chrom + '-' + exac._extra.pos + '-' + exac._extra.ref + '-' + exac._extra.alt} target="_blank">(See ExAC data)</a></h3></div>
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
                                {exac._order.map(key => {
                                    return (this.renderExacRow(key, exac));
                                })}
                            </tbody>
                            <tfoot>
                                {this.renderExacRow('_tot', exac, 'Total', 'count')}
                            </tfoot>
                        </table>
                    </div>
                :
                    /*<div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading"><h3 className="panel-title">ExAC</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Variant information could not be found. Please see <a href={this.props.protocol + external_url_map['EXAC'] + exac._extra.chrom + '-' + exac._extra.pos + '-' + exac._extra.ref + '-' + exac._extra.alt} target="_blank">variant data</a> at ExAC.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>*/
                    null
                }
                {/* FIXME: Need to switch to using the global population object for populating 1000G table data */}
                {(ensembl_variation && ensembl_populations && ensembl_population_genotypes) ?
                    <div className="panel panel-info datasource-1000G">
                        <div className="panel-heading"><h3 className="panel-title">1000G: {ensembl_variation.name + ' ' + ensembl_variation.var_class}</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Population</th>
                                    <th colSpan="2">Allele Frequency (count)</th>
                                    <th colSpan="3">Genotype Frequnecy (count)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>ALL</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:ALL', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:ALL', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:ALL', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:ALL', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:ALL', allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>AFR</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:AFR', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:AFR', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:AFR', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:AFR', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:AFR', allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>AMR</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:AMR', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:AMR', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:AMR', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:AMR', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:AMR', allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>EAS</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:EAS', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:EAS', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:EAS', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:EAS', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:EAS', allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>EUR</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:EUR', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:EUR', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:EUR', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:EUR', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:EUR', allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>SAS</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:SAS', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, '1000GENOMES:phase_3:SAS', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:SAS', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:SAS', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, '1000GENOMES:phase_3:SAS', allele_mixed)}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="count">
                                    <td>ESP6500: African American</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, 'ESP6500:African_American', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, 'ESP6500:African_American', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, 'ESP6500:African_American', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, 'ESP6500:African_American', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, 'ESP6500:African_American', allele_mixed)}</td>
                                </tr>
                                <tr className="count">
                                    <td>ESP6500: European American</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, 'ESP6500:European_American', ensembl_variation.ancestral_allele)}</td>
                                    <td>{this.handle1000GPopData(ensembl_populations, 'ESP6500:European_American', ensembl_variation.minor_allele)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, 'ESP6500:European_American', allele_ancestral)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, 'ESP6500:European_American', allele_minor)}</td>
                                    <td>{this.handle1000GGenotype(ensembl_population_genotypes, 'ESP6500:European_American', allele_mixed)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                :
                    <div className="panel panel-info datasource-1000G">
                        <div className="panel-heading"><h3 className="panel-title">1000G</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Variant information could not be found.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }

                {this.state.hasEspData ?
                    <div className="panel panel-info datasource-ESP">
                        <div className="panel-heading"><h3 className="panel-title">Exome Sequencing Project (ESP): {esp._extra.rsid + '; ' + esp._extra.chrom + '.' + esp._extra.hg19_start + '; Alleles ' + esp._extra.ref + '>' + esp._extra.alt}<a href={dbxref_prefix_map['ESP_EVS'] + 'searchBy=rsID&target=' + esp._extra.rsid + '&x=0&y=0'} target="_blank">(See ESP data)</a></h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Population</th>
                                    <th colSpan="2">Allele Count</th>
                                    <th colSpan="3">Genotype Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {esp._order.map(key => {
                                    return (this.renderEspRow(key, esp));
                                })}
                                {this.renderEspRow('_tot', esp, 'All Allele', 'count')}
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
                    /*<div className="panel panel-info datasource-ESP">
                        <div className="panel-heading"><h3 className="panel-title">Exome Sequencing Project (ESP)</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Variant information could not be found. Please see <a href={dbxref_prefix_map['ESP_EVS'] + 'searchBy=rsID&target=' + esp._extra.rsid + '&x=0&y=0'} target="_blank">variant data</a> at ESP.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>*/
                    null
                }
            </div>
        );
    }
});

// FIXME: all functions below here are examples; references to these in above render() should also be removed
var pop_crit_1 = function() {
    return (
        <div>
            <Input type="select" ref="pm2-value" label="Population Demo Criteria 1?" defaultValue="No Selection"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
            <Input type="textarea" ref="pm2-description" label="Population Demo Criteria Description:" rows="5" placeholder="e.g. free text"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

var pop_crit_1_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                if (evaluation.criteria == 'pm2') {
                    this.refs['pm2-value'].setValue(evaluation.value);
                    this.refs['pm2-description'].setValue(evaluation.description);
                    this.setState({submitDisabled: false});
                }
            });
        }
    }
};

var pop_crit_2 = function() {
    return (
        <div>
            <Input type="select" ref="ps4-value" label="Population Demo Criteria 2?" defaultValue="No Selection"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
            <Input type="text" ref="ps4-description" label="Population Demo Criteria 2 Description:" rows="5" placeholder="e.g. free text" inputDisabled={true}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="select" ref="ps5-value" label="Population Demo Criteria 3?" defaultValue="No Selection"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                <option value="No Selection">No Selection</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="In Progress">In Progress</option>
            </Input>
        </div>
    );
};

var pop_crit_2_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                switch(evaluation.criteria) {
                    case 'ps4':
                        this.refs['ps4-value'].setValue(evaluation.value);
                        this.setState({submitDisabled: false});
                        break;
                    case 'ps5':
                        this.refs['ps5-value'].setValue(evaluation.value);
                        this.setState({submitDisabled: false});
                        break;
                }
            });
        }
    }
    if (nextProps.extraData) {
        this.refs['ps4-description'].setValue(nextProps.extraData.test2);
    }
};
