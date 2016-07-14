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

var panel = require('../../../libs/bootstrap/panel');
var form = require('../../../libs/bootstrap/form');

var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
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
            'metasvm': 'MetaSVM (meta-predictor)',
            'metalr': 'MetaLR (meta-predictor)',
            'cadd': 'CADD (meta-predictor)',
            'fathmm_mkl': 'FATHMM-MKL',
            'fitcons': 'fitCons'
        }
    },
    clingen: {
        _order: ['revel', 'cftr'],
        _labels: {'revel': 'REVEL', 'cftr': 'CFTR'}
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
            hasBustamanteData: false,
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
                },
                clingen: {
                    revel: {score_range: '0 to 1', score: null, prediction: 'higher score = higher pathogenicity', visible: true},
                    cftr: {score_range: '--', score: null, prediction: '--', visible: false}
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
            if (!this.state.hasBustamanteData) {
                this.fetchExternalData('bustemante');
            }
        }
    },

    componentWillUnmount: function() {
        this.setState({
            hasConservationData: false,
            hasOtherPredData: false,
            hasClinVarData: false,
            hasBustamanteData: false
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
                        if (clinvar.protein_change) {
                            var term = clinvar.protein_change.substr(0, clinvar.protein_change.length-1);
                            var symbol = clinvar.gene_symbol;
                            this.getRestData(this.props.protocol + external_url_map['ClinVarEsearch'] + 'db=clinvar&term=' + term + '*+%5Bvariant+name%5D+and+' + symbol + '&retmode=json').then(result => {
                                var codonObj = {};
                                codonObj.count = result.esearchresult.count;
                                codonObj.term = term;
                                codonObj.symbol = symbol;
                                this.setState({hasClinVarData: true, codonObj: codonObj});
                            });
                        }
                    }).catch(function(e) {
                        console.log('ClinVar Fetch Error=: %o', e);
                    });
                }
            } else if (source === 'bustemante') {
                var hgvsObj = {};
                if (variant_id) {
                    this.getRestData(url + variant_id).then(response => {
                        if (response.cadd) {
                            hgvsObj.chrom = (response.cadd.chrom) ? response.cadd.chrom : null;
                            hgvsObj.pos = (response.cadd.pos) ? response.cadd.pos : null;
                            hgvsObj.alt = (response.cadd.alt) ? response.cadd.alt : null;
                            return Promise.resolve(hgvsObj);
                        }
                    }).then(data => {
                        this.getRestData(this.props.protocol + external_url_map['Bustamante'] + data.chrom + '/' + data.pos + '/' + data.alt + '/').then(result => {
                            // Calling method to update global object with bustemante data (e.g. revel)
                            this.parseClingenPredData(response);
                        });
                    }).catch(function(e) {
                        console.log('MyVariant Fetch Error=: %o', e);
                    });
                }
            }
        }
    },

    // Method to assign clingen predictors data to global computation object
    parseClingenPredData: function(response) {
        let computationObj = this.state.computationObj;
        if (response.results) {
            if (response.results.predictions) {
                let predictions = response.results.predictions;
                computationObj.clingen.revel.score = (predictions.revel) ? parseFloat(predictions.revel.score) : null;
                computationObj.clingen.cftr.score = (predictions.CFTR) ? parseFloat(predictions.CFTR.score): null;
                computationObj.clingen.cftr.visible = (predictions.CFTR) ? true : false;
            }
            // update computationObj, and set flag indicating that we have clingen predictors data
            this.setState({hasBustamanteData: true, computationObj: computationObj});
        }
    },

    // Method to assign other predictors data to global computation object
    parseOtherPredData: function(response) {
        let computationObj = this.state.computationObj;
        // Not all variants return the dbnsfp{...} object from myvariant.info
        if (response.dbnsfp) {
            let dbnsfp = response.dbnsfp;
            // get scores from dbnsfp
            computationObj.other_predictors.sift.score = (dbnsfp.sift && dbnsfp.sift.score) ? this.handleScoreObj(dbnsfp.sift.score) : null;
            computationObj.other_predictors.sift.prediction = (dbnsfp.sift && dbnsfp.sift.pred) ? this.handlePredObj(dbnsfp.sift.pred) : null;
            computationObj.other_predictors.polyphen2_hdiv.score = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hdiv.score) ? this.handleScoreObj(dbnsfp.polyphen2.hdiv.score) : null;
            computationObj.other_predictors.polyphen2_hdiv.prediction = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hdiv.pred) ? this.handlePredObj(dbnsfp.polyphen2.hdiv.pred) : null;
            computationObj.other_predictors.polyphen2_hvar.score = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hvar.score) ? this.handleScoreObj(dbnsfp.polyphen2.hvar.score) : null;
            computationObj.other_predictors.polyphen2_hvar.prediction = (dbnsfp.polyphen2 && dbnsfp.polyphen2.hvar.pred) ? this.handlePredObj(dbnsfp.polyphen2.hvar.pred) : null;
            computationObj.other_predictors.lrt.score = (dbnsfp.lrt && dbnsfp.lrt.score) ? this.handleScoreObj(dbnsfp.lrt.score) : null;
            computationObj.other_predictors.lrt.prediction = (dbnsfp.lrt && dbnsfp.lrt.pred) ? this.handlePredObj(dbnsfp.lrt.pred) : null;
            computationObj.other_predictors.mutationtaster.score = (dbnsfp.mutationtaster && dbnsfp.mutationtaster.score) ? this.handleScoreObj(dbnsfp.mutationtaster.score) : null;
            computationObj.other_predictors.mutationtaster.prediction = (dbnsfp.mutationtaster && dbnsfp.mutationtaster.pred) ? this.handlePredObj(dbnsfp.mutationtaster.pred) : null;
            computationObj.other_predictors.mutationassessor.score = (dbnsfp.mutationassessor && dbnsfp.mutationassessor.score) ? this.handleScoreObj(dbnsfp.mutationassessor.score) : null;
            computationObj.other_predictors.mutationassessor.prediction = (dbnsfp.mutationassessor && dbnsfp.mutationassessor.pred) ? this.handlePredObj(dbnsfp.mutationassessor.pred) : null;
            computationObj.other_predictors.fathmm.score = (dbnsfp.fathmm && dbnsfp.fathmm.score) ? this.handleScoreObj(dbnsfp.fathmm.score) : null;
            computationObj.other_predictors.fathmm.prediction = (dbnsfp.fathmm && dbnsfp.fathmm.pred) ? this.handlePredObj(dbnsfp.fathmm.pred) : null;
            computationObj.other_predictors.provean.score = (dbnsfp.provean && dbnsfp.provean.score) ? this.handleScoreObj(dbnsfp.provean.score) : null;
            computationObj.other_predictors.provean.prediction = (dbnsfp.provean && dbnsfp.provean.pred) ? this.handlePredObj(dbnsfp.provean.pred) : null;
            computationObj.other_predictors.metasvm.score = (dbnsfp.metasvm && dbnsfp.metasvm.score) ? this.handleScoreObj(dbnsfp.metasvm.score) : null;
            computationObj.other_predictors.metasvm.prediction = (dbnsfp.metasvm && dbnsfp.metasvm.pred) ? this.handlePredObj(dbnsfp.metasvm.pred) : null;
            computationObj.other_predictors.metalr.score = (dbnsfp.metalr && dbnsfp.metalr.score) ? this.handleScoreObj(dbnsfp.metalr.score) : null;
            computationObj.other_predictors.metalr.prediction = (dbnsfp.metalr && dbnsfp.metalr.pred) ? this.handlePredObj(dbnsfp.metalr.pred) : null;
            computationObj.other_predictors.fathmm_mkl.score = (dbnsfp['fathmm-mkl'] && dbnsfp['fathmm-mkl'].coding_score) ? this.handleScoreObj(dbnsfp['fathmm-mkl'].coding_score) : null;
            computationObj.other_predictors.fathmm_mkl.prediction = (dbnsfp['fathmm-mkl'] && dbnsfp['fathmm-mkl'].coding_pred) ? this.handlePredObj(dbnsfp['fathmm-mkl'].coding_pred) : null;
            computationObj.other_predictors.fitcons.score = (dbnsfp.integrated && dbnsfp.integrated.fitcons_score) ? this.handleScoreObj(dbnsfp.integrated.fitcons_score) : null;
            // update computationObj, and set flag indicating that we have other predictors data
            this.setState({hasOtherPredData: true, computationObj: computationObj});
        }
        if (response.cadd) {
            let cadd = response.cadd;
            computationObj.other_predictors.cadd.score = parseFloat(cadd.rawscore);
            // update computationObj, and set flag indicating that we have other predictors data
            this.setState({hasOtherPredData: true, computationObj: computationObj});
        }
    },

    // Method to convert prediction array to string
    handlePredObj: function(obj) {
        var newArr = [], newStr = '';
        if (Array.isArray(obj)) {
            for (let value of obj.values()) {
                var letterPattern = /^[a-z]+$/i;
                if (value.match(letterPattern)) {
                    newArr.push(value);
                }
            }
            newStr = newArr.join(', ');
        } else {
            newStr = obj;
        }
        return newStr;
    },

    // Method to convert score array to string
    handleScoreObj: function(obj) {
        var newArr = [], newStr = '';
        if (Array.isArray(obj)) {
            for (let value of obj.values()) {
                if (!isNaN(value) && value !== null) {
                    newArr.push(value);
                }
            }
            newStr = newArr.join(', ');
        } else {
            newStr = obj;
        }
        return newStr;
    },

    // Method to assign conservation scores data to global computation object
    parseConservationData: function(response) {
        // Not all variants return the dbnsfp{...} object from myvariant.info
        if (response.dbnsfp) {
            let computationObj = this.state.computationObj;
            let dbnsfp = response.dbnsfp;
            // get scores from dbnsfp
            computationObj.conservation.phylop7way = parseFloat(dbnsfp.phylo.p7way.vertebrate);
            computationObj.conservation.phylop20way = parseFloat(dbnsfp.phylo.p20way.mammalian);
            computationObj.conservation.phastconsp7way = parseFloat(dbnsfp.phastcons['7way'].vertebrate);
            computationObj.conservation.phastconsp20way = parseFloat(dbnsfp.phastcons['20way'].mammalian);
            computationObj.conservation.gerp = parseFloat(dbnsfp['gerp++'].rs);
            computationObj.conservation.siphy = parseFloat(dbnsfp.siphy_29way.logodds);
            // update computationObj, and set flag indicating that we have conservation analysis data
            this.setState({hasConservationData: true, computationObj: computationObj});
        }
    },

    // method to render a row of data for the clingen predictors table
    renderClingenPredRow: function(key, clingenPred, clingenPredStatic) {
        let rowName = clingenPredStatic._labels[key];
        // The 'source name', 'score range' and 'prediction' fields have static values
        if (clingenPred[key].visible === true) {
            return (
                <tr key={key}>
                    <td>{(rowName === 'REVEL') ? <span><a href="https://sites.google.com/site/revelgenomics/about" target="_blank">REVEL</a> (meta-predictor)</span> : rowName}</td>
                    <td>{clingenPred[key].score_range}</td>
                    <td>{clingenPred[key].score ? clingenPred[key].score : 'No data found'}</td>
                    <td>{clingenPred[key].prediction}</td>
                </tr>
            );
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
                <td>{otherPred[key].prediction ? otherPred[key].prediction : '--'}</td>
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
        var conservationStatic = computationStatic.conservation, otherPredStatic = computationStatic.other_predictors, clingenPredStatic = computationStatic.clingen;
        var conservation = (this.state.computationObj && this.state.computationObj.conservation) ? this.state.computationObj.conservation : null;
        var otherPred = (this.state.computationObj && this.state.computationObj.other_predictors) ? this.state.computationObj.other_predictors : null;
        var clingenPred = (this.state.computationObj && this.state.computationObj.clingen) ? this.state.computationObj.clingen : null;
        var codon = (this.state.codonObj) ? this.state.codonObj : null;

        return (
            <div className="variant-interpretation computational">
                <PanelGroup accordion><Panel title="Functional, Conservation, and Splicing Predictors" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                    <div className="row">
                        <div className="col-sm-12">
                            <CurationInterpretationForm renderedFormContent={criteriaGroup1}
                                evidenceType={'computational'} evidenceData={this.state.computationObj} evidenceDataUpdated={true} formChangeHandler={criteriaGroup1Change}
                                formDataUpdater={criteriaGroup1Update} variantUuid={this.props.data['@id']} criteria={['BP4', 'PP3', 'BP7']}
                                interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </div>
                    : null}
                    {clingenPred ?
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
                                    {clingenPredStatic._order.map(key => {
                                        return (this.renderClingenPredRow(key, clingenPred, clingenPredStatic));
                                    })}
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
                                        <th colSpan="4">WT Sequence</th>
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
                                        <th colSpan="4">Variant Sequence</th>
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
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Variants in Same Codon" panelBodyClassName="panel-wide-content" open>
                    <div className="panel panel-info datasource-clinvar">
                        <div className="panel-heading"><h3 className="panel-title">ClinVar Variants</h3></div>
                        <div className="panel-body">
                            {this.state.hasClinVarData && codon ?
                                <dl className="inline-dl clearfix">
                                    <dt>Number of variants in codon: <span className="condon-variant-count">{codon.count}</span></dt>
                                    <dd>(<a href={external_url_map['ClinVar'] + '?term=' + codon.term + '*+%5Bvariant+name%5D+and+' + codon.symbol} target="_blank">See data in ClinVar <i className="icon icon-external-link"></i></a>)</dd>
                                </dl>
                            :
                                <dl className="inline-dl clearfix">
                                    <dd>No ClinVar data was found for this variant.</dd>
                                </dl>
                            }
                        </div>
                    </div>
                    {(this.props.data && this.state.interpretation) ?
                    <div className="row">
                        <div className="col-sm-12">
                            <CurationInterpretationForm renderedFormContent={criteriaGroup2}
                                evidenceType={'computational'} evidenceDataUpdated={true}
                                formDataUpdater={criteriaGroup2Update} variantUuid={this.props.data['@id']} criteriaDisease={['PM5', 'PS1']}
                                interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </div>
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Molecular Consequence: Missense" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                    <div className="row">
                        <div className="col-sm-12">
                            <CurationInterpretationForm renderedFormContent={criteriaGroup3}
                                evidenceType={'computational'} evidenceDataUpdated={true} formChangeHandler={criteriaGroup3Change}
                                formDataUpdater={criteriaGroup3Update} variantUuid={this.props.data['@id']} criteriaDisease={['BP1', 'PP2']}
                                interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </div>
                    : null}
                </Panel></PanelGroup>

                <PanelGroup accordion><Panel title="Molecular Consequence: Inframe indel" panelBodyClassName="panel-wide-content" open>
                    {(this.props.data && this.state.interpretation) ?
                    <div className="row">
                        <div className="col-sm-12">
                            <CurationInterpretationForm renderedFormContent={criteriaGroup4}
                                evidenceType={'computational'} evidenceDataUpdated={true}
                                formDataUpdater={criteriaGroup4Update} variantUuid={this.props.data['@id']} criteria={['BP3', 'PM4']}
                                interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj} />
                        </div>
                    </div>
                    : null}
                </Panel></PanelGroup>

            </div>
        );
    }
});

// code for rendering of computational tab interpretation forms, first group:
// functional, conservation, and splicing predictors
var criteriaGroup1 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP4:</strong> Multiple lines of computational evidence suggest no impact on gene or gene product (conservation, evolutionary, splicing impact, etc.)
                    <br /><br />
                    <strong>PP3:</strong> Multiple lines of computational evidence support a deleterious effect on the gene or gene product (conservation, evolutionary, splicing impact, etc.)
                </p>
            </div>
            <Input type="checkbox" ref="BP4-value" label="BP4 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP4-value'] ? this.state.checkboxes['BP4-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-8 col-sm-offset-4 input-note-below-no-bottom">- or -</p>
            <Input type="checkbox" ref="PP3-value" label="PP3 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PP3-value'] ? this.state.checkboxes['PP3-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP4-description" label="Explain criteria selection:" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <Input type="textarea" ref="PP3-description" label="Explain criteria selection (PP3):" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP7:</strong> A synonymous (silent) variant for which splicing prediction algorithms predict no impact to the splice site consensus sequence nor the creation of a new splice site AND the nucleotide is not highly conserved
                </p>
            </div>
            <Input type="checkbox" ref="BP7-value" label={<span>BP7 met?:</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP7-value'] ? this.state.checkboxes['BP7-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP7-description" label="Explain criteria selection:" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup1Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'BP4':
                        tempCheckboxes['BP4-value'] = evaluation.value === 'true';
                        this.refs['BP4-description'].setValue(evaluation.description);
                        break;
                    case 'PP3':
                        tempCheckboxes['PP3-value'] = evaluation.value === 'true';
                        this.refs['PP3-description'].setValue(evaluation.description);
                        break;
                    case 'BP7':
                        tempCheckboxes['BP7-value'] = evaluation.value === 'true';
                        this.refs['BP7-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for handling logic within the form
var criteriaGroup1Change = function(ref, e) {
    // BP4 and PP3 are exclusive. The following is to ensure that if one of the checkboxes
    // are checked, the other is un-checked
    if (ref === 'BP4-value' || ref === 'PP3-value') {
        let tempCheckboxes = this.state.checkboxes,
            altCriteriaValue = 'PP3-value';
        if (ref === 'PP3-value') {
            altCriteriaValue = 'BP4-value';
        }
        if (this.state.checkboxes[ref]) {
            tempCheckboxes[altCriteriaValue] = false;
            this.setState({checkboxes: tempCheckboxes});
        }
    }
    // Since BP4 and PP3 'share' the same description box, and the user only sees the BP4 box,
    // the following is to update the value in the PP3 box to contain the same data on
    // saving of the evaluation. Handles changes going the other way, too, just in case (although
    // this should never happen)
    if (ref === 'BP4-description' || ref === 'PP3-description') {
        let altCriteriaDescription = 'PP3-description';
        if (ref === 'PP3-description') {
            altCriteriaDescription = 'BP4-description';
        }
        this.refs[altCriteriaDescription].setValue(this.refs[ref].getValue());
    }
};

// code for rendering of computational tab interpretation forms, second group:
// alternate changes in codon
var criteriaGroup2 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>PM5:</strong> Novel missense change at an amino acid residue where a different missense change determined to be pathogenic has not been seen before
                </p>
            </div>
            <Input type="checkbox" ref="PM5-value" label={<span>PM5 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PM5-value'] ? this.state.checkboxes['PM5-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="PM5-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>PS1:</strong> Same amino acid change as a previously established pathogenic variant regardless of nucleotide change
                </p>
            </div>
            <Input type="checkbox" ref="PS1-value" label={<span>PS1 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PS1-value'] ? this.state.checkboxes['PS1-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="PS1-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup2Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'PM5':
                        tempCheckboxes['PM5-value'] = evaluation.value === 'true';
                        this.refs['PM5-description'].setValue(evaluation.description);
                        break;
                    case 'PS1':
                        tempCheckboxes['PS1-value'] = evaluation.value === 'true';
                        this.refs['PS1-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for rendering of computational tab interpretation forms, third group:
// missense variants
var criteriaGroup3 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP1:</strong> Missense variant in a gene for which primarily truncating variants are known to cause disease

                    <br /><br />
                    <strong>PP2:</strong> Missense variant in a gene that has a low rate of benign missense variation and in which missense variants are a common mechanism of disease
                </p>
            </div>
            <Input type="checkbox" ref="BP1-value" label={<span>BP1 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP1-value'] ? this.state.checkboxes['BP1-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <p className="col-sm-8 col-sm-offset-4 input-note-below-no-bottom">- or -</p>
            <Input type="checkbox" ref="PP2-value" label={<span>PP2 met?:<br />(Disease dependent)</span>} handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PP2-value'] ? this.state.checkboxes['PP2-value'] : false} inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP1-description" label="Explain criteria selection:" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <Input type="textarea" ref="PP2-description" label="Explain criteria selection (PP2):" rows="5" inputDisabled={!this.state.diseaseAssociated}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="hidden" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup3Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'BP1':
                        tempCheckboxes['BP1-value'] = evaluation.value === 'true';
                        this.refs['BP1-description'].setValue(evaluation.description);
                        break;
                    case 'PP2':
                        tempCheckboxes['PP2-value'] = evaluation.value === 'true';
                        this.refs['PP2-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};

// code for handling logic within the form
var criteriaGroup3Change = function(ref, e) {
    // BP1 and PP2 are exclusive. The following is to ensure that if one of the checkboxes
    // are checked, the other is un-checked
    if (ref === 'BP1-value' || ref === 'PP2-value') {
        let tempCheckboxes = this.state.checkboxes,
            altCriteriaValue = 'PP2-value';
        if (ref === 'PP2-value') {
            altCriteriaValue = 'BP1-value';
        }
        if (this.state.checkboxes[ref]) {
            tempCheckboxes[altCriteriaValue] = false;
            this.setState({checkboxes: tempCheckboxes});
        }
    }
    // Since BP1 and PP2 'share' the same description box, and the user only sees the BP4 box,
    // the following is to update the value in the PP2 box to contain the same data on
    // saving of the evaluation. Handles changes going the other way, too, just in case (although
    // this should never happen)
    if (ref === 'BP1-description' || ref === 'PP2-description') {
        let altCriteriaDescription = 'PP2-description';
        if (ref === 'PP2-description') {
            altCriteriaDescription = 'BP1-description';
        }
        this.refs[altCriteriaDescription].setValue(this.refs[ref].getValue());
    }
};

// code for rendering of computational tab interpretation forms, third group:
// repetetive regions
var criteriaGroup4 = function() {
    return (
        <div>
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>BP3:</strong> In-frame deletions/insertions in a repetitive region without a known function
                </p>
            </div>
            <Input type="checkbox" ref="BP3-value" label="BP3 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['BP3-value'] ? this.state.checkboxes['BP3-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="BP3-description" label="Explain criteria selection:" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
            <div className="col-sm-7 col-sm-offset-5 input-note-top">
                <p className="alert alert-info">
                    <strong>PM4:</strong> Protein length changes as a result of in-frame deletions/insertions in a nonrepeat region or stop-loss variant
                </p>
            </div>
            <Input type="checkbox" ref="PM4-value" label="PM4 met?:" handleChange={this.handleCheckboxChange}
                checked={this.state.checkboxes['PM4-value'] ? this.state.checkboxes['PM4-value'] : false}
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" />
            <Input type="textarea" ref="PM4-description" label="Explain criteria selection:" rows="5"
                labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group" handleChange={this.handleFormChange} />
        </div>
    );
};

// code for updating the form values of computational tab interpretation forms upon receiving
// existing interpretations and evaluations
var criteriaGroup4Update = function(nextProps) {
    if (nextProps.interpretation) {
        if (nextProps.interpretation.evaluations && nextProps.interpretation.evaluations.length > 0) {
            nextProps.interpretation.evaluations.map(evaluation => {
                var tempCheckboxes = this.state.checkboxes;
                switch(evaluation.criteria) {
                    case 'BP3':
                        tempCheckboxes['BP3-value'] = evaluation.value === 'true';
                        this.refs['BP3-description'].setValue(evaluation.description);
                        break;
                    case 'PM4':
                        tempCheckboxes['PM4-value'] = evaluation.value === 'true';
                        this.refs['PM4-description'].setValue(evaluation.description);
                        break;
                }
                this.setState({checkboxes: tempCheckboxes, submitDisabled: false});
            });
        }
    }
};
