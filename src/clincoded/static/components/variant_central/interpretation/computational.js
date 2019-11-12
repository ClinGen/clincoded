'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import { RestMixin } from '../../rest';
import { parseClinvar } from '../../../libs/parse-resources';
import { queryKeyValue, editQueryValue, dbxref_prefix_map, external_url_map } from '../../globals';
import { setContextLinks } from './shared/externalLinks';
import { renderDataCredit } from './shared/credit';
import { showActivityIndicator } from '../../activity_indicator';
import { Form, FormMixin, Input } from '../../../libs/bootstrap/form';
import { PanelGroup, Panel } from '../../../libs/bootstrap/panel';
import { findDiffKeyValuesMixin } from './shared/find_diff';
import { CompleteSection } from './shared/complete_section';
import { parseAndLogError } from '../../mixins';
import { parseKeyValue } from '../helpers/parse_key_value';
import PopOverComponent from '../../../libs/bootstrap/popover';
import { scrollElementIntoView } from '../../../libs/helpers/scroll_into_view';

const vciFormHelper = require('./shared/form');
const CurationInterpretationForm = vciFormHelper.CurationInterpretationForm;
const genomic_chr_mapping = require('./mapping/NC_genomic_chr_format.json');
const evaluation_section_mapping = require('./mapping/evaluation_section.json');
const extraEvidence = require('./shared/extra_evidence');

const validTabs = ['missense', 'lof', 'silent-intron', 'indel'];

const computationStatic = {
    conservation: {
        _order: ['phylop7way', 'phylop20way', 'phastconsp7way', 'phastconsp20way', 'gerp', 'siphy'],
        _labels: {'phylop7way': 'phyloP100way', 'phylop20way': 'phyloP30way', 'phastconsp7way': 'phastCons100way', 'phastconsp20way': 'phastCons30way', 'gerp': 'GERP++', 'siphy': 'SiPhy'},
        _url: {
            'phylop7way': 'http://compgen.cshl.edu/phast/index.php',
            'phylop20way': 'http://compgen.cshl.edu/phast/index.php',
            'phastconsp7way': 'http://compgen.cshl.edu/phast/index.php',
            'phastconsp20way': 'http://compgen.cshl.edu/phast/index.php',
            'gerp': 'http://mendel.stanford.edu/SidowLab/downloads/gerp/',
            'siphy': 'http://portals.broadinstitute.org/genome_bio/siphy/index.html'
        }
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
            'fitcons': 'fitCons'
        },
        _type: {
            'metasvm': ' (meta-predictor)',
            'metalr': ' (meta-predictor)',
            'cadd': ' (meta-predictor)'
        },
        _url: {
            'sift': 'http://sift.bii.a-star.edu.sg/',
            'polyphen2_hdiv': 'http://genetics.bwh.harvard.edu/pph2/',
            'polyphen2_hvar': 'http://genetics.bwh.harvard.edu/pph2/',
            'lrt': 'http://www.genetics.wustl.edu/jflab/lrt_query.html',
            'mutationtaster': 'http://www.mutationtaster.org/',
            'mutationassessor': 'http://mutationassessor.org/',
            'fathmm': 'http://fathmm.biocompute.org.uk/',
            'provean': 'http://provean.jcvi.org/index.php',
            'metasvm': 'https://sites.google.com/site/jpopgen/dbNSFP',
            'metalr': 'https://sites.google.com/site/jpopgen/dbNSFP',
            'cadd': 'http://cadd.gs.washington.edu/',
            'fathmm_mkl': 'http://fathmm.biocompute.org.uk/',
            'fitcons': 'http://compgen.bscb.cornell.edu/fitCons/'
        },
        _pathoThreshold: {
            'sift': '<0.049',
            'polyphen2_hdiv': '--',
            'polyphen2_hvar': '>0.447',
            'lrt': '--',
            'mutationtaster': '>0.5',
            'mutationassessor': '>1.935',
            'fathmm': '<-1.51',
            'provean': '<-2.49',
            'metasvm': '>0',
            'metalr': '>0.5',
            'cadd': '>19 (inferred)',
            'fathmm_mkl': '--',
            'fitcons': '--'
        }
    },
    clingen: {
        _order: ['revel', 'cftr'],
        _labels: {'revel': 'REVEL', 'cftr': 'CFTR'},
        _type: {
            'revel': ' (meta-predictor)'
        },
        _url: {
            'revel': 'https://sites.google.com/site/revelgenomics/about'
        },
        _pathoThreshold: {
            'revel': '>0.75',
            'cftr': '--'
        }
    }
};

// Display the curator data of the curation data
var CurationInterpretationComputational = module.exports.CurationInterpretationComputational = createReactClass({
    mixins: [RestMixin, findDiffKeyValuesMixin],

    propTypes: {
        session: PropTypes.object,
        data: PropTypes.object, // ClinVar data payload
        interpretation: PropTypes.object,
        updateInterpretationObj: PropTypes.func,
        href_url: PropTypes.object,
        ext_myVariantInfo: PropTypes.object,
        ext_clinVarEsearch: PropTypes.object,
        ext_singleNucleotide: PropTypes.bool,
        loading_myVariantInfo: PropTypes.bool,
        loading_clinvarEsearch: PropTypes.bool,
        affiliation: PropTypes.object,
        selectedSubtab: PropTypes.string,
        selectedCriteria: PropTypes.string,
        getSelectedSubTab: PropTypes.func
    },

    getInitialState: function() {
        return {
            data: this.props.data,
            clinvar_id: null,
            interpretation: this.props.interpretation,
            hasConservationData: false,
            hasOtherPredData: false,
            selectedSubtab: this.props.selectedSubtab,
            selectedCriteria: this.props.selectedCriteria,
            codonObj: {},
            computationObj: {
                conservation: {
                    phylop7way: null, phylop20way: null, phastconsp7way: null, phastconsp20way: null, gerp: null, siphy: null
                },
                other_predictors: {
                    sift: {score_range: '--', score: null, prediction: null},
                    polyphen2_hdiv: {score_range: '0 to 1', score: null, prediction: null},
                    polyphen2_hvar: {score_range: '0 to 1', score: null, prediction: null},
                    lrt: {score_range: '0 to 1', score: null, prediction: null},
                    mutationtaster: {score_range: '0 to 1', score: null, prediction: null},
                    mutationassessor: {score_range: '-0.5135 to 6.49', score: null, prediction: null},
                    fathmm: {score_range: '-16.13 to 10.64', score: null, prediction: null},
                    provean: {score_range: '-14 to +14', score: null, prediction: null},
                    metasvm: {score_range: '-2 to +3', score: null, prediction: null},
                    metalr: {score_range: '0 to 1', score: null, prediction: null},
                    cadd: {score_range: '-7.535 to 35.789', score: null, prediction: 'higher score = higher pathogenicity'},
                    fathmm_mkl: {score_range: '--', score: null, prediction: null},
                    fitcons: {score_range: '0 to 1', score: null, prediction: 'higher score = higher pathogenicity'}
                },
                clingen: {
                    revel: {score_range: '0 to 1', score: null, prediction: 'higher score = higher pathogenicity', visible: true},
                    cftr: {score_range: '0 to 1', score: null, prediction: 'higher score = higher pathogenicity', visible: false}
                }
            },
            computationObjDiff: null,
            computationObjDiffFlag: false,
            ext_singleNucleotide: this.props.ext_singleNucleotide,
            loading_myVariantInfo: this.props.loading_myVariantInfo,
            loading_clinvarEsearch: this.props.loading_clinvarEsearch
        };
    },

    componentDidMount: function() {
        if (this.props.data) {
            this.setState({data: this.props.data});
        }
        if (this.props.interpretation) {
            this.setState({interpretation: this.props.interpretation});
        }
        if (this.props.ext_myVariantInfo) {
            this.parseOtherPredData(this.props.ext_myVariantInfo);
            this.parseConservationData(this.props.ext_myVariantInfo);
            this.parseClingenPredData(this.props.ext_myVariantInfo);
        }
        if (this.props.ext_clinVarEsearch) {
            var codonObj = {};
            codonObj.count = parseInt(this.props.ext_clinVarEsearch.esearchresult.count);
            codonObj.term = this.props.ext_clinVarEsearch.vci_term;
            codonObj.symbol = this.props.ext_clinVarEsearch.vci_symbol;
            this.setState({codonObj: codonObj});
        }
        if (this.state.interpretation && this.state.interpretation.evaluations) {
            this.compareExternalDatas(this.state.computationObj, this.state.interpretation.evaluations);
        }
        if (this.state.selectedSubtab && this.state.selectedCriteria) {
            setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({data: nextProps.data, interpretation: nextProps.interpretation});
        // update data based on api call results
        if (nextProps.ext_myVariantInfo) {
            this.parseOtherPredData(nextProps.ext_myVariantInfo);
            this.parseConservationData(nextProps.ext_myVariantInfo);
            this.parseClingenPredData(nextProps.ext_myVariantInfo);
        }
        if (nextProps.ext_clinVarEsearch) {
            var codonObj = {};
            codonObj.count = parseInt(nextProps.ext_clinVarEsearch.esearchresult.count);
            codonObj.term = nextProps.ext_clinVarEsearch.vci_term;
            codonObj.symbol = nextProps.ext_clinVarEsearch.vci_symbol;
            this.setState({codonObj: codonObj});
        }
        if (nextProps.interpretation && nextProps.interpretation.evaluations) {
            this.compareExternalDatas(this.state.computationObj, nextProps.interpretation.evaluations);
        }
        if (nextProps.selectedSubtab) {
            this.setState({selectedSubtab: nextProps.selectedSubtab}, () => {
                if (nextProps.selectedCriteria) {
                    this.setState({selectedCriteria: nextProps.selectedCriteria}, () => {
                        setTimeout(scrollElementIntoView(evaluation_section_mapping[this.state.selectedCriteria], 'class'), 200);
                    });
                }
            });
        }
        this.setState({
            ext_singleNucleotide: nextProps.ext_singleNucleotide,
            loading_myVariantInfo: nextProps.loading_myVariantInfo,
            loading_clinvarEsearch: nextProps.loading_clinvarEsearch
        });
    },

    componentWillUnmount: function() {
        window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'subtab', null));
        this.setState({
            hasConservationData: false,
            hasOtherPredData: false
        });
    },

    // function to compare current external data with external data saved with a previous interpretation
    compareExternalDatas: function(newData, savedEvals) {
        for (var i in savedEvals) {
            if (['BP1', 'PP2', 'PP3', 'BP4'].indexOf(savedEvals[i].criteria) > -1) {
                var tempCompare = this.findDiffKeyValues(newData, savedEvals[i].computational.computationalData);
                this.setState({computationObjDiff: tempCompare[0], computationObjDiffFlag: tempCompare[1]});
                break;
            }
        }
    },

    /**
     * Method to assign clingen predictors data to global computation object
     * REVEL data is now parsed from myvariant.info response
     * It can be accessed via response['dbnsfp']['revel'] or using
     * the 'parseKeyValue()' helper function which traverse the tree down to 2nd level
     * 
     * TBD on where the CFTR data is queried from after Bustamante lab is no longer the source
     * And thus the CFTR data parsing in this method needs to be altered in the future
     * 
     * @param {object} response - The response object returned by myvariant.info
     */
    parseClingenPredData: function(response) {
        let computationObj = this.state.computationObj;
        let revel = parseKeyValue(response, 'revel'),
            cftr = parseKeyValue(response, 'cftr');
        if (revel) {
            computationObj.clingen.revel.score = (revel.score) ? this.numToString(revel.score) : null;
        }
        if (cftr) {
            computationObj.clingen.cftr.score = (cftr.score) ? this.numToString(cftr.score): null;
            computationObj.clingen.cftr.visible = (cftr.score) ? true : false;
        }
        // update computationObj, and set flag indicating that we have clingen predictors data
        this.setState({computationObj: computationObj});
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
            computationObj.other_predictors.cadd.score = this.numToString(cadd.rawscore);
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

    // Method to convert score value to array of numbers
    handleScoreObj: function(obj) {
        let newArr = [];
        if (Array.isArray(obj)) {
            for (let value of obj.values()) {
                if (!isNaN(value) && value !== null) {
                    newArr.push(Number(value));
                }
            }
        } else {
            if (!isNaN(obj) && obj !== null) {
                newArr = [Number(obj)];
            }
        }
        return newArr;
    },

    // Method to assign conservation scores data to global computation object
    parseConservationData: function(response) {
        // Not all variants return the dbnsfp{...} object from myvariant.info
        if (response.dbnsfp) {
            let computationObj = this.state.computationObj;
            let dbnsfp = response.dbnsfp;
            // get scores from dbnsfp
            computationObj.conservation.phylop7way = (dbnsfp.phylo.p7way) ? this.numToString(dbnsfp.phylo.p7way.vertebrate) : this.numToString(dbnsfp.phylo.p100way.vertebrate);
            computationObj.conservation.phylop20way = (dbnsfp.phylo.p20way) ? this.numToString(dbnsfp.phylo.p20way.mammalian) : this.numToString(dbnsfp.phylo.p30way.mammalian);
            computationObj.conservation.phastconsp7way = (dbnsfp.phastcons['7way']) ? this.numToString(dbnsfp.phastcons['7way'].vertebrate) : this.numToString(dbnsfp.phastcons['100way'].vertebrate);
            computationObj.conservation.phastconsp20way = (dbnsfp.phastcons['20way']) ? this.numToString(dbnsfp.phastcons['20way'].mammalian) : this.numToString(dbnsfp.phastcons['30way'].mammalian);
            computationObj.conservation.gerp = this.numToString(dbnsfp['gerp++'].rs);
            computationObj.conservation.siphy = this.numToString(dbnsfp.siphy_29way.logodds);
            // update computationObj, and set flag indicating that we have conservation analysis data
            this.setState({hasConservationData: true, computationObj: computationObj});
        }
    },

    // Method to handle conservation scores
    numToString: function(num) {
        let result;
        if (num !== '' && num !== null) {
            let score = parseFloat(num);
            result = (!isNaN(score)) ? score.toString() : null;
        }
        return result;
    },

    // method to render a row of data for the clingen predictors table
    renderClingenPredRow: function(key, clingenPred, clingenPredStatic) {
        let rowName = clingenPredStatic._labels[key];
        // The 'source name', 'score range' and 'prediction' fields have static values
        if (clingenPred[key].visible === true) {
            return (
                <tr key={key}>
                    <td>
                        {clingenPredStatic._url[key] ?
                            <span><a href={clingenPredStatic._url[key]} target="_blank" rel="noopener noreferrer">{rowName}</a>{clingenPredStatic._type[key]}</span>
                            :
                            <span>{rowName + clingenPredStatic._type[key]}</span>
                        }
                    </td>
                    <td>{clingenPred[key].score_range}</td>
                    <td>{clingenPred[key].score ? clingenPred[key].score : 'No data found'}</td>
                    <td>{clingenPredStatic._pathoThreshold[key]}</td>
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
                <td>
                    {otherPredStatic._url[key] ?
                        <span><a href={otherPredStatic._url[key]} target="_blank" rel="noopener noreferrer">{rowName}</a>{otherPredStatic._type[key]}</span>
                        :
                        <span>{rowName + otherPredStatic._type[key]}</span>
                    }
                </td>
                <td>{otherPred[key].score_range}</td>
                <td>{otherPred[key].score ? (Array.isArray(otherPred[key].score) ? otherPred[key].score.join(', ') : otherPred[key].score) : '--'}</td>
                <td>{otherPredStatic._pathoThreshold[key]}</td>
                <td>{otherPred[key].prediction ? otherPred[key].prediction : '--'}</td>
            </tr>
        );
    },

    // method to render a row of data for the conservation analysis table
    renderConservationRow: function(key, conservation, conservationStatic) {
        let rowName = conservationStatic._labels[key];
        // 'source name' has static values
        return (
            <tr key={key}>
                <td>
                    {conservationStatic._url[key] ?
                        <a href={conservationStatic._url[key]} target="_blank" rel="noopener noreferrer">{rowName}</a>
                        :
                        rowName
                    }
                </td>
                <td>{conservation[key] ? conservation[key] : '--'}</td>
            </tr>
        );
    },

    // set selectedSubtab to whichever tab the user switches to, and update the address accordingly
    handleSubtabSelect: function (subtab) {
        if (subtab == 'missense' || validTabs.indexOf(subtab) == -1) {
            this.setState({selectedSubtab: 'missense'}, () => this.props.getSelectedSubTab(this.state.selectedSubtab));
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'subtab', null));
        } else {
            this.setState({selectedSubtab: subtab}, () => this.props.getSelectedSubTab(this.state.selectedSubtab));
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'subtab', subtab));
        }
        // Remove the criteria param whenever the subtab is changed
        if (queryKeyValue('criteria', window.location.href)) {
            window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'criteria', ''));
        }
    },

    // Method to temporarily render other variant count in same codon and link out to clinvar
    renderVariantCodon: function(variant, codon) {
        if (variant && variant.clinvarVariantId) {
            if (codon.term) {
                if (codon.count > 0) {
                    if (codon.count > 1) {
                        // Esearch returns more than 1 counts from ClinVar
                        return (
                            <dl className="inline-dl clearfix">
                                <dt>Additional ClinVar variants found in the same codon: <span className="condon-variant-count">{codon.count-1}</span></dt>
                                <dd>(<a href={external_url_map['ClinVar'] + '?term=' + codon.term + '+%5Bvariant+name%5D+and+' + codon.symbol} target="_blank">Search ClinVar for variants in this codon</a>)</dd>
                            </dl>
                        );
                    } else {
                        // Esearch returns 1 count from ClinVar
                        return (
                            <dl className="inline-dl clearfix">
                                <dd>The current variant is the only variant found in this codon in ClinVar.</dd>
                            </dl>
                        );
                    }
                } else {
                    // Esearch returns 0 count from ClinVar
                    return (
                        <dl className="inline-dl clearfix">
                            <dd>No variants have been found in this codon in ClinVar.</dd>
                        </dl>
                    );
                }
            } else {
                // Variant exists in ClinVar but has no <ProteinChange> data (e.g. amino acid, location)
                return (
                    <dl className="inline-dl clearfix">
                        <dd>The current variant is in a non-coding region.</dd>
                    </dl>
                );
            }
        } else {
            // Variant does not exist in ClinVar
            return (
                <dl className="inline-dl clearfix">
                    <dd>ClinVar search for this variant is currently not available.</dd>
                </dl>
            );
        }
    },

    renderCriteriaEvalNote() {
        return (
            <span><i className="icon icon-info-circle"></i> ExAC Constraint Scores displayed on the Gene-centric tab</span>
        );
    },

    renderCriteriaEvalLink() {
        return (
            <span>
                <a href="https://www.clinicalgenome.org/working-groups/sequence-variant-interpretation/" target="_blank" rel="noopener noreferrer">
                    Sequence Variant Interpretation (SVI) Working Group guidance
                </a>
            </span>
        );
    },

    render: function() {
        var conservationStatic = computationStatic.conservation, otherPredStatic = computationStatic.other_predictors, clingenPredStatic = computationStatic.clingen;
        var conservation = (this.state.computationObj && this.state.computationObj.conservation) ? this.state.computationObj.conservation : null;
        var otherPred = (this.state.computationObj && this.state.computationObj.other_predictors) ? this.state.computationObj.other_predictors : null;
        var clingenPred = (this.state.computationObj && this.state.computationObj.clingen) ? this.state.computationObj.clingen : null;
        var codon = (this.state.codonObj) ? this.state.codonObj : null;
        var computationObjDiffFlag = this.state.computationObjDiffFlag;
        var singleNucleotide = this.state.ext_singleNucleotide;

        var variant = this.state.data;
        var gRCh38 = null;
        var gRCh37 = null;
        var links_38 = null;
        var links_37 = null;
        if (variant && variant.hgvsNames) {
            gRCh38 = variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : (variant.hgvsNames.gRCh38 ? variant.hgvsNames.gRCh38 : null);
            gRCh37 = variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : (variant.hgvsNames.gRCh37 ? variant.hgvsNames.gRCh37 : null);
        }
        if (gRCh38) {
            links_38 = setContextLinks(gRCh38, 'GRCh38');
        }
        if (gRCh37) {
            links_37 = setContextLinks(gRCh37, 'GRCh37');
        }
        const affiliation = this.props.affiliation, session = this.props.session;

        return (
            <div className="variant-interpretation computational">
                <ul className="vci-tabs-header tab-label-list vci-subtabs" role="tablist">
                    <li className="tab-label col-sm-3" role="tab" onClick={() => this.handleSubtabSelect('missense')} aria-selected={this.state.selectedSubtab == 'missense'}>Missense</li>
                    <li className="tab-label col-sm-3" role="tab" onClick={() => this.handleSubtabSelect('lof')} aria-selected={this.state.selectedSubtab == 'lof'}>Loss of Function</li>
                    <li className="tab-label col-sm-3" role="tab" onClick={() => this.handleSubtabSelect('silent-intron')} aria-selected={this.state.selectedSubtab == 'silent-intron'}>Silent & Intron</li>
                    <li className="tab-label col-sm-3" role="tab" onClick={() => this.handleSubtabSelect('indel')} aria-selected={this.state.selectedSubtab == 'indel'}>In-frame Indel</li>
                </ul>
                {this.state.selectedSubtab == '' || this.state.selectedSubtab == 'missense' ?
                    <div role="tabpanel" className="tab-panel">
                        <PanelGroup accordion><Panel title="Functional, Conservation, and Splicing Predictors" panelBodyClassName="panel-wide-content"
                            panelClassName="tab-predictors-panel-functional-conservation-splicing-predictors" open>
                            {(this.state.data && this.state.interpretation) ?
                                <div className="row">
                                    <div className="col-sm-12">
                                        <CurationInterpretationForm renderedFormContent={criteriaMissense1}
                                            evidenceData={this.state.computationObj} evidenceDataUpdated={computationObjDiffFlag}
                                            formDataUpdater={criteriaMissense1Update} variantUuid={variant['@id']}
                                            criteria={['BP1', 'PP2', 'PP3', 'BP4']} criteriaCrossCheck={[['BP1', 'PP2'], ['PP3', 'BP4']]}
                                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                            affiliation={affiliation} session={session} criteriaEvalNote={this.renderCriteriaEvalNote} />
                                    </div>
                                </div>
                                : null}
                            {computationObjDiffFlag ?
                                <div className="row">
                                    <p className="alert alert-warning">
                                        <strong>Notice:</strong> Some of the data retrieved below has changed since the last time you evaluated these criteria. Please update your evaluation as needed.
                                    </p>
                                </div>
                                : null}
                            <div className="panel panel-info datasource-clingen">
                                <div className="panel-heading"><h3 className="panel-title">ClinGen Predictors</h3></div>
                                <div className="panel-content-wrapper">
                                    {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                                    {!singleNucleotide ?
                                        <div className="panel-body"><span>These predictors only return data for missense variants.</span></div>
                                        :
                                        <div>
                                            {clingenPred ?
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Source</th>
                                                            <th>Score Range</th>
                                                            <th>Score</th>
                                                            <th>Impact Threshold</th>
                                                            <th>Prediction</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {clingenPredStatic._order.map(key => {
                                                            return (this.renderClingenPredRow(key, clingenPred, clingenPredStatic));
                                                        })}
                                                    </tbody>
                                                </table>
                                                :
                                                <div className="panel-body"><span>No predictor data found for this allele.</span></div>
                                            }
                                        </div>
                                    }
                                </div>
                            </div>
                            <div className="panel panel-info datasource-other">
                                <div className="panel-heading">
                                    <h3 className="panel-title">Other Predictors
                                        <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                                    </h3>
                                </div>
                                <div className="panel-content-wrapper">
                                    {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                                    {!singleNucleotide ?
                                        <div className="panel-body"><span>Data is currently only returned for single nucleotide variants.</span></div>
                                        :
                                        <div>
                                            {this.state.hasOtherPredData ?
                                                <table className="table">
                                                    <thead>
                                                        <tr>
                                                            <th>Source</th>
                                                            <th>Score Range</th>
                                                            <th>Score</th>
                                                            <th>Impact Threshold</th>
                                                            <th>Prediction
                                                                <PopOverComponent popOverWrapperClass="popover-predictors-prediction-help"
                                                                    popOverStyleClass="prediction-help-window" actuatorTitle={<span className="icon icon-info-circle"></span>}
                                                                    popOverRef={ref => (this.popover = ref)}>
                                                                    <table className="table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th className="predictor-column">Predictor</th>
                                                                                <th className="letter-code-column">Letter Code</th>
                                                                                <th className="prediction-column">Prediction</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td rowSpan="2" className="predictor-column">SIFT</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">T</td>
                                                                                <td className="prediction-column">Tolerated</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="3" className="predictor-column">PolyPhen2-HDIV<br/><br/>PolyPhen2-HVAR</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">probably Damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">P</td>
                                                                                <td className="prediction-column">Possibly damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">B</td>
                                                                                <td className="prediction-column">Benign</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="3" className="predictor-column">LRT</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Deleterious</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">N</td>
                                                                                <td className="prediction-column">Neutral</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">U</td>
                                                                                <td className="prediction-column">Unknown</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="4" className="predictor-column">MutationTaster</td>
                                                                                <td className="letter-code-column">A</td>
                                                                                <td className="prediction-column">disease causing Automatic</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Disease causing</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">P</td>
                                                                                <td className="prediction-column">Polymorphism automatic</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">N</td>
                                                                                <td className="prediction-column">polymorphism</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="4" className="predictor-column">MutationAssessor</td>
                                                                                <td className="letter-code-column">H</td>
                                                                                <td className="prediction-column">High (predicted functional)</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">M</td>
                                                                                <td className="prediction-column">Medium (predicted functional)</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">L</td>
                                                                                <td className="prediction-column">Low (predicted non-functional)</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">N</td>
                                                                                <td className="prediction-column">Neutral</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="2" className="predictor-column">FATHMM</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">T</td>
                                                                                <td className="prediction-column">Tolerated</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="2" className="predictor-column">PROVEAN</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">N</td>
                                                                                <td className="prediction-column">Neutral</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="2" className="predictor-column">METASVM</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">T</td>
                                                                                <td className="prediction-column">Tolerated</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td rowSpan="2" className="predictor-column">METALR</td>
                                                                                <td className="letter-code-column">D</td>
                                                                                <td className="prediction-column">Damaging</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="letter-code-column">T</td>
                                                                                <td className="prediction-column">Tolerated</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </PopOverComponent>
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {otherPredStatic._order.map(key => {
                                                            return (this.renderOtherPredRow(key, otherPred, otherPredStatic));
                                                        })}
                                                    </tbody>
                                                </table>
                                                :
                                                <div className="panel-body"><span>No predictor data found for this allele.</span></div>
                                            }
                                        </div>
                                    }
                                </div>
                            </div>
                            <div className="panel panel-info datasource-conservation">
                                <div className="panel-heading">
                                    <h3 className="panel-title">
                                        Conservation Analysis
                                        <a href="#credit-myvariant" className="credit-myvariant" title="MyVariant.info"><span>MyVariant</span></a>
                                        {links_37 ? <a href={links_37.ucsc_url_37} target="_blank" title={'UCSC Genome Browser for ' + gRCh37 + ' in a new window'}>View position in UCSC Genome Browser</a> : null}
                                    </h3>
                                </div>
                                <div className="panel-content-wrapper">
                                    {this.state.loading_myVariantInfo ? showActivityIndicator('Retrieving data... ') : null}
                                    {!singleNucleotide ?
                                        <div className="panel-body"><span>Data is currently only returned for single nucleotide variants.</span></div>
                                        :
                                        <div>
                                            {this.state.hasConservationData ?
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
                                                :
                                                <div className="panel-body"><span>No conservation analysis data found for this allele.</span></div>
                                            }
                                        </div>
                                    }
                                </div>
                            </div>
                            <div className="panel panel-info datasource-splice">
                                <div className="panel-heading"><h3 className="panel-title">Splice Site Predictors</h3></div>
                                <div className="panel-body">
                                    <a href="http://genes.mit.edu/burgelab/maxent/Xmaxentscan_scoreseq.html" target="_blank" rel="noopener noreferrer">Analyze using MaxEntScan</a>
                                    <a href="http://www.fruitfly.org/seq_tools/splice.html" target="_blank" rel="noopener noreferrer">Analyze using NNSPLICE</a>
                                    <a href="http://www.umd.be/HSF3/HSF.shtml" target="_blank" rel="noopener noreferrer">Analyze using HumanSplicingFinder</a>
                                </div>
                            </div>
                            <extraEvidence.ExtraEvidenceTable category="variant-type" subcategory="functional-conservation-splicing-predictors" session={this.props.session}
                                href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Functional, Conservation, and Splicing Predictors)</span>}
                                variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['BP1', 'PP2', 'PP3', 'BP4']} />
                        </Panel></PanelGroup>

                        <PanelGroup accordion><Panel title="Other Variants in Same Codon" panelBodyClassName="panel-wide-content"
                            panelClassName="tab-predictors-panel-other-variants-in-codon" open>
                            {(this.state.data && this.state.interpretation) ?
                                <div className="row">
                                    <div className="col-sm-12">
                                        <CurationInterpretationForm renderedFormContent={criteriaMissense2} criteria={['PM5', 'PS1']}
                                            evidenceData={null} evidenceDataUpdated={true}
                                            formDataUpdater={criteriaMissense2Update} variantUuid={variant['@id']}
                                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                            affiliation={affiliation} session={session} />
                                    </div>
                                </div>
                                : null}
                            <div className="panel panel-info datasource-clinvar">
                                <div className="panel-heading"><h3 className="panel-title">ClinVar Variants</h3></div>
                                <div className="panel-content-wrapper">
                                    {this.state.loading_clinvarEsearch ? showActivityIndicator('Retrieving data... ') : null}
                                    <div className="panel-body">
                                        {this.renderVariantCodon(variant, codon)}
                                    </div>
                                </div>
                            </div>
                            <extraEvidence.ExtraEvidenceTable category="variant-type" subcategory="other-variants-in-codon" session={this.props.session}
                                href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Other Variants in Same Codon)</span>}
                                variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['PM5', 'PS1']} />
                        </Panel></PanelGroup>
                    </div>
                    : null}
                {this.state.selectedSubtab == 'lof' ?
                    <div role="tabpanel" className="tab-panel">
                        <PanelGroup accordion><Panel title="Null variant analysis" panelBodyClassName="panel-wide-content"
                            panelClassName="tab-predictors-panel-null-variant-analysis" open>
                            {(this.state.data && this.state.interpretation) ?
                                <div className="row">
                                    <div className="col-sm-12">
                                        <CurationInterpretationForm renderedFormContent={criteriaLof1} criteria={['PVS1']}
                                            evidenceData={null} evidenceDataUpdated={true}
                                            formDataUpdater={criteriaLof1Update} variantUuid={this.state.data['@id']}
                                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                            affiliation={affiliation} session={session} criteriaEvalNote={this.renderCriteriaEvalLink} />
                                    </div>
                                </div>
                                : null}
                            <div className="panel panel-info">
                                <div className="panel-heading"><h3 className="panel-title">Does variant result in LOF?</h3></div>
                                <table className="table">
                                    <thead>
                                        <tr>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                            <div className="panel panel-info">
                                <div className="panel-heading"><h3 className="panel-title">Is LOF known mechanism for disease of interest?</h3></div>
                                <table className="table">
                                    <thead>
                                        <tr>
                                        </tr>
                                    </thead>
                                </table>
                            </div>
                            <extraEvidence.ExtraEvidenceTable category="variant-type" subcategory="null-variant-analysis" session={this.props.session}
                                href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Null variant analysis)</span>}
                                variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['PVS1']} />
                        </Panel></PanelGroup>
                    </div>
                    : null}
                {this.state.selectedSubtab == 'silent-intron' ?
                    <div role="tabpanel" className="tab-panel">
                        <PanelGroup accordion><Panel title="Molecular Consequence: Silent & Intron" panelBodyClassName="panel-wide-content"
                            panelClassName="tab-predictors-panel-molecular-consequence-silent-intron" open>
                            {(this.state.data && this.state.interpretation) ?
                                <div className="row">
                                    <div className="col-sm-12">
                                        <CurationInterpretationForm renderedFormContent={criteriaSilentIntron1} criteria={['BP7']}
                                            evidenceData={null} evidenceDataUpdated={true}
                                            formDataUpdater={criteriaSilentIntron1Update} variantUuid={this.state.data['@id']}
                                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                            affiliation={affiliation} session={session} />
                                    </div>
                                </div>
                                : null}
                            <div className="panel panel-info datasource-splice">
                                <div className="panel-heading"><h3 className="panel-title">Splice Site Predictors</h3></div>
                                <div className="panel-body">
                                    <a href="http://genes.mit.edu/burgelab/maxent/Xmaxentscan_scoreseq.html" target="_blank" rel="noopener noreferrer">Analyze using MaxEntScan</a>
                                    <a href="http://www.fruitfly.org/seq_tools/splice.html" target="_blank" rel="noopener noreferrer">Analyze using NNSPLICE</a>
                                    <a href="http://www.umd.be/HSF3/HSF.shtml" target="_blank" rel="noopener noreferrer">Analyze using HumanSplicingFinder</a>
                                </div>
                            </div>
                            <extraEvidence.ExtraEvidenceTable category="variant-type" subcategory="molecular-consequence-silent-intron" session={this.props.session}
                                href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Molecular Consequence: Silent & Intron)</span>}
                                variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['BP7']} />
                        </Panel></PanelGroup>
                    </div>
                    : null}
                {this.state.selectedSubtab == 'indel' ?
                    <div role="tabpanel" className="tab-panel">
                        <PanelGroup accordion><Panel title="Molecular Consequence: Inframe indel" panelBodyClassName="panel-wide-content"
                            panelClassName="tab-predictors-panel-molecular-consequence-inframe-indel" open>
                            {(this.state.data && this.state.interpretation) ?
                                <div className="row">
                                    <div className="col-sm-12">
                                        <CurationInterpretationForm renderedFormContent={criteriaIndel1} criteria={['BP3', 'PM4']}
                                            evidenceData={null} evidenceDataUpdated={true} criteriaCrossCheck={[['BP3', 'PM4']]}
                                            formDataUpdater={criteriaIndel1Update} variantUuid={this.state.data['@id']}
                                            interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                            affiliation={affiliation} session={session} />
                                    </div>
                                </div>
                                : null}
                            <div className="panel panel-info">
                                <div className="panel-heading"><h3 className="panel-title">LinkOut to external resources</h3></div>
                                <div className="panel-body">
                                    <dl className="inline-dl clearfix">
                                        {(links_38 || links_37) ?
                                            <dd>UCSC [
                                                {links_38 ? <a href={links_38.ucsc_url_38} target="_blank" title={'UCSC Genome Browser for ' + gRCh38 + ' in a new window'}>GRCh38/hg38</a> : null }
                                                {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                                {links_37 ? <a href={links_37.ucsc_url_37} target="_blank" title={'UCSC Genome Browser for ' + gRCh37 + ' in a new window'}>GRCh37/hg19</a> : null }
                                                ]
                                            </dd>
                                            :
                                            <dd className="col-lg-3"><a href={external_url_map['UCSCBrowserHome']} target="_blank">UCSC Browser</a></dd>
                                        }
                                        {(links_38 || links_37) ?
                                            <dd>Variation Viewer [
                                                {links_38 ? <a href={links_38.viewer_url_38} target="_blank" title={'Variation Viewer page for ' + gRCh38 + ' in a new window'}>GRCh38</a> : null }
                                                {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                                {links_37 ? <a href={links_37.viewer_url_37} target="_blank" title={'Variation Viewer page for ' + gRCh37 + ' in a new window'}>GRCh37</a> : null }
                                                ]
                                            </dd>
                                            :
                                            <dd className="col-lg-4"><a href={external_url_map['VariationViewerHome']} target="_blank">Variation Viewer</a></dd>
                                        }
                                        {(links_38 || links_37) ?
                                            <dd>Ensembl Browser [
                                                {links_38 ? <a href={links_38.ensembl_url_38} target="_blank" title={'Ensembl Browser page for ' + gRCh38 + ' in a new window'}>GRCh38</a> : null }
                                                {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                                {links_37 ? <a href={links_37.ensembl_url_37} target="_blank" title={'Ensembl Browser page for ' + gRCh37 + ' in a new window'}>GRCh37</a> : null }
                                                ]
                                            </dd>
                                            :
                                            <dd className="col-lg-3"><a href={external_url_map['EnsemblBrowserHome']} target="_blank">Ensembl Browser</a></dd>
                                        }
                                    </dl>
                                </div>
                            </div>
                            <extraEvidence.ExtraEvidenceTable category="variant-type" subcategory="molecular-consequence-inframe-indel" session={this.props.session}
                                href_url={this.props.href_url} tableName={<span>Curated Literature Evidence (Molecular Consequence: Inframe indel)</span>}
                                variant={this.state.data} interpretation={this.state.interpretation} updateInterpretationObj={this.props.updateInterpretationObj}
                                viewOnly={this.state.data && !this.state.interpretation} affiliation={affiliation} criteriaList={['BP3', 'PM4']} />
                        </Panel></PanelGroup>
                    </div>
                    : null}

                {this.state.interpretation ?
                    <CompleteSection interpretation={this.state.interpretation} tabName="variant-type" updateInterpretationObj={this.props.updateInterpretationObj} />
                    : null}

                {renderDataCredit('myvariant')}

            </div>
        );
    }
});

/**
 * Code for rendering of this group of interpretation forms
 */
function criteriaMissense1() {
    let criteriaList1 = ['BP1', 'PP2'], // array of criteria code handled subgroup of this section
        criteriaList2 = ['PP3', 'BP4']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
        </div>
    );
}

/**
 * Code for updating the form values of interpretation forms upon receiving
 * existing interpretations and evaluations
 * @param {object} nextProps 
 */
function criteriaMissense1Update(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP1', 'PP2', 'PP3', 'BP4'], null);
}

/**
 * Code for rendering of this group of interpretation forms
 */
function criteriaMissense2() {
    let criteriaList1 = ['PM5'], // array of criteria code handled subgroup of this section
        criteriaList2 = ['PS1']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
            <div className="clear criteria-evaluation-divider"></div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList2, false)}
        </div>
    );
}

/**
 * Code for updating the form values of interpretation forms upon receiving
 * existing interpretations and evaluations
 * @param {object} nextProps 
 */
function criteriaMissense2Update(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PM5', 'PS1'], null);
}

/**
 * Code for rendering of this group of interpretation forms
 */
function criteriaLof1() {
    let criteriaList1 = ['PVS1']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
}

/**
 * Code for updating the form values of interpretation forms upon receiving
 * existing interpretations and evaluations
 * @param {object} nextProps 
 */
function criteriaLof1Update(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['PVS1'], null);
}

/**
 * Code for rendering of this group of interpretation forms
 */
function criteriaSilentIntron1() {
    let criteriaList1 = ['BP7']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
}

/**
 * code for updating the form values of interpretation forms upon receiving
 * existing interpretations and evaluations
 * @param {object} nextProps 
 */
function criteriaSilentIntron1Update(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP7'], null);
}

/**
 * Code for rendering of this group of interpretation forms
 */
function criteriaIndel1() {
    let criteriaList1 = ['BP3', 'PM4']; // array of criteria code handled subgroup of this section
    return (
        <div>
            {vciFormHelper.renderEvalFormSection.call(this, criteriaList1, false)}
        </div>
    );
}

/**
 * Code for updating the form values of interpretation forms upon receiving
 * existing interpretations and evaluations
 * @param {object} nextProps 
 */
function criteriaIndel1Update(nextProps) {
    vciFormHelper.updateEvalForm.call(this, nextProps, ['BP3', 'PM4'], null);
}

