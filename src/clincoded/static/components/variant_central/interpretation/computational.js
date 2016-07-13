'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../globals');
var RestMixin = require('../../rest').RestMixin;
var parseClinvar = require('../../../libs/parse-resources').parseClinvar;
var CurationInterpretationForm = require('./shared/form').CurationInterpretationForm;
var parseAndLogError = require('../../mixins').parseAndLogError;
var genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');

var external_url_map = globals.external_url_map;
var dbxref_prefix_map = globals.dbxref_prefix_map;

var form = require('../../../libs/bootstrap/form');

var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;

var computationStatic = {
    conservation: {
        _order: ['phylop7way', 'phylop20way', 'phastconsp7way', 'phastconsp20way', 'gerp', 'siphy'],
        _labels: {'phylop7way': 'phyloP7way', 'phylop20way': 'phyloP20way', 'phastconsp7way': 'phastCons7way', 'phastconsp20way': 'phastCons20way', 'gerp': 'GERP++', 'siphy': 'SiPhy'}
    },
    other_predictors: {
        _order: ['sift', 'polyphen2_hdiv', 'polyphen2_hvar', 'lrt', 'mutationtaster', 'mutationassessor', 'fathmm', 'provean', 'metasvm', 'metalr', 'cadd', 'fathmm_mkl', 'fitcons'],
        _labels: {
            'sift': 'SIFT',
            'polyphen2_hdiv': 'PolyPhen2-HDIV',
            'polyphen2_hvar': 'PolyPhen2-HVAR',
            'lrt': 'LRT',
            'mutationtaster': 'MutationTaster',
            'mutationassessor': 'MutationAssessor',
            'fathmm': 'FATHMM',
            'provean': 'PROVEAN',
            'metasvm': 'MetaSVM',
            'metalr': 'MetaLR',
            'cadd': 'CADD',
            'fathmm_mkl': 'FATHMM-MKL',
            'fitcons': 'fitCons',
        }
    }
};

// Display the curator data of the curation data
var CurationInterpretationComputational = module.exports.CurationInterpretationComputational = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretation: React.PropTypes.object,
        updateInterpretationObj: React.PropTypes.func,
        protocol: React.PropTypes.string
    },

    getInitialState: function() {
        return {
            clinvar_id: null,
            interpretation: this.props.interpretation,
            hasConservationData: false,
            hasOtherPredData: false,
            hasClinVarData: false,
            codonObj: {},
            computationObj: {
                conservation: {
                    phylop7way: null, phylop20way: null, phastconsp7way: null, phastconsp20way: null, gerp: null, siphy: null
                },
                other_predictors: {
                    sift: {score_range: '--', score: null, prediction: null},
                    polyphen2_hdiv: {score_range: '--', score: null, prediction: null},
                    polyphen2_hvar: {score_range: '0 to 1', score: null, prediction: null},
                    lrt: {score_range: '0 to 1', score: null, prediction: null},
                    mutationtaster: {score_range: '0 to 1', score: null, prediction: null},
                    mutationassessor: {score_range: '-0.5135 to 6.49', score: null, prediction: null},
                    fathmm: {score_range: '-16.13 to 10.64', score: null, prediction: null},
                    provean: {score_range: '-14 to +14', score: null, prediction: null},
                    metasvm: {score_range: '-2 to +3', score: null, prediction: null},
                    metalr: {score_range: '0 to 1', score: null, prediction: null},
                    cadd: {score_range: '-7.535 to 35.789', score: null, prediction: null},
                    fathmm_mkl: {score_range: '--', score: null, prediction: null},
                    fitcons: {score_range: '0 to 1', score: null, prediction: null}
                }
            }
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretation: nextProps.interpretation});
        if (nextProps.data && this.props.data) {
            if (!this.state.hasConservationData || !this.state.hasOtherPredData) {
                this.fetchExternalData('myVariantInfo');
            }
            if (!this.state.hasClinVarData) {
                this.fetchExternalData('clinvar');
            }
        }
    },

    componentWillUnmount: function() {
        this.setState({
            hasConservationData: false,
            hasOtherPredData: false,
            hasClinVarData: false
        });
    },

    // Retrieve predictors data from myvariant.info
    fetchExternalData: function(source) {
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
            var found = genomic_chr_mapping.GRCh37.find((entry) => entry.GenomicRefSeq === NC_genomic);
            // Format variant_id for use of myvariant.info REST API
            var variant_id = (hgvs_GRCh37 && found) ? found.ChrFormat + hgvs_GRCh37.slice(hgvs_GRCh37.indexOf(':')) : null;
            if (variant_id && variant_id.indexOf('del') > 0) {
                variant_id = variant_id.substring(0, variant_id.indexOf('del') + 3);
            }
            if (source === 'myVariantInfo') {
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
            } else if (source === 'clinvar') {
                if (variant.clinvarVariantId) {
                    // Get ClinVar data via the parseClinvar method defined in parse-resources.js
                    this.getRestDataXml(this.props.protocol + external_url_map['ClinVarEutils'] + variant.clinvarVariantId).then(xml => {
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
                        this.getRestData(this.props.protocol + external_url_map['ClinVarEsearch'] + 'db=clinvar&term=' + term + '*+%5Bvariant+name%5D+and+' + symbol + '&retmode=json').then(result => {
                            var codonObj = {};
                            codonObj.count = result.esearchresult.count;
                            codonObj.term = term;
                            codonObj.symbol = symbol;
                            this.setState({hasClinVarData: true, codonObj: codonObj});
                        })
                    }).catch(function(e) {
                        console.log('ClinVar Fetch Error=: %o', e);
                    });
                }
            }
        }
    },

    // Method to assign other predictors data to global computation object
    parseOtherPredData: function(response) {
        let computationObj = this.state.computationObj;
        // Not all variants return the dbnsfp{...} object from myvariant.info
        if (response.dbnsfp) {
            let dbnsfp = response.dbnsfp;
            // get scores from dbnsfp
            computationObj.other_predictors.sift.score = parseFloat(dbnsfp.sift.converted_rankscore);
            computationObj.other_predictors.sift.prediction = dbnsfp.sift.pred[0];
            computationObj.other_predictors.polyphen2_hdiv.score = parseFloat(dbnsfp.polyphen2.hdiv.rankscore);
            computationObj.other_predictors.polyphen2_hdiv.prediction = dbnsfp.polyphen2.hdiv.pred;
            computationObj.other_predictors.polyphen2_hvar.score = parseFloat(dbnsfp.polyphen2.hvar.rankscore);
            computationObj.other_predictors.polyphen2_hvar.prediction = dbnsfp.polyphen2.hvar.pred;
            computationObj.other_predictors.lrt.score = parseFloat(dbnsfp.lrt.converted_rankscore);
            computationObj.other_predictors.lrt.prediction = dbnsfp.lrt.pred;
            computationObj.other_predictors.mutationtaster.score = parseFloat(dbnsfp.mutationtaster.converted_rankscore);
            computationObj.other_predictors.mutationtaster.prediction = dbnsfp.mutationtaster.pred[0];
            computationObj.other_predictors.mutationassessor.score = parseFloat(dbnsfp.mutationassessor.rankscore);
            computationObj.other_predictors.mutationassessor.prediction = dbnsfp.mutationassessor.pred;
            computationObj.other_predictors.fathmm.score = parseFloat(dbnsfp.fathmm.rankscore);
            computationObj.other_predictors.fathmm.prediction = dbnsfp.fathmm.pred[0];
            computationObj.other_predictors.provean.score = parseFloat(dbnsfp.provean.rankscore);
            computationObj.other_predictors.provean.prediction = dbnsfp.provean.pred[0];
            computationObj.other_predictors.metasvm.score = parseFloat(dbnsfp.metasvm.rankscore);
            computationObj.other_predictors.metasvm.prediction = dbnsfp.metasvm.pred;
            computationObj.other_predictors.metalr.score = parseFloat(dbnsfp.metalr.rankscore);
            computationObj.other_predictors.metalr.prediction = dbnsfp.metalr.pred;
            computationObj.other_predictors.fathmm_mkl.score = parseFloat(dbnsfp['fathmm-mkl'].coding_rankscore);
            computationObj.other_predictors.fathmm_mkl.prediction = dbnsfp['fathmm-mkl'].coding_pred;
            // update computationObj, and set flag indicating that we have other predictors data
            this.setState({hasOtherPredData: true, computationObj: computationObj});
        }
        if (response.cadd) {
            let cadd = response.cadd;
            computationObj.other_predictors.cadd.score = parseFloat(cadd.consscore);
            //computationObj.other_predictors.cadd.prediction = cadd.pred;
            computationObj.other_predictors.fitcons.score = parseFloat(cadd.fitcons);
            //computationObj.other_predictors.fitcons.prediction = cadd.fitcons.pred;
            // update computationObj, and set flag indicating that we have other predictors data
            this.setState({hasOtherPredData: true, computationObj: computationObj});
        }
    },

    // Method to assign conservation scores data to global computation object
    parseConservationData: function(response) {
        // Not all variants return the dbnsfp{...} object from myvariant.info
        if (response.dbnsfp) {
            let computationObj = this.state.computationObj;
            let dbnsfp = response.dbnsfp;
            // get scores from dbnsfp
            computationObj.conservation.phylop7way = parseFloat(dbnsfp.phylo.p7way.vertebrate_rankscore);
            computationObj.conservation.phylop20way = parseFloat(dbnsfp.phylo.p20way.mammalian_rankscore);
            computationObj.conservation.phastconsp7way = parseFloat(dbnsfp.phastcons['7way'].vertebrate_rankscore);
            computationObj.conservation.phastconsp20way = parseFloat(dbnsfp.phastcons['20way'].mammalian_rankscore);
            computationObj.conservation.gerp = parseFloat(dbnsfp['gerp++'].rs_rankscore);
            computationObj.conservation.siphy = parseFloat(dbnsfp.siphy_29way.logodds_rankscore);
            // update computationObj, and set flag indicating that we have conservation analysis data
            this.setState({hasConservationData: true, computationObj: computationObj});
        }
    },

    // method to render a row of data for the other predictors table
    renderOtherPredRow: function(key, otherPred, otherPredStatic) {
        let rowName = otherPredStatic._labels[key];
        // Both 'source name' and 'score range' have static values
        return (
            <tr key={key}>
                <td>{rowName}</td>
                <td>{otherPred[key].score_range}</td>
                <td>{otherPred[key].score ? otherPred[key].score : '--'}</td>
                <td>{otherPred[key].prediction ? this.mapPredictionName(otherPred[key].prediction) : '--'}</td>
            </tr>
        );
    },

    // Method to map prediction names to their letter codes
    mapPredictionName: function(pred) {
        var name = '';
        let predictionNames = {
            'B': 'B(enign)',
            'D': 'D(amaging)',
            'N': 'N(eutral)',
            'T': 'T(olerated)'
        };
        for (let key in predictionNames) {
            if (key === pred) {
                name = predictionNames[key];
            }
        }
        return name;
    },

    // method to render a row of data for the conservation analysis table
    renderConservationRow: function(key, conservation, conservationStatic) {
        let rowName = conservationStatic._labels[key];
        // 'source name' has static values
        return (
            <tr key={key}>
                <td>{rowName}</td>
                <td>{conservation[key] ? conservation[key] : '--'}</td>
            </tr>
        );
    },

    render: function() {
        var conservationStatic = computationStatic.conservation, otherPredStatic = computationStatic.other_predictors;
        var conservation = (this.state.computationObj && this.state.computationObj.conservation) ? this.state.computationObj.conservation : null;
        var otherPred = (this.state.computationObj && this.state.computationObj.other_predictors) ? this.state.computationObj.other_predictors : null;
        var codon = (this.state.codonObj) ? this.state.codonObj : null;

        return (
            <div className="variant-interpretation computational">
                {(this.state.interpretation) ?
                <div className="row">
                    <div className="col-sm-12">
                        <CurationInterpretationForm formTitle={"Predictors Demo Criteria"} renderedFormContent={comp_crit_1}
                            evidenceType={'computational'} evidenceData={this.state.data} evidenceDataUpdated={true}
                            formDataUpdater={comp_crit_1_update} variantUuid={this.props.data['@id']} criteria={['xbox1', 'xbox2']}
                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                    </div>
                </div>
                : null}

                <div>
                    <h2 className="page-header">Computational Tools</h2>
                    {this.props.data ?
                        <div className="panel panel-info datasource-clingen">
                            <div className="panel-heading"><h3 className="panel-title">ClinGen Predictors</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>Score Range</th>
                                        <th>Score</th>
                                        <th>Prediction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><a href="https://sites.google.com/site/revelgenomics/home" target="_blank">REVEL meta-predictor</a></td>
                                        <td>0 to 1</td>
                                        <td>0.7</td>
                                        <td>higher score = higher pathogenicity</td>
                                    </tr>
                                    <tr>
                                        <td>CFTR</td>
                                        <td>--</td>
                                        <td>--</td>
                                        <td>--</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    :
                        <div className="panel panel-info datasource-clingen">
                            <div className="panel-heading"><h3 className="panel-title">ClinGen Predictors</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <td>No predictors were found for this allele.</td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    }

                    {this.state.hasOtherPredData ?
                        <div className="panel panel-info datasource-other">
                            <div className="panel-heading"><h3 className="panel-title">Other Predictors</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>Score Range</th>
                                        <th>Score</th>
                                        <th>Prediction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {otherPredStatic._order.map(key => {
                                        return (this.renderOtherPredRow(key, otherPred, otherPredStatic));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    :
                        <div className="panel panel-info datasource-other">
                            <div className="panel-heading"><h3 className="panel-title">Other Predictors</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <td>No predictors were found for this allele.</td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    }

                    {this.state.hasConservationData ?
                        <div className="panel panel-info datasource-conservation">
                            <div className="panel-heading"><h3 className="panel-title">Conservation Analysis</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conservationStatic._order.map(key => {
                                        return (this.renderConservationRow(key, conservation, conservationStatic));
                                    })}
                                </tbody>
                            </table>
                        </div>
                    :
                        <div className="panel panel-info datasource-conservation">
                            <div className="panel-heading"><h3 className="panel-title">Conservation Analysis</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <td>No predictors were found for this allele.</td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    }

                    {this.state.hasConservationData ?
                        <div className="panel panel-info datasource-splice">
                            <div className="panel-heading"><h3 className="panel-title">Splice Site Predictors</h3></div>
                            <div className="panel-body">
                                <span className="pull-right">
                                    <a href="http://genes.mit.edu/burgelab/maxent/Xmaxentscan_scoreseq.html" target="_blank">See data in MaxEntScan <i className="icon icon-external-link"></i></a>
                                    <a href="http://www.fruitfly.org/seq_tools/splice.html" target="_blank">See data in NNSPLICE <i className="icon icon-external-link"></i></a>
                                    <a href="http://www.cbcb.umd.edu/software/GeneSplicer/gene_spl.shtml" target="_blank">See data in GeneSplicer <i className="icon icon-external-link"></i></a>
                                    <a href="http://www.umd.be/HSF3/HSF.html" target="_blank">See data in HumanSplicingFinder <i className="icon icon-external-link"></i></a>
                                </span>
                            </div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Source</th>
                                        <th>5' or 3'</th>
                                        <th>Score Range</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td colSpan="4">WT Sequence</td>
                                    </tr>
                                    <tr>
                                        <td>MaxEntScan</td>
                                        <td rowSpan="2" className="row-span">5'</td>
                                        <td>[0-12]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td>NNSPLICE</td>
                                        <td>[0-1]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td>MaxEntScan</td>
                                        <td rowSpan="2" className="row-span">3'</td>
                                        <td>[0-16]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td>NNSPLICE</td>
                                        <td>[0-1]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td colSpan="4">Variant Sequence</td>
                                    </tr>
                                    <tr>
                                        <td>MaxEntScan</td>
                                        <td rowSpan="2" className="row-span">5'</td>
                                        <td>[0-12]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td>NNSPLICE</td>
                                        <td>[0-1]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td>MaxEntScan</td>
                                        <td rowSpan="2" className="row-span">3'</td>
                                        <td>[0-16]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                    <tr>
                                        <td>NNSPLICE</td>
                                        <td>[0-1]</td>
                                        <td><span className="wip">IN PROGRESS</span></td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="4">Average Change to Nearest Splice Site: <span className="splice-avg-change wip">IN PROGRESS</span></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    :
                        <div className="panel panel-info datasource-splice">
                            <div className="panel-heading"><h3 className="panel-title">Splice Site Predictors</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <td>No predictions were found for this allele.</td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    }

                    {this.state.hasConservationData ?
                        <div className="panel panel-info datasource-additional">
                            <div className="panel-heading"><h3 className="panel-title">Additional Information</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Distance to nearest splice site</th>
                                        <th><span className="wip">IN PROGRESS</span></th>
                                    </tr>
                                    <tr>
                                        <th>Exon location</th>
                                        <th><span className="wip">IN PROGRESS</span></th>
                                    </tr>
                                    <tr>
                                        <th>Distance of truncation mutation from end of last exon</th>
                                        <th><span className="wip">IN PROGRESS</span></th>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    :
                        <div className="panel panel-info datasource-additional">
                            <div className="panel-heading"><h3 className="panel-title">Additional Information</h3></div>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <td>No additional information was found for this allele.</td>
                                    </tr>
                                </thead>
                            </table>
                        </div>
                    }

                </div>

                <div>
                    <h2 className="page-header">Other Variants in Codon</h2>
                    <div className="panel panel-info datasource-clinvar">
                        <div className="panel-heading"><h3 className="panel-title">ClinVar Variants</h3></div>
                        <div className="panel-body">
                            {this.state.hasClinVarData && codon ?
                                <dl className="inline-dl clearfix">
                                    <dt>Number of variants at codon: <span className="condon-variant-count">{codon.count}</span></dt>
                                    <dd className="pull-right"><a href={external_url_map['ClinVar'] + '?term=' + codon.term + '*+%5Bvariant+name%5D+and+' + codon.symbol} target="_blank">See data in ClinVar <i className="icon icon-external-link"></i></a></dd>
                                </dl>
                            :
                                <dl className="inline-dl clearfix">
                                    <dd>No ClinVar data was found for this variant.</dd>
                                </dl>
                            }
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="page-header">Repetitive Region</h2>
                    {this.props.data ?
                        <div className="panel panel-info">
                            <div className="panel-heading"><h3 className="panel-title">External resources for this variant</h3></div>
                            <div className="panel-body">
                                <dl className="inline-dl clearfix">
                                    <dd><a href="#" target="_blank">View Variant in UCSC Browser</a></dd>

                                    <dd><a href="#" target="_blank">View Variant in Variation Viewer</a></dd>

                                    <dd><a href="#" target="_blank">View genomic location in ExAC</a></dd>
                                </dl>
                            </div>
                        </div>
                    : null}
                </div>

            </div>
        );
    }
});

// FIXME: all functions below here are examples; references to these in above render() should also be removed
var comp_crit_1 = function() {
    return (
        <div>
            <Input type="checkbox" ref="xbox1-value" label="Predictors Demo Criteria 1?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['xbox1-value'] ? this.state.checkboxes['xbox1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="checkbox" ref="xbox2-value" label="Predictors Demo Criteria 2?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['xbox2-value'] ? this.state.checkboxes['xbox1-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
        </div>
    );
};

var comp_crit_1_update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                if (evaluation.criteria == 'xbox1') {
                    let tempCheckboxes = this.state.checkboxes;
                    tempCheckboxes['xbox1-value'] = evaluation.value === 'true';
                    this.setState({checkboxes: tempCheckboxes});
                }
                if (evaluation.criteria == 'xbox2') {
                    let tempCheckboxes = this.state.checkboxes;
                    tempCheckboxes['xbox2-value'] = evaluation.value === 'true';
                    this.setState({checkboxes: tempCheckboxes});
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
