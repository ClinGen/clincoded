'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var LocalStorageMixin = require('react-localstorage');
var CurationInterpretationForm = require('./shared/form').CurationInterpretationForm;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
var genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');

var external_url_map = globals.external_url_map;
var queryKeyValue = globals.queryKeyValue;

// Display the population data of external sources
var CurationInterpretationPopulation = module.exports.CurationInterpretationPopulation = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        shouldFetchData: React.PropTypes.bool
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
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
            shouldFetchData: false
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretationUuid: nextProps.interpretationUuid});
        this.setState({shouldFetchData: nextProps.shouldFetchData});
        if (this.state.shouldFetchData === true) {
            this.fetchMyVariantInfo();
            this.fetchEnsemblData();
        }
    },

    // Retrieve ExAC population data from myvariant.info
    fetchMyVariantInfo: function() {
        var variant = this.props.data;
        var url = 'http://myvariant.info/v1/variant/';
        if (variant) {
            // Extract genomic substring from HGVS name whose assembly is GRCh37
            // Both of "GRCh37" and "gRCh37" instances are possibly present in the variant object
            var hgvs_GRCh37 = (variant.hgvsNames.GRCh37) ? variant.hgvsNames.GRCh37 : variant.hgvsNames.gRCh37;
            var NC_genomic = hgvs_GRCh37.substr(0, hgvs_GRCh37.indexOf(':'));
            // 'genomic_chr_mapping' is defined via requiring external mapping file
            var found = genomic_chr_mapping.find((entry) => entry.GenomicRefSeq === NC_genomic);
            // Format variant_id for use of myvariant.info REST API
            var variant_id = found.ChrFormat + hgvs_GRCh37.slice(hgvs_GRCh37.indexOf(':'));
            this.getRestData(url + variant_id).then(response => {
                this.setState({myvariant_exac_population: response.exac});
                // ExAC allele frequency info is not available in all variant data from myvariant.info
                if (response.dbnsfp && response.dbnsfp.exac) {
                    this.setState({myvariant_exac_allele: response.dbnsfp.exac});
                }
                // ESP allele data of a given variant from myvariant.info
                if (response.evs) {
                    this.setState({myvariant_esp_population: response.evs});
                }
            }).catch(function(e) {
                console.log('MyVariant Fetch Error=: %o', e);
            });
        }
    },

    // Retrieve 1000GENOMES population data from rest.ensembl.org
    fetchEnsemblData: function() {
        var variant = this.props.data;
        if (variant) {
            // Extract only the number portion of the dbSNP id
            var numberPattern = /\d+/g;
            var rsid = (variant.dbSNPIds) ? variant.dbSNPIds[0].match(numberPattern) : '';
            this.getRestData('http://rest.ensembl.org/variation/human/rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1').then(response => {
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
            this.getRestData('http://rest.ensembl.org/vep/human/id/rs' + rsid + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1').then(response => {
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

    // Function to get 1000G genotype values and populate table cells
    handleEspData: function(alleleObj, allele) {
        var displayVal = '--';
        Object.keys(alleleObj).forEach(function(key) {
            if (key === allele) {
                displayVal = key + ': ' + alleleObj[key];
            }
        });
        return displayVal;
    },

    render: function() {
        var ensembl_variation = this.state.ensembl_variation_data,
            ensembl_populations = this.state.ensembl_populations,
            ensembl_population_genotypes = this.state.ensembl_population_genotypes;
        var exac_pop = this.state.myvariant_exac_population,
            exac_allele = this.state.myvariant_exac_allele,
            ensembl_exac_allele = this.state.ensembl_exac_allele;
        var allele_ancestral, allele_minor, allele_mixed;
        if (ensembl_variation) {
            allele_ancestral = ensembl_variation.ancestral_allele + '|' + ensembl_variation.ancestral_allele;
            allele_minor = ensembl_variation.minor_allele + '|' + ensembl_variation.minor_allele;
            allele_mixed = ensembl_variation.ancestral_allele + '|' + ensembl_variation.minor_allele;
        }
        var esp_pop = this.state.myvariant_esp_population;
        var esp_allele_chimp, esp_allele_alt, esp_allele_mixed;
        if (esp_pop) {
            esp_allele_chimp = esp_pop.chimp_allele + esp_pop.chimp_allele;
            esp_allele_alt = esp_pop.alt + esp_pop.alt;
            esp_allele_mixed = esp_pop.alt + esp_pop.chimp_allele;
        }

        return (
            <div className="variant-interpretation population">
                <div className="bs-callout bs-callout-info clearfix">
                    <h4>Highest Minor Allele Frequency</h4>
                    <div className="clearfix">
                        <div className="bs-callout-content-container">
                            <dl className="inline-dl clearfix">
                                <dt>Population: </dt><dd>XXXXXX</dd>
                                <dt># Varaint Alleles: </dt><dd>XXXXXX</dd>
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

                {(exac_pop && exac_allele) ?
                    <div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading"><h3 className="panel-title">ExAC {exac_pop.chrom + ':' + exac_pop.pos + ' ' + exac_pop.ref + '/' + exac_pop.alt}</h3></div>
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
                                <tr>
                                    <td>African</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_afr : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_afr : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_afr : null}</td>
                                    <td>{(exac_allele.afr_af) ? exac_allele.afr_af : ensembl_exac_allele.exac_afr_maf}</td>
                                </tr>
                                <tr>
                                    <td>Other</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_oth : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_oth : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_oth : null}</td>
                                    <td>{(exac_allele.oth_af) ? exac_allele.oth_af : ensembl_exac_allele.exac_oth_maf}</td>
                                </tr>
                                <tr>
                                    <td>Latino</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_amr : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_amr : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_amr : null}</td>
                                    <td>{(exac_allele.amr_af) ? exac_allele.amr_af : ensembl_exac_allele.exac_amr_maf}</td>
                                </tr>
                                <tr>
                                    <td>South Asian</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_sas : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_sas : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_sas : null}</td>
                                    <td>{(exac_allele.sas_af) ? exac_allele.sas_af : ensembl_exac_allele.exac_sas_maf}</td>
                                </tr>
                                <tr>
                                    <td>European (Non-Finnish)</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_nfe : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_nfe : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_nfe : null}</td>
                                    <td>{(exac_allele.nfe_af) ? exac_allele.nfe_af : ensembl_exac_allele.exac_nfe_maf}</td>
                                </tr>
                                <tr>
                                    <td>East Asian</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_eas : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_eas : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_eas : null}</td>
                                    <td>{(exac_allele.eas_af) ? exac_allele.eas_af : ensembl_exac_allele.exac_eas_maf}</td>
                                </tr>
                                <tr>
                                    <td>European (Finnish)</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_fin : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_fin : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.hom_fin : null}</td>
                                    <td>{(exac_allele.fin_af) ? exac_allele.fin_af : ensembl_exac_allele.exac_fin_maf}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="count">
                                    <td>Total</td>
                                    <td>{(exac_pop.ac) ? exac_pop.ac.ac_adj : null}</td>
                                    <td>{(exac_pop.an) ? exac_pop.an.an_adj : null}</td>
                                    <td>{(exac_pop.hom) ? exac_pop.hom.ac_hom : null}</td>
                                    <td>{(exac_allele.adj_af) ? exac_allele.adj_af : ensembl_exac_allele.exac_adj_maf}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                :
                    <div className="panel panel-info datasource-ExAC">
                        <div className="panel-heading"><h3 className="panel-title">ExAC</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Varaint information could not be found at ExAC.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }

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
                                    <th>Varaint information could not be found at 1000 Genomes.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }

                {(esp_pop && esp_pop.allele_count && esp_pop.genotype_count) ?
                    <div className="panel panel-info datasource-ESP">
                        <div className="panel-heading"><h3 className="panel-title">Exome Sequencing Project (ESP): {esp_pop.rsid + '; ' + esp_pop.chrom + '.' + esp_pop.hg19.start + '; Alleles' + esp_pop.chimp_allele + '>' + esp_pop.alt}</h3></div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Population</th>
                                    <th colSpan="2">Allele Count</th>
                                    <th colSpan="3">Genotype Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>EA Allele</td>
                                    <td>{this.handleEspData(esp_pop.allele_count.european_american, esp_pop.chimp_allele)}</td>
                                    <td>{this.handleEspData(esp_pop.allele_count.european_american, esp_pop.alt)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.european_american, esp_allele_chimp)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.european_american, esp_allele_alt)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.european_american, esp_allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>AA Allele</td>
                                    <td>{this.handleEspData(esp_pop.allele_count.african_american, esp_pop.chimp_allele)}</td>
                                    <td>{this.handleEspData(esp_pop.allele_count.african_american, esp_pop.alt)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.african_american, esp_allele_chimp)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.african_american, esp_allele_alt)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.african_american, esp_allele_mixed)}</td>
                                </tr>
                                <tr>
                                    <td>All Allele</td>
                                    <td>{this.handleEspData(esp_pop.allele_count.all, esp_pop.chimp_allele)}</td>
                                    <td>{this.handleEspData(esp_pop.allele_count.all, esp_pop.alt)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.all_genotype, esp_allele_chimp)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.all_genotype, esp_allele_alt)}</td>
                                    <td>{this.handleEspData(esp_pop.genotype_count.all_genotype, esp_allele_mixed)}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr className="count">
                                    <td>Average Sample Read Depth</td>
                                    <td colSpan="5">{esp_pop.avg_sample_read}</td>
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
                                    <th>Varaint information could not be found at Exome Sequencing Project.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                }

            </div>
        );
    }
});
