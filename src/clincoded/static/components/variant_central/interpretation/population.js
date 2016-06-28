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
        shouldFetchData: React.PropTypes.bool,
        updateInterpretationObj: React.PropTypes.func,
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            clinvar_id: null, // ClinVar ID
            car_id: null, // ClinGen Allele Registry ID
            interpretation: this.props.interpretation,
            hgvs_GRCh37: null,
            ensembl_exac_allele: {},
            interpretationUuid: this.props.interpretationUuid,
            hasExacData: false, // flag to display ExAC table
            hasTGenomesData: false,
            hasEspData: false, // flag to display ESP table
            shouldFetchData: false,
            populationObj: {
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
        if (this.props.data) {
            this.setState({shouldFetchData: true});
            this.fetchMyVariantInfo();
            this.fetchEnsemblData();
        }
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
        if (this.state.shouldFetchData === false && nextProps.shouldFetchData === true) {
            this.setState({shouldFetchData: true});
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
            this.getRestData(this.props.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json').then(response => {
                // Calling method to update global object with ExAC Allele Frequency data
                this.parseAlleleFrequencyData(response);
            }).catch(function(e) {
                console.log('VEP Allele Frequency Fetch Error=: %o', e);
            });
            this.getRestData(url + variant_id).then(response => {
                // Calling methods to update global object with ExAC & ESP population data
                // FIXME: Need to create a new copy of the global object with new data
                // while leaving the original object with pre-existing data
                // for comparison of any potential changed values
                this.parseExacData(response);
                this.parseEspData(response);
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
            this.getRestData(this.props.protocol + external_url_map['EnsemblVariation'] + 'rs' + rsid + '?content-type=application/json;pops=1;population_genotypes=1').then(response => {
                this.parseTGenomesData(response);
            }).catch(function(e) {
                console.log('Ensembl Fetch Error=: %o', e);
            });
            // Get ExAC allele frequency as a fallback strategy
            // In the event where myvariant.info doesn't return ExAC allele frequency info
            // FIXME: Need to remove this when switching to using the global population object for table UI
            // FIXME_MC: Also need to figure out how to make sure the promises do not conflict: they're not chained, but dependent on the result of the other
            /*
            this.getRestData(this.props.protocol + external_url_map['EnsemblVEP'] + 'rs' + rsid + '?content-type=application/json&hgvs=1&protein=1&xref_refseq=1').then(response => {
                this.parseAlleleFrequencyData(response);
                this.setState({ensembl_exac_allele: response[0].colocated_variants[0]});
            }).catch(function(e) {
                console.log('Ensembl Fetch Error=: %o', e);
            });
            */
        }
    },

    // Get ExAC allele frequency from Ensembl (VEP) directly
    // Because myvariant.info doesn't always return ExAC allele frequency data
    parseAlleleFrequencyData: function(response) {
        let populationObj = this.state.populationObj;
        populationStatic.exac._order.map(key => {
            populationObj.exac[key].af = response[0].colocated_variants[0]['exac_' + key + '_maf'];
        });
        populationObj.exac._tot.af = response[0].colocated_variants[0].exac_adj_maf;

        this.setState({populationObj: populationObj});
    },

    // Method to assign ExAC population data to global population object
    parseExacData: function(response) {
        // Not all variants can be found in ExAC
        // Do nothing if the exac{...} object is not returned from myvariant.info
        let populationObj = this.state.populationObj;
        if (response.exac) {
            // Get other ExAC population data from myvariant.info, such allele_count, allele_number, homozygotes number, etc
            populationStatic.exac._order.map(key => {
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
            this.setState({hasExacData: true, populationObj: populationObj});
        }
    },

    // parse 1000Genome data
    parseTGenomesData: function(response) {
        let populationObj = this.state.populationObj;
        populationObj.tGenomes._extra.name = response.name;
        populationObj.tGenomes._extra.var_class = response.var_class;
        populationObj.tGenomes._extra.ref = response.ancestral_allele;
        populationObj.tGenomes._extra.alt = response.minor_allele;
        if (response.populations) {
            response.populations.map(population => {
                let populationCode = population.population.substring(20).toLowerCase();
                if (population.population.indexOf('1000GENOMES:phase_3') == 0 &&
                    populationStatic.tGenomes._order.indexOf(populationCode) > 0) {
                    populationObj.tGenomes[populationCode].ac[population.allele] = population.allele_count;
                    populationObj.tGenomes[populationCode].af[population.allele] = population.frequency;
                } else if (population.population == '1000GENOMES:phase_3:ALL') {
                    populationObj.tGenomes._tot.ac[population.allele] = population.allele_count;
                    populationObj.tGenomes._tot.af[population.allele] = population.frequency;
                } else if (population.population == 'ESP6500:African_American') {
                    populationObj.tGenomes.espaa.ac[population.allele] = population.allele_count;
                    populationObj.tGenomes.espaa.af[population.allele] = population.frequency;
                } else if (population.population == 'ESP6500:European_American') {
                    populationObj.tGenomes.espea.ac[population.allele] = population.allele_count;
                    populationObj.tGenomes.espea.af[population.allele] = population.frequency;
                }
            });
        }
        if (response.population_genotypes) {
            response.population_genotypes.map(population_genotype => {
                let populationCode = population_genotype.population.substring(20).toLowerCase();
                if (population_genotype.population.indexOf('1000GENOMES:phase_3:') == 0 &&
                    populationStatic.tGenomes._order.indexOf(populationCode) > 0) {
                    populationObj.tGenomes[populationCode].gc[population_genotype.genotype] = population_genotype.count;
                    populationObj.tGenomes[populationCode].gf[population_genotype.genotype] = population_genotype.frequency;
                } else if (population_genotype.population == '1000GENOMES:phase_3:ALL') {
                    populationObj.tGenomes._tot.gc[population_genotype.genotype] = population_genotype.count;
                    populationObj.tGenomes._tot.gf[population_genotype.genotype] = population_genotype.frequency;
                } else if (population_genotype.population == 'ESP6500:African_American') {
                    populationObj.tGenomes.espaa.gc[population_genotype.genotype] = population_genotype.count;
                    populationObj.tGenomes.espaa.gf[population_genotype.genotype] = population_genotype.frequency;
                } else if (population_genotype.population == 'ESP6500:European_American') {
                    populationObj.tGenomes.espea.gc[population_genotype.genotype] = population_genotype.count;
                    populationObj.tGenomes.espea.gf[population_genotype.genotype] = population_genotype.frequency;
                }
            });
        }
        this.setState({hasTGenomesData: true, populationObj: populationObj});
    },

    // Method to assign ESP population data to global population object
    parseEspData: function(response) {
        // Not all variants return the evs{...} object from myvariant.info
        if (response.evs) {
            let populationObj = this.state.populationObj;
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
            this.setState({hasEspData: true, populationObj: populationObj});
        }
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
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{tGenomes[key].af[tGenomes._extra.ref] ? tGenomes._extra.ref + ': ' + tGenomes[key].af[tGenomes._extra.ref] : '--'}{tGenomes[key].ac[tGenomes._extra.ref] ? ' (' + tGenomes[key].ac[tGenomes._extra.ref] + ')' : ''}</td>
                <td>{tGenomes[key].af[tGenomes._extra.alt] ? tGenomes._extra.alt + ': ' + tGenomes[key].af[tGenomes._extra.alt] : '--'}{tGenomes[key].ac[tGenomes._extra.alt] ? ' (' + tGenomes[key].ac[tGenomes._extra.alt] + ')' : ''}</td>
                <td>{tGenomes[key].gf[tGenomes._extra.ref + '|' + tGenomes._extra.ref] ? tGenomes._extra.ref + '|' + tGenomes._extra.ref + ': ' + tGenomes[key].gf[tGenomes._extra.ref + '|' + tGenomes._extra.ref] : '--'}{tGenomes[key].gc[tGenomes._extra.ref + '|' + tGenomes._extra.ref] ? ' (' + tGenomes[key].gc[tGenomes._extra.ref + '|' + tGenomes._extra.ref] + ')' : ''}</td>
                <td>{tGenomes[key].gf[tGenomes._extra.alt + '|' + tGenomes._extra.alt] ? tGenomes._extra.alt + '|' + tGenomes._extra.alt + ': ' + tGenomes[key].gf[tGenomes._extra.alt + '|' + tGenomes._extra.alt] : '--'}{tGenomes[key].gc[tGenomes._extra.alt + '|' + tGenomes._extra.alt] ? ' (' + tGenomes[key].gc[tGenomes._extra.alt + '|' + tGenomes._extra.alt] + ')' : ''}</td>
                <td>{tGenomes[key].gf[tGenomes._extra.ref + '|' + tGenomes._extra.alt] ? tGenomes._extra.ref + '|' + tGenomes._extra.alt + ': ' + tGenomes[key].gf[tGenomes._extra.ref + '|' + tGenomes._extra.alt] : '--'}{tGenomes[key].gc[tGenomes._extra.ref + '|' + tGenomes._extra.alt] ? ' (' + tGenomes[key].gc[tGenomes._extra.ref + '|' + tGenomes._extra.alt] + ')' : ''}</td>
            </tr>
        );
    },

    // method to render a row of data for the ESP table
    renderEspRow: function(key, esp, espStatic, rowNameCustom, className) {
        let rowName = espStatic._labels[key];
        if (key == '_tot') {
            rowName = rowNameCustom;
        }
        return (
            <tr key={key} className={className ? className : ''}>
                <td>{rowName}</td>
                <td>{esp[key].ac[esp._extra.ref] ? esp._extra.ref + ': ' + esp[key].ac[esp._extra.ref] : '--'}</td>
                <td>{esp[key].ac[esp._extra.alt] ? esp._extra.alt + ': ' + esp[key].ac[esp._extra.alt] : '--'}</td>
                <td>{esp[key].gc[esp._extra.ref + esp._extra.ref] ? esp._extra.ref + esp._extra.ref + ': ' + esp[key].gc[esp._extra.ref + esp._extra.ref] : '--'}</td>
                <td>{esp[key].gc[esp._extra.alt + esp._extra.alt] ? esp._extra.alt + esp._extra.alt + ': ' + esp[key].gc[esp._extra.alt + esp._extra.alt] : '--'}</td>
                <td>{esp[key].gc[esp._extra.alt + esp._extra.ref] ? esp._extra.alt + esp._extra.ref + ': ' + esp[key].gc[esp._extra.alt + esp._extra.ref] : '--'}</td>
            </tr>
        );
    },

    render: function() {
        var exacStatic = populationStatic.exac,
            tGenomesStatic = populationStatic.tGenomes,
            espStatic = populationStatic.esp;
        var exac = this.state.populationObj && this.state.populationObj.exac ? this.state.populationObj.exac : null, // Get ExAC data from global population object
            tGenomes = this.state.populationObj && this.state.populationObj.tGenomes ? this.state.populationObj.tGenomes : null,
            esp = this.state.populationObj && this.state.populationObj.esp ? this.state.populationObj.esp : null; // Get ESP data from global population object

        return (
            <div className="variant-interpretation population">
                {(this.state.interpretation) ?
                <div className="row">
                    <div className="col-sm-12">
                        <CurationInterpretationForm formTitle={"Population Demo Criteria Group 1"} renderedFormContent={pop_crit_1}
                            evidenceType={'population'} evidenceData={this.state.populationObj} evidenceDataUpdated={true}
                            formDataUpdater={pop_crit_1_update} variantUuid={this.props.data['@id']} criteria={['pm2']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        <CurationInterpretationForm formTitle={"Population Demo Criteria Group 2"} renderedFormContent={pop_crit_2}
                            evidenceType={'population'} evidenceData={this.state.populationObj} evidenceDataUpdated={true}
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
                                    <th>Variant information could not be found.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    // FIXME: below URL is dependent on a response, but this block is executed on lack of a response
                    //Please see <a href={this.props.protocol + external_url_map['EXAC'] + exac._extra.chrom + '-' + exac._extra.pos + '-' + exac._extra.ref + '-' + exac._extra.alt} target="_blank">variant data</a> at ExAC.
                }
                {this.state.hasTGenomesData ?
                    <div className="panel panel-info datasource-1000G">
                        <div className="panel-heading"><h3 className="panel-title">1000G: {tGenomes._extra.name + ' ' + tGenomes._extra.var_class}</h3></div>
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
                                    <th>Variant information could not be found.</th>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    // FIXME: below URL is dependent on a response, but this block is executed on lack of a response
                    // Please see <a href={dbxref_prefix_map['ESP_EVS'] + 'searchBy=rsID&target=' + esp._extra.rsid + '&x=0&y=0'} target="_blank">variant data</a> at ESP.
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
