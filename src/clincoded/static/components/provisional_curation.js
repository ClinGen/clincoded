'use strict';
var React = require('react');
var url = require('url');
var _ = require('underscore');
var moment = require('moment');
var panel = require('../libs/bootstrap/panel');
var form = require('../libs/bootstrap/form');
var globals = require('./globals');
var curator = require('./curator');
var RestMixin = require('./rest').RestMixin;
var methods = require('./methods');
var parseAndLogError = require('./mixins').parseAndLogError;
var CuratorHistory = require('./curator_history');
var modal = require('../libs/bootstrap/modal');
var Modal = modal.Modal;
var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var CurationPalette = curator.CurationPalette;
var PanelGroup = panel.PanelGroup;
var Panel = panel.Panel;
var Form = form.Form;
var FormMixin = form.FormMixin;
var Input = form.Input;
var InputMixin = form.InputMixin;
var queryKeyValue = globals.queryKeyValue;
var userMatch = globals.userMatch;

var ProvisionalCuration = React.createClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: React.PropTypes.func,
        closeModal: React.PropTypes.func
    },

    queryValues: {},

    getInitialState: function() {
        return {
            user: null, // login user uuid
            gdm: null, // current gdm object, must be null initially.
            provisional: null, // login user's existing provisional object, must be null initially.
            //assessments: null,  // list of all assessments, must be nul initially.
            totalScore: null,
            autoClassification: null
        };
    },

    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;

        // get gdm from db.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '' // search for entire data set of the gdm
        ]);
        this.getRestDatas(
            uris
        ).then(datas => {
            var stateObj = {};
            stateObj.user = this.props.session.user_properties.uuid;

            datas.forEach(function(data) {
                switch(data['@type'][0]) {
                    case 'gdm':
                        stateObj.gdm = data;
                        break;
                    default:
                        break;
                }
            });

            // Update the Curator Mixin OMIM state with the current GDM's OMIM ID.
            if (stateObj.gdm && stateObj.gdm.omimId) {
                this.setOmimIdState(stateObj.gdm.omimId);
            }

            // search for provisional owned by login user
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
                for (var i in stateObj.gdm.provisionalClassifications) {
                    var owner = stateObj.gdm.provisionalClassifications[i].submitted_by;
                    if (owner.uuid === stateObj.user) { // find
                        stateObj.provisional = stateObj.gdm.provisionalClassifications[i];
                        break;
                    }
                }
            }

            stateObj.previousUrl = url;
            this.setState(stateObj);

            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    componentDidMount: function() {
        this.loadData();
    },

    submitForm: function(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        // Save all form values from the DOM.
        this.saveAllFormValues();
        if (this.validateDefault()) {
            var calculate = queryKeyValue('calculate', this.props.href);
            var edit = queryKeyValue('edit', this.props.href);
            var newProvisional = this.state.provisional ? curator.flatten(this.state.provisional) : {};
            newProvisional.totalScore = Number(this.state.totalScore);
            newProvisional.autoClassification = this.state.autoClassification;
            newProvisional.alteredClassification = this.getFormValue('alteredClassification');
            newProvisional.reasons = this.getFormValue('reasons');

            // check required item (reasons)
            var formErr = false;
            if (!newProvisional.reasons && newProvisional.autoClassification !== newProvisional.alteredClassification) {
                formErr = true;
                this.setFormErrors('reasons', 'Required when changing classification.');
            }
            if (!formErr) {
                var backUrl = '/curation-central/?gdm=' + this.state.gdm.uuid;
                backUrl += this.queryValues.pmid ? '&pmid=' + this.queryValues.pmid : '';
                if (this.state.provisional) { // edit existing provisional
                    this.putRestData('/provisional/' + this.state.provisional.uuid, newProvisional).then(data => {
                        var provisionalClassification = data['@graph'][0];

                        // Record provisional classification history
                        var meta = {
                            provisionalClassification: {
                                gdm: this.state.gdm['@id'],
                                alteredClassification: provisionalClassification.alteredClassification
                            }
                        };
                        this.recordHistory('modify', provisionalClassification, meta);

                        this.resetAllFormValues();
                        window.history.go(-1);
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = : %o', e);
                    });
                }
                else { // save a new calculation and provisional classification
                    this.postRestData('/provisional/', newProvisional).then(data => {
                        return data['@graph'][0];
                    }).then(savedProvisional => {
                        // Record provisional classification history
                        var meta = {
                            provisionalClassification: {
                                gdm: this.state.gdm['@id'],
                                alteredClassification: savedProvisional.alteredClassification
                            }
                        };
                        this.recordHistory('add', savedProvisional, meta);

                        var theGdm = curator.flatten(this.state.gdm);
                        if (theGdm.provisionalClassifications) {
                            theGdm.provisionalClassifications.push(savedProvisional['@id']);
                        }
                        else {
                            theGdm.provisionalClassifications = [savedProvisional['@id']];
                        }

                        return this.putRestData('/gdm/' + this.state.gdm.uuid, theGdm).then(data => {
                            return data['@graph'][0];
                        });
                    }).then(savedGdm => {
                        this.resetAllFormValues();
                        window.history.go(-1);
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = %o', e);
                    });
                }
            }
        }
    },

    cancelForm: function(e) {
        // Changed modal cancel button from a form input to a html button
        // as to avoid accepting enter/return key as a click event.
        // Removed hack in this method.
        window.history.go(-1);
    },

    render: function() {
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        var calculate = queryKeyValue('calculate', this.props.href);
        var edit = queryKeyValue('edit', this.props.href);
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        var gdm = this.state.gdm ? this.state.gdm : null;
        var provisional = this.state.provisional ? this.state.provisional : null;

        var show_clsfctn = queryKeyValue('classification', this.props.href);
        var summaryMatrix = queryKeyValue('summarymatrix', this.props.href);
        var expMatrix = queryKeyValue('expmatrix', this.props.href);
        return (
            <div>
                { show_clsfctn === 'display' ?
                    Classification.call()
                    :
                    ( gdm ?
                        <div>
                            <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} summaryPage={true} linkGdm={true} />
                            <div className="container">
                                {
                                    (provisional && edit === 'yes') ?
                                    EditCurrent.call(this)
                                    :
                                    (   calculate === 'yes' ?
                                        <div>
                                            <h1>Curation Summary & Provisional Classification</h1>
                                            {
                                                provisional ?
                                                <PanelGroup accordion>
                                                    <Panel title="Last Saved Summary & Provisional Classification" open>
                                                        <div className="row">
                                                                <div className="col-sm-5"><strong>Date Generated:</strong></div>
                                                                <div className="col-sm-7"><span>{moment(provisional.last_modified).format("YYYY MMM DD, h:mm a")}</span></div>
                                                            </div>
                                                            <div className="row">
                                                                <div className="col-sm-5">
                                                                    <strong>Total Score:</strong>
                                                                </div>
                                                                <div className="col-sm-7"><span>{provisional.totalScore}</span></div>
                                                            </div>
                                                            <div className="row">
                                                                <div className="col-sm-5">
                                                                    <strong>Calculated Clinical Validity Classification:</strong>
                                                                </div>
                                                                <div className="col-sm-7"><span>{provisional.autoClassification}</span></div>
                                                            </div>
                                                            <div className="row">
                                                                <div className="col-sm-5">
                                                                    <strong>Selected Clinical Validity Classification:</strong>
                                                                </div>
                                                                <div className="col-sm-7"><span>{provisional.alteredClassification}</span></div>
                                                            </div>
                                                            <div className="row">
                                                                <div className="col-sm-5">
                                                                    <strong>Reason(s):</strong>
                                                                </div>
                                                                <div className="col-sm-7"><span>{this.state.provisional.reasons}</span></div>
                                                            </div>
                                                            <div className="row">&nbsp;</div>
                                                        </Panel>
                                                    </PanelGroup>
                                                :
                                                null
                                            }
                                            {NewCalculation.call(this)}
                                        </div>
                                        :
                                        null
                                    )
                                }
                            </div>
                        </div>
                        :
                        null
                    )
                }
            </div>
        );
    }
});

globals.curator_page.register(ProvisionalCuration,  'curator_page', 'provisional-curation');

// Generate Classification Description page for url ../provisional-curation/?gdm=GDMId&classification=display
var Classification = function() {
    return (
        <div className="container classification-cell">
            <h1>Clinical Validity Classifications</h1>
            <div className="classificationTable">
                <table>
                    <tbody>
                        <tr className="greyRow">
                            <td colSpan='2' className="titleCell">Evidence Level</td>
                            <td className="titleCell">Evidence Description</td>
                        </tr>
                        <tr>
                            <td rowSpan='7' className="verticalCell">
                                <div className="verticalContent spptEvd">
                                    Supportive&nbsp;Evidence
                                </div>
                            </td>
                            <td className="levelCell">DEFINITIVE</td>
                            <td>
                                The role of this gene in this particular disease hase been repeatedly demonstrated in both the research and clinical
                                diagnostic settings, and has been upheld over time (in general, at least 3 years). No convincing evidence has emerged
                                that contradicts the role of the gene in the specified disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="levelCell">STRONG</td>
                            <td>
                                The role of this gene in disease has been independently demonstrated in at least two separate studies providing&nbsp;
                                <strong>strong</strong> supporting evidence for this gene&#39;s role in disease, such as the following types of evidence:
                                <ul>
                                    <li>Strong variant-level evidence demonstrating numerous unrelated probands with variants that provide convincing
                                    evidence for disease causality&sup1;</li>
                                    <li>Compelling gene-level evidence from different types of supporting experimental data&sup2;.</li>
                                </ul>
                                In addition, no convincing evidence has emerged that contradicts the role of the gene in the noted disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="levelCell">MODERATE</td>
                            <td>
                                There is <strong>moderate</strong> evidence to support a causal role for this gene in this diseaese, such as:
                                <ul>
                                    <li>At least 3 unrelated probands with variants that provide convincing evidence for disease causality&sup1;</li>
                                    <li>Moderate experimental data&sup2; supporting the gene-disease association</li>
                                </ul>
                                The role of this gene in disease may not have been independently reported, but no convincing evidence has emerged
                                that contradicts the role of the gene in the noded disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="levelCell">LIMITED</td>
                            <td>
                                There is <strong>limited</strong> evidence to support a causal role for this gene in this disease, such as:
                                <ul>
                                    <li>Fewer than three observations of variants that provide convincing evidence for disease causality&sup1;</li>
                                    <li>Multiple variants reported in unrelated probands but <i>without</i> sufficient evidence that the variants alter function</li>
                                    <li>Limited experimental data&sup2; supporting the gene-disease association</li>
                                </ul>
                                The role of this gene in  disease may not have been independently reported, but no convincing evidence has emerged that
                                contradicts the role of the gene in the noted disease.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td colSpan="2" className="levelCell">NO REPORTED<br />EVIDENCE</td>
                            <td>
                                No evidence reported for a causal role in disease. These genes might be &#34;candidate&#34; genes based on animal models or implication
                                in pathways known to be involved in human diseases, but no reports have implicated the gene in human disease cases.
                            </td>
                        </tr>
                        <tr className="narrow-line"></tr>
                        <tr>
                            <td className="verticalCell">
                                <div className="verticalContent cntrdctEvd">
                                    Contradictory&nbsp;Evidence
                                </div>
                            </td>
                            <td className="levelCell">
                                CONFLICTING<br />EVIDENCE<br />REPORTED
                            </td>
                            <td>
                                Although there has been an assertion of a gene-disease association, conflicting evidence for the role of this gene in disease has arisen
                                since the time of the initial report indicating a disease association. Depending on the quantity and quality of evidence disputing the
                                association, the gene/disease association may be further defined by the following two sub-categories:
                                <ol className="olTitle">
                                    <li type="1">
                                        Disputed
                                        <ol className="olContent">
                                            <li type="a">
                                                Convincing evidence <i>disputing</i> a role for this gene in this disease has arisen since the initial report identifying an
                                                association between the gene and disease.
                                            </li>
                                            <li type="a">
                                                Refuting evidence need not outweigh existing evidence supporting the gene:disease association.
                                            </li>
                                        </ol>
                                    </li>
                                    <li type="1">
                                        Refuted
                                        <ol className="olContent">
                                            <li type="a">
                                                Evidence refuting the role of the gene in the specified disease has been reported and significantly outweighs any evidence
                                                supporting the role.
                                            </li>
                                            <li type="a">
                                                This designation is to be applied at the discretion of clinical domain experts after thorough review of available evidence
                                            </li>
                                        </ol>
                                    </li>
                                </ol>
                            </td>
                        </tr>
                        <tr className="greyRow">
                            <td colSpan="3" className="levelCell">NOTES</td>
                        </tr>
                        <tr>
                            <td colSpan="3">
                                <p>
                                    &sup1;Variants that have evidence to disrupt function and/or have other strong genetic and population data (e.g. <i>de novo</i>&nbsp;
                                    occurrence, absence in controls, etc) can be used as evidence in support of a variant&#39;s causality in this framework.
                                </p>
                                <p>&sup2;Examples of appropriate types of supporting experimental data based on those outlined in MacArthur et al. 2014.</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Description of 4 leves of classification in summary table
var LimitedClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">LIMITED CLASSIFICATION</p>
            <p>There is <strong>limited</strong> evidence to support a causal role for this gene in this disease, such as:</p>
            <ul>
                <li>Fewer than three observations of variants that provide convincing evidence for disease causality&sup1;</li>
                <li>Multiple variants reported in unrelated probands but <i>without</i> sufficient evidence that the variants alter function</li>
                <li>Limited experimental data&sup2; supporting the gene-disease association</li>
            </ul>
            <p>The role of this gene in disease may not have been independently reported, but no convincing evidence has emerged that contradicts the role of the gene in the noted disease.</p>
        </div>
    );
};

var ModerateClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">MODERATE CLASSIFICATION</p>
            <p>There is <strong>moderate</strong> evidence to support a causal role for this gene in this diseaese, such as:</p>
            <ul>
                <li>At least 3 unrelated probands with variants that provide convincing evidence for disease causality&sup1;</li>
                <li>Moderate experimental data&sup2; supporting the gene-disease association</li>
            </ul>
            <p>The role of this gene in disease may not have been independently reported, but no convincing evidence has emerged that contradicts the role of the gene in the noded disease.</p>
        </div>
    );
};

var StrongClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">STRONG CLASSIFICATION</p>
            <p>
                The role of this gene in disease has been independently demonstrated in at least two separate studies providing&nbsp;
                <strong>strong</strong> supporting evidence for this gene&#39;s role in disease, such as the following types of evidence:
            </p>
            <ul>
                <li>Strong variant-level evidence demonstrating numerous unrelated probands with variants that provide convincing evidence for disease causality&sup1;</li>
                <li>Compelling gene-level evidence from different types of supporting experimental data&sup2;.</li>
            </ul>
            <p>In addition, no convincing evidence has emerged that contradicts the role of the gene in the noted disease.</p>
        </div>
    );
};

var DefinitiveClassification = function() {
    return (
        <div>
            <p className="title underline-text title-p">DEFINITIVE CLASSIFICATION</p>
            <p>
                The role of this gene in this particular disease hase been repeatedly demonstrated in both the research and clinical
                diagnostic settings, and has been upheld over time (in general, at least 3 years). No convincing evidence has emerged
                that contradicts the role of the gene in the specified disease.
            </p>
        </div>
    );
};

// Edit page for url ../provisional-curation/?gdm=GDMId&edit=yes
var EditCurrent = function() {
    var alteredClassification = this.state.provisional.alteredClassification ? this.state.provisional.alteredClassification : 'none';
    this.state.totalScore = this.state.provisional.totalScore;
    this.state.autoClassification = this.state.provisional.autoClassification;

    return (
        <div>
            <h1>Edit Summary and Provisional Classification</h1>
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <PanelGroup accordion>
                    <Panel title="Currently Saved Calculation and Classification" open>
                        <div className="row">
                            <div className="col-sm-5"><strong className="pull-right">Total Score:</strong></div>
                            <div className="col-sm-7"><span>{this.state.totalScore}</span></div>
                        </div>
                        <br />
                        <div className="row">
                            <div className="col-sm-5">
                                <strong className="pull-right">Calculated&nbsp;
                                    <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>
                                    :
                                </strong>
                            </div>
                            <div className="col-sm-7"><span>{this.state.autoClassification}</span></div>
                        </div>
                        <br />
                        <div className="row">
                            <Input type="select" ref="alteredClassification" value={alteredClassification} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                                label={<strong>Select Provisional <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</strong>}
                                groupClassName="form-group" handleChange={this.handleChange}>
                                <option value="Definitive">Definitive</option>
                                <option value="Strong">Strong</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Limited">Limited</option>
                                <option value="No Reported Evidence">No Evidence</option>
                                <option value="Disputed">Disputed</option>
                                <option value="Refuted">Refuted</option>
                            </Input>
                        </div>
                        <div className="row">
                            <Input type="textarea" ref="reasons" label="Explain Reason(s) for Change:" rows="5" labelClassName="col-sm-5 control-label"
                                value={this.state.provisional && this.state.provisional.reasons} wrapperClassName="col-sm-7" groupClassName="form-group"
                                error={this.getFormError('reasons')} clearError={this.clrFormErrors.bind(null, 'reasons')}/>
                        </div>
                        <div className="row">
                            <div className="col-sm-5"><strong>Date Created:</strong></div>
                            <div className="col-sm-7">
                                <span>{moment(this.state.provisional.date_created).format("YYYY MMM DD, h:mm a")}</span>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-sm-5"><strong>Last Modified:</strong></div>
                            <div className="col-sm-7">
                                <span>{moment(this.state.provisional.last_modified).format("YYYY MMM DD, h:mm a")}</span>
                            </div>
                        </div>
                        <div><span>&nbsp;</span></div>
                        <br />
                    </Panel>
                </PanelGroup>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="Save" />
                </div>
            </Form>
        </div>
    );
};

var SegregationUserAssessmentsCount = function(assessments, userAssessments) {
    assessments.forEach(assessment => {
        if (assessment.submitted_by.uuid === this.state.user && assessment.value === 'Supports') {
            userAssessments['segSpt'] += 1;
        }
        else if (assessment.submitted_by.uuid === this.state.user && assessment.value === 'Review') {
            userAssessments['segReview'] += 1;
        }
        else if (assessment.submitted_by.uuid === this.state.user && assessment.value === 'Contradicts') {
            userAssessments['segCntdct'] += 1;
        }
    });
    return userAssessments;
};

var SegregationLodScoresCount = function(segregation, segregationCount, segregationPoints) {
    if ("lodPublished" in segregation && segregation.lodPublished === true && segregation.publishedLodScore) {
        segregationCount += 1;
        segregationPoints += segregation.publishedLodScore;
    } else if ("lodPublished" in segregation && segregation.lodPublished === false && segregation.estimatedLodScore) {
        segregationCount += 1;
        segregationPoints += segregation.estimatedLodScore;
    }
    return {segregationCount: segregationCount, segregationPoints: segregationPoints};
};

var ExperimentalScoreReturn = function(score) {
    if (score.score && score.score !== 'none') {
        return parseFloat(score.score); // Use the score selected by curator (if any)
    } else if (score.calculatedScore && score.calculatedScore !== 'none') {
        return parseFloat(score.calculatedScore); // Otherwise, use default score (if any)
    }
};

// Generate a new summary for url ../provisional-curation/?gdm=GDMId&calculate=yes
// Calculation rules are defined by Small GCWG. See ClinGen_Interface_4_2015.pptx and Clinical Validity Classifications for detail
var NewCalculation = function() {
    var gdm = this.state.gdm;

    const MAX_SCORE_CONSTANTS = {
        VARIANT_IS_DE_NOVO: 12,
        PREDICTED_OR_PROVEN_NULL_VARIANT: 10,
        OTHER_VARIANT_TYPE_WITH_GENE_IMPACT: 7,
        AUTOSOMAL_RECESSIVE: 12,
        SEGREGATION: 7,
        CASE_CONTROL: 12,
        FUNCTIONAL: 2,
        FUNCTIONAL_ALTERATION: 2,
        MODELS_RESCUE: 4
    };

    /*****************************************************/
    /* VARIABLES FOR EVIDENCE SCORE TABLE                */
    /*****************************************************/
    // variables for autosomal dominant data
    let probandOtherVariantCount = 0, probandOtherVariantPoints = 0, probandOtherVariantPointsCounted = 0;
    let probandNullVariantCount = 0, probandNullVariantPoints = 0, probandNullVariantPointsCounted = 0;
    let variantDenovoCount = 0, variantDenovoPoints = 0, variantDenovoPointsCounted = 0;
    // variables for autosomal recessive data
    let autosomalRecessivePointsCounted = 0;
    let twoVariantsProvenCount = 0, twoVariantsProvenPoints = 0;
    let twoVariantsNotProvenCount = 0, twoVariantsNotProvenPoints = 0;
    // variables for segregation data
    // segregationPoints is actually the raw, unconverted score; segregationPointsCounted is calculated and displayed score
    let segregationCount = 0, segregationPoints = 0, segregationPointsCounted = 0;
    // variables for case-control data
    let caseControlCount = 0, caseControlPoints = 0, caseControlPointsCounted;
    // variables for Experimental data
    let functionalPointsCounted = 0, functionalAlterationPointsCounted = 0, modelsRescuePointsCounted = 0;
    let biochemicalFunctionCount = 0, biochemicalFunctionPoints = 0;
    let proteinInteractionsCount = 0, proteinInteractionsPoints = 0;
    let expressionCount = 0, expressionPoints = 0;
    let patientCellsCount = 0, patientCellsPoints = 0;
    let nonPatientCellsCount = 0, nonPatientCellsPoints = 0;
    let animalModelCount = 0, animalModelPoints = 0;
    let cellCultureCount = 0, cellCulturePoints = 0;
    let rescueCount = 0, rescuePoints = 0;
    let rescueEngineeredCount = 0, rescueEngineeredPoints = 0;
    // variables for total counts
    let geneticEvidenceTotalPoints = 0, experimentalEvidenceTotalPoints = 0, totalPoints = 0;

    /*****************************************************/
    /* Find all proband individuals that had been scored */
    /*****************************************************/
    let probandTotal = []; // Total proband combined
    let probandFamily = []; // Total probands associated with families from all annotations
    let probandIndividual = []; // Total proband individuals from all annotations

    var h, i, j, k, l;

    // initial values of assessments
    var userAssessments = {
        "variantSpt": 0,
        "variantReview": 0,
        "variantCntdct": 0,
        "variantNot": 0,
        "expSpt": 0,
        "expReview": 0,
        "expCntdct": 0,
        "expNot": 0,
        "segSpt": 0,
        "segReview": 0,
        "segCntdct": 0,
        "segNot": 0
    };

    // Collect variants from user's pathogenicity
    var gdmPathoList = gdm.variantPathogenicity;
    var pathoVariantIdList = {
        "support": [],
        "review": [],
        "contradict": []
    };

    gdmPathoList.forEach(gdmPatho => {
        let variantUuid = gdmPatho.variant.uuid;
        // Collect login user's variant assessments, separated as 3 different values.
        if (gdmPatho.assessments && gdmPatho.assessments.length > 0) {
            gdmPatho.assessments.forEach(assessment => {
                if (assessment.submitted_by.uuid === this.state.user && assessment.value === 'Supports') {
                    pathoVariantIdList['support'].push(variantUuid);
                }
                else if (assessment.submitted_by.uuid === this.state.user && assessment.value === 'Review') {
                    pathoVariantIdList['review'].push(variantUuid);
                }
                else if (assessment.submitted_by.uuid === this.state.user && assessment.value === 'Contradicts') {
                    pathoVariantIdList['contradict'].push(variantUuid);
                }
            });
        }
    });

    var exp_scores = [0, 0, 0];
    var expType = {
        "Expression": 0,
        "Protein Interactions": 0,
        "Biochemical Function": 0,
        "Functional Alteration (Patient cells)": 0,
        "Functional Alteration (Engineered equivalent)": 0,
        "Model Systems (Animal model)": 0,
        "Model Systems (Engineered equivalent)": 0,
        "Rescue (Patient cells)": 0,
        "Rescue (Engineered equivalent)": 0
    };
    var individualsCollected = {
        "probandInd": [],
        "allVariants": [],
        "sptVariants": [],
        "rvwVariants": [],
        "cntdctVariants": []
    };
    var proband_variants = [];
    let tempSegregationValues;
    let individualMatched = [];
    let caseControlTotal = [];

    // scan gdm
    let annotations = gdm.annotations && gdm.annotations.length ? gdm.annotations : [];
    annotations.forEach(annotation => {
        let groups, families, individuals, assessments, experimentals;

        // loop through groups
        groups = annotation.groups && annotation.groups.length ? annotation.groups : [];
        groups.forEach(group => {
            // loop through families within group
            families = groups.familyIncluded && groups.familyIncluded.length ? groups.familyIncluded : [];
            families.forEach(family => {
                // loop through individual within family within group
                if (family.individualIncluded && family.individualIncluded.length) {
                    individualsCollected = filter(individualsCollected, family.individualIncluded, annotation.article, pathoVariantIdList);
                }
                // get segregation of family within group
                if (family.segregation) {
                    userAssessments['segNot'] += 1;
                    assessments = family.segregation.assessments && family.segregation.assessments.length ? family.segregation.assessments : [];
                    userAssessments = SegregationUserAssessmentsCount(assessments, userAssessments);
                    // get lod score of segregation of family of group
                    if (family.segregation.includeLodScoreInAggregateCalculation) {
                        tempSegregationValues = SegregationLodScoresCount(family.segregation, segregationCount, segregationPoints);
                        segregationCount = tempSegregationValues.segregationCount;
                        segregationPoints = tempSegregationValues.segregationPoints;
                    }
                }
            });
            // get individuals of group
            if (group.individualIncluded && group.individualIncluded.length) {
                individualsCollected = filter(individualsCollected, group.individualIncluded, annotation.article, pathoVariantIdList);
            }
        });

        // loop through families
        families = annotation.families && annotation.families.length ? annotation.families : [];
        families.forEach(family => {
            // get individuals of family
            if (family.individualIncluded && family.individualIncluded.length) {
                individualsCollected = filter(individualsCollected, family.individualIncluded, annotation.article, pathoVariantIdList);
            }
            // get segregation of family
            if (family.segregation) {
                userAssessments['segNot'] += 1;
                assessments = family.segregation.assessments && family.segregation.assessments.length ? family.segregation.assessments : [];
                userAssessments = SegregationUserAssessmentsCount(assessments, userAssessments);
                // get lod scores of segregation of family
                if (family.segregation.includeLodScoreInAggregateCalculation) {
                    tempSegregationValues = SegregationLodScoresCount(family.segregation, segregationCount, segregationPoints);
                    segregationCount = tempSegregationValues.segregationCount;
                    segregationPoints = tempSegregationValues.segregationPoints;
                }
            }
            // get proband individuals of family
            if (family.individualIncluded.length) {
                individualMatched = family.individualIncluded.filter(individual => {
                    if (individual.proband === true && (individual.scores && individual.scores.length)) {
                        return true;
                    }
                });
            }
        });
        // push all matched individuals from family to probandFamily
        individualMatched.forEach(item => {
            probandFamily.push(item);
        });

        // loop through individuals
        if (annotation.individuals && annotation.individuals.length) {
            individualsCollected = filter(individualsCollected, annotation.individuals, annotation.article, pathoVariantIdList);

            // get proband individuals
            individualMatched = [];
            if (annotation.individuals.length) {
                individualMatched = annotation.individuals.filter(individual => {
                    if (individual.proband === true && (individual.scores && individual.scores.length)) {
                        return true;
                    }
                });
            }
            // push all matched individuals to probandIndividual
            individualMatched.forEach(item => {
                probandIndividual.push(item);
            });
        }

        // loop through case-controls
        let caseControlMatched = [];
        if (annotation.caseControlStudies && annotation.caseControlStudies.length) {
            caseControlMatched = annotation.caseControlStudies.filter(caseControl => {
                if (caseControl.scores && caseControl.scores.length) {
                    return true;
                }
            });
        }
        // push all matched case-controls to caseControlTotal
        caseControlMatched.forEach(item => {
            caseControlTotal.push(item);
        });

        // loop through experimentals
        experimentals = annotation.experimentalData && annotation.experimentalData.length ? annotation.experimentalData : [];
        experimentals.forEach(experimental => {
            // loop through scores, if any
            if (experimental.scores && experimental.scores.length) {
                experimental.scores.forEach(score => {
                    // only care about scores made by current user
                    if (score.submitted_by.uuid === this.state.user) {
                        let experimentalScore = ExperimentalScoreReturn(score);
                        userAssessments['expNot'] += 1;
                        if (experimental.evidenceType && experimental.evidenceType === 'Biochemical Function') {
                            biochemicalFunctionCount += 1;
                            biochemicalFunctionPoints += experimentalScore;
                        } else if (experimental.evidenceType && experimental.evidenceType === 'Protein Interactions') {
                            proteinInteractionsCount += 1;
                            proteinInteractionsPoints += experimentalScore;
                        } else if (experimental.evidenceType && experimental.evidenceType === 'Expression') {
                            expressionCount += 1;
                            expressionPoints += experimentalScore;
                        } else if (experimental.evidenceType && experimental.evidenceType === 'Functional Alteration') {
                            if (experimental.functionalAlteration.cellMutationOrEngineeredEquivalent
                                && experimental.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Patient cells') {
                                patientCellsCount += 1;
                                patientCellsPoints += experimentalScore;
                            } else if (experimental.functionalAlteration.cellMutationOrEngineeredEquivalent
                                && experimental.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Engineered equivalent') {
                                nonPatientCellsCount += 1;
                                nonPatientCellsCount += experimentalScore;
                            }
                        } else if (experimental.evidenceType && experimental.evidenceType === 'Model Systems') {
                            if (experimental.modelSystems.animalOrCellCulture
                                && experimental.modelSystems.animalOrCellCulture === 'Animal model') {
                                animalModelCount += 1;
                                animalModelPoints += experimentalScore;
                            } else if (experimental.modelSystems.animalOrCellCulture
                                && experimental.modelSystems.animalOrCellCulture === 'Engineered equivalent') {
                                cellCultureCount += 1;
                                cellCulturePoints += experimentalScore;
                            }
                        } else if (experimental.evidenceType && experimental.evidenceType === 'Rescue') {
                            if (experimental.rescue.patientCellOrEngineeredEquivalent
                                && experimental.rescue.patientCellOrEngineeredEquivalent === 'Patient cells') {
                                rescueCount += 1;
                                rescuePoints += experimentalScore;
                            } else if (experimental.rescue.patientCellOrEngineeredEquivalent
                                && experimental.rescue.patientCellOrEngineeredEquivalent === 'Engineered equivalent') {
                                rescueEngineeredCount += 1;
                                rescueEngineeredPoints += experimentalScore;
                            }
                        }
                    }
                });
            }
        });
    });

    // combine all probands
    probandTotal = probandFamily.concat(probandIndividual);

    userAssessments['variantSpt'] = individualsCollected['sptVariants'].length;
    userAssessments['variantReview'] = individualsCollected['rvwVariants'].length;
    userAssessments['variantCntdct'] = individualsCollected['cntdctVariants'].length;
    userAssessments['variantNot'] = individualsCollected['allVariants'].length - userAssessments['variantSpt'] - userAssessments['variantReview'] - userAssessments['variantCntdct'];
    userAssessments['expNot'] = userAssessments['expNot'] - userAssessments['expSpt'] - userAssessments['expReview'] - userAssessments['expCntdct'];
    userAssessments['segNot'] = userAssessments['segNot'] - userAssessments['segSpt'] - userAssessments['segReview'] - userAssessments['segCntdct'];

    // Collect articles and find the earliest publication year
    var proband = 0;
    var articleCollected = [];
    var year = new Date();
    var earliest = year.getFullYear();
    individualsCollected['probandInd'].forEach(probandInd => {
        if (probandInd.pmid && probandInd.pmid != '') {
            proband += 1;
            if (!in_array(probandInd.pmid, articleCollected)) {
                articleCollected.push(probandInd.pmid);
                earliest = get_earliest_year(earliest, probandInd.date);
            }
        }
    });

    // calculate scores
    var currentYear = year.getFullYear();
    var time = currentYear.valueOf() - earliest.valueOf();
    var timeScore = 0, probandScore = 0, pubScore = 0, expScore = 0; // initialize scores to 0
    if (time >= 3) {
        timeScore = 2;
    }
    else if (time >= 1) {
        timeScore = 1;
    }
    else {
        timeScore = 0;
    }

    if (proband > 18) {
        probandScore = 7;
    }
    else if (proband >15) {
        probandScore = 6;
    }
    else if (proband > 12) {
        probandScore = 5;
    }
    else if (proband > 9) {
        probandScore = 4;
    }
    else if (proband > 6) {
        probandScore = 3;
    }
    else if (proband > 3) {
        probandScore = 2;
    }
    else if (proband >= 1) {
        probandScore = 1;
    }
    else {
        probandScore = 0;
    }

    if (articleCollected.length >= 5) {
        pubScore = 5;
    }
    else {
        pubScore = articleCollected.length;
    }
    if (articleCollected.length <= 2 && timeScore > 1) {
        timeScore = 1;
    }

    var totalScore = probandScore + pubScore + timeScore + expScore;

    // set calculated classification
    var autoClassification = 'No Reported Evidence';
    if (Math.floor(totalScore) >= 17){
        autoClassification = 'Definitive';
    }
    else if (Math.floor(totalScore) >= 13) {
        autoClassification = 'Strong';
    }
    else if (Math.floor(totalScore) >= 9) {
        autoClassification = 'Moderate';
    }
    else if (Math.floor(totalScore) >= 2) {
        autoClassification = 'Limited';
    }

    // save total score and calculated classification to state
    this.state.totalScore = totalScore;
    this.state.autoClassification = autoClassification;

    // set score positons in html table
    var probandRow = [], pubRow = [], timeRow = [];
    for(i=0; i<8; i++) {
        if (i === probandScore) {
            probandRow.push(proband);
        }
        else {
            probandRow.push('');
        }

        if (i === pubScore) {
            pubRow.push(articleCollected.length);
        }
        else if (i < 6) {
            pubRow.push('');
        }

        if (i === timeScore) {
            timeRow.push(time);
        }
        else if (i < 3) {
            timeRow.push('');
        }
    }

    /*****************************************************/
    /* Collect all proband scores into an array          */
    /*****************************************************/
    let probandScores = [];
    probandTotal.forEach(proband => {
        proband.scores.forEach(score => {
            probandScores.push(score);
        });
    });

    /*****************************************************/
    /* Calculate count and total points for each         */
    /* Case Information type occurance                   */
    /*****************************************************/
    // Case Information type === 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT'
    let probandOtherVariant = probandScores.filter(scoreObj => {
        if (scoreObj.caseInfoType && scoreObj.caseInfoType === 'OTHER_VARIANT_TYPE_WITH_GENE_IMPACT' && scoreObj.scoreStatus === 'Score') {
            return true;
        }
    });
    probandOtherVariantCount = probandOtherVariant.length ? probandOtherVariant.length : 0;
    probandOtherVariant.forEach(item => {
        if (item.score && item.score !== 'none') {
            probandOtherVariantPoints += parseFloat(item.score);
        } else if (item.calculatedScore && item.calculatedScore !== 'none') {
            probandOtherVariantPoints += parseFloat(item.calculatedScore);
        }
    });
    if (probandOtherVariantPoints < MAX_SCORE_CONSTANTS.OTHER_VARIANT_TYPE_WITH_GENE_IMPACT) {
        probandOtherVariantPointsCounted = probandOtherVariantPoints;
    } else {
        probandOtherVariantPointsCounted = MAX_SCORE_CONSTANTS.OTHER_VARIANT_TYPE_WITH_GENE_IMPACT;
    }

    // Case Information type === 'PREDICTED_OR_PROVEN_NULL_VARIANT'
    let probandNullVariant = probandScores.filter(scoreObj => {
        if (scoreObj.caseInfoType && scoreObj.caseInfoType === 'PREDICTED_OR_PROVEN_NULL_VARIANT' && scoreObj.scoreStatus === 'Score') {
            return true;
        }
    });
    probandNullVariantCount = probandNullVariant.length ? probandNullVariant.length : 0;
    probandNullVariant.forEach(item => {
        if (item.score && item.score !== 'none') {
            probandNullVariantPoints += parseFloat(item.score);
        } else if (item.calculatedScore && item.calculatedScore !== 'none') {
            probandNullVariantPoints += parseFloat(item.calculatedScore);
        }
    });
    if (probandNullVariantPoints < MAX_SCORE_CONSTANTS.PREDICTED_OR_PROVEN_NULL_VARIANT) {
        probandNullVariantPointsCounted = probandNullVariantPoints;
    } else {
        probandNullVariantPointsCounted = MAX_SCORE_CONSTANTS.PREDICTED_OR_PROVEN_NULL_VARIANT;
    }

    // Case Information type === 'VARIANT_IS_DE_NOVO'
    let variantDenovo = probandScores.filter(scoreObj => {
        if (scoreObj.caseInfoType && scoreObj.caseInfoType === 'VARIANT_IS_DE_NOVO' && scoreObj.scoreStatus === 'Score') {
            return true;
        }
    });
    variantDenovoCount = variantDenovo.length ? variantDenovo.length : 0;
    variantDenovo.forEach(item => {
        if (item.score && item.score !== 'none') {
            variantDenovoPoints += parseFloat(item.score);
        } else if (item.calculatedScore && item.calculatedScore !== 'none') {
            variantDenovoPoints += parseFloat(item.calculatedScore);
        }
    });
    if (variantDenovoPoints < MAX_SCORE_CONSTANTS.VARIANT_IS_DE_NOVO) {
        variantDenovoPointsCounted = variantDenovoPoints;
    } else {
        variantDenovoPointsCounted = MAX_SCORE_CONSTANTS.VARIANT_IS_DE_NOVO;
    }

    // Case Information type === 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS'
    let twoVariantsNotProven = probandScores.filter(scoreObj => {
        if (scoreObj.caseInfoType && scoreObj.caseInfoType === 'TWO_VARIANTS_WITH_GENE_IMPACT_IN_TRANS' && scoreObj.scoreStatus === 'Score') {
            return true;
        }
    });
    twoVariantsNotProvenCount = twoVariantsNotProven.length ? twoVariantsNotProven.length : 0;
    twoVariantsNotProven.forEach(item => {
        if (item.score && item.score !== 'none') {
            twoVariantsNotProvenPoints += parseFloat(item.score);
        } else if (item.calculatedScore && item.calculatedScore !== 'none') {
            twoVariantsNotProvenPoints += parseFloat(item.calculatedScore);
        }
    });

    // Case Information type === 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO'
    let twoVariantsProven = probandScores.filter(scoreObj => {
        if (scoreObj.caseInfoType && scoreObj.caseInfoType === 'TWO_VARIANTS_IN_TRANS_WITH_ONE_DE_NOVO' && scoreObj.scoreStatus === 'Score') {
            return true;
        }
    });
    twoVariantsProvenCount = twoVariantsProven.length ? twoVariantsProven.length : 0;
    twoVariantsProven.forEach(item => {
        if (item.score && item.score !== 'none') {
            twoVariantsProvenPoints += parseFloat(item.score);
        } else if (item.calculatedScore && item.calculatedScore !== 'none') {
            twoVariantsProvenPoints += parseFloat(item.calculatedScore);
        }
    });

    // calculate segregation counted points
    if (segregationPoints >= 0.75 && segregationPoints <= 0.99) {
        segregationPointsCounted = 1;
    } else if (segregationPoints >= 1 && segregationPoints <= 1.24) {
        segregationPointsCounted = .5;
    } else if (segregationPoints >= 1.25 && segregationPoints <= 1.49) {
        segregationPointsCounted = 2.5;
    } else if (segregationPoints >= 1.5 && segregationPoints <= 1.74) {
        segregationPointsCounted = 3;
    } else if (segregationPoints >= 1.75 && segregationPoints <= 1.99) {
        segregationPointsCounted = 3.5;
    } else if (segregationPoints >= 2 && segregationPoints <= 2.49) {
        segregationPointsCounted = 4;
    } else if (segregationPoints >= 2.5 && segregationPoints <= 2.99) {
        segregationPointsCounted = 4.5;
    } else if (segregationPoints >= 3 && segregationPoints <= 3.49) {
        segregationPointsCounted = 5;
    } else if (segregationPoints >= 3.5 && segregationPoints <= 3.99) {
        segregationPointsCounted = 5.5;
    } else if (segregationPoints >= 4 && segregationPoints <= 4.49) {
        segregationPointsCounted = 6;
    } else if (segregationPoints >= 4.5 && segregationPoints <= 4.99) {
        segregationPointsCounted = 6.5;
    } else if (segregationPoints >= 5) {
        segregationPointsCounted = MAX_SCORE_CONSTANTS.SEGREGATION;
    }

    // calculate other counted points
    let tempPoints = 0;
    tempPoints = twoVariantsProvenPoints + twoVariantsNotProvenPoints;
    autosomalRecessivePointsCounted = tempPoints < MAX_SCORE_CONSTANTS.AUTOSOMAL_RECESSIVE ? tempPoints : MAX_SCORE_CONSTANTS.AUTOSOMAL_RECESSIVE;

    tempPoints = biochemicalFunctionPoints + proteinInteractionsPoints + expressionPoints;
    functionalPointsCounted = tempPoints < MAX_SCORE_CONSTANTS.FUNCTIONAL ? tempPoints : MAX_SCORE_CONSTANTS.FUNCTIONAL;

    tempPoints = patientCellsPoints + nonPatientCellsPoints;
    functionalAlterationPointsCounted = tempPoints < MAX_SCORE_CONSTANTS.FUNCTIONAL_ALTERATION ? tempPoints : MAX_SCORE_CONSTANTS.FUNCTIONAL_ALTERATION;

    tempPoints = animalModelPoints + cellCulturePoints + rescuePoints + rescueEngineeredPoints;
    modelsRescuePointsCounted = tempPoints < MAX_SCORE_CONSTANTS.MODELS_RESCUE ? tempPoints : MAX_SCORE_CONSTANTS.MODELS_RESCUE;

    /*****************************************************/
    /* Collect all case-control scores into an array     */
    /* Add all score values together                     */
    /*****************************************************/
    let caseControlScores = [], caseControlScoreSum = 0;
    caseControlTotal.forEach(item => {
        item.scores.forEach(score => {
            caseControlScores.push(score);
        });
    });
    caseControlScores.forEach(item => {
        if (item.score && item.score !== 'none') {
            caseControlPoints += parseFloat(item.score);
        }
    });
    caseControlCount = caseControlTotal.length ? caseControlTotal.length : 0;
    if (caseControlPoints < MAX_SCORE_CONSTANTS.CASE_CONTROL) {
        caseControlPointsCounted = caseControlPoints;
    } else {
        caseControlPointsCounted = MAX_SCORE_CONSTANTS.CASE_CONTROL;
    }

    return (
        <div>
            <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                <PanelGroup accordion>
                    <Panel title="New Summary & Provisional Classification" open>
                        <div className="form-group">
                            <div>
                                The calculated values below are based on the set of saved evidence that existed when the "Generate New Summary"
                                button was clicked. To save these values and the calculated or selected Classification, click "Save" below - they
                                will then represent the new "Last Saved Summary & Provisional Classification".
                            </div>
                            <div><span>&nbsp;</span></div>
                            <br />
                            <div className="container">
                                <table className="summary-matrix">
                                    <tbody>
                                        <tr>
                                            <td colSpan="5" className="header bg-color">Evidence Type</td>
                                            <td className="header num-col bg-color">Count</td>
                                            <td className="header num-col bg-color">Total Points</td>
                                            <td className="header num-col bg-color">Points Counted</td>
                                        </tr>
                                        <tr>
                                            <td rowSpan="8" className="header"><div className="rotate-text"><div>Genetic Evidence</div></div></td>
                                            <td rowSpan="6" className="header"><div className="rotate-text"><div>Case-Level</div></div></td>
                                            <td rowSpan="5" className="header"><div className="rotate-text"><div>Variant</div></div></td>
                                            <td rowSpan="3" className="header">Autosomal Dominant Disease</td>
                                            <td>Proband with other variant type with some evidence of gene impact</td>
                                            <td>{probandOtherVariantCount}</td>
                                            <td>{probandOtherVariantPoints}</td>
                                            <td>{probandOtherVariantPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td>Proband with predicted or proven null variant</td>
                                            <td>{probandNullVariantCount}</td>
                                            <td>{probandNullVariantPoints}</td>
                                            <td>{probandNullVariantPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td>Variant is <i>de novo</i></td>
                                            <td>{variantDenovoCount}</td>
                                            <td>{variantDenovoPoints}</td>
                                            <td>{variantDenovoPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td rowSpan="2" className="header">Autosomal Recessive Disease</td>
                                            <td>Two variants (not prediced/proven null) with some evidence of gene impact in <i>trans</i></td>
                                            <td>{twoVariantsNotProvenCount}</td>
                                            <td>{twoVariantsNotProvenPoints}</td>
                                            <td rowSpan="2">{autosomalRecessivePointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td>Two variants in <i>trans</i> and at least one <i>de novo</i> or a predicted/proven null variant</td>
                                            <td>{twoVariantsProvenCount}</td>
                                            <td>{twoVariantsProvenPoints}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="3" className="header">Segregation</td>
                                            <td>{segregationCount}</td>
                                            <td>{segregationPointsCounted}</td>
                                            <td>{segregationPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="4" className="header">Case-Control</td>
                                            <td>{caseControlCount}</td>
                                            <td>{caseControlPoints}</td>
                                            <td>{caseControlPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="6" className="header">Genetic Evidence Total</td>
                                            <td className="header">{geneticEvidenceTotalPoints}</td>
                                        </tr>
                                        <tr className="narrow-line"></tr>
                                        <tr>
                                            <td rowSpan="10" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
                                            <td colSpan="3" rowSpan="3" className="header">Functional</td>
                                            <td>Biochemical Functions</td>
                                            <td>{biochemicalFunctionCount}</td>
                                            <td>{biochemicalFunctionPoints}</td>
                                            <td rowSpan="3">{functionalPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td>Protein Interactions</td>
                                            <td>{proteinInteractionsCount}</td>
                                            <td>{proteinInteractionsPoints}</td>
                                        </tr>
                                        <tr>
                                            <td>Expression</td>
                                            <td>{expressionCount}</td>
                                            <td>{expressionPoints}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="3" rowSpan="2" className="header">Functional Alteration</td>
                                            <td>Patient Cells</td>
                                            <td>{patientCellsCount}</td>
                                            <td>{patientCellsPoints}</td>
                                            <td rowSpan="2">{functionalAlterationPointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td>Non-patient Cells</td>
                                            <td>{nonPatientCellsCount}</td>
                                            <td>{nonPatientCellsPoints}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="3" rowSpan="4" className="header">Models & Rescue</td>
                                            <td>Animal Model</td>
                                            <td>{animalModelCount}</td>
                                            <td>{animalModelPoints}</td>
                                            <td rowSpan="4">{modelsRescuePointsCounted}</td>
                                        </tr>
                                        <tr>
                                            <td>Cell Culture Model System</td>
                                            <td>{cellCultureCount}</td>
                                            <td>{cellCulturePoints}</td>
                                        </tr>
                                        <tr>
                                            <td>Rescue in Animal Model</td>
                                            <td>{rescueCount}</td>
                                            <td>{rescuePoints}</td>
                                        </tr>
                                        <tr>
                                            <td>Rescue in Engineered Equivalent</td>
                                            <td>{rescueEngineeredCount}</td>
                                            <td>{rescueEngineeredPoints}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="6" className="header">Experimental Evidence Total</td>
                                            <td className="header">{experimentalEvidenceTotalPoints}</td>
                                        </tr>
                                        <tr>
                                            <td colSpan="7" className="header">Total Points</td>
                                            <td className="header">{totalPoints}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <br />
                            <br />
                            <div className="row">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Calculated&nbsp;
                                        <a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:
                                    </strong>
                                </div>
                                <div className="col-sm-7">
                                    {this.state.autoClassification}
                                </div>
                            </div>
                            { userAssessments.segCntdct>0 || userAssessments.variantCntdct || userAssessments.expCntdct ?
                                <div className="row">
                                    <div className="col-sm-5">&nbsp;</div>
                                    <div className="col-sm-7">
                                        <strong style={{'color':'#f00'}}>Note: One or more pieces of evidence in this record was assessed as "Contradicts".</strong>
                                    </div>
                                </div>
                             : null
                            }
                            <br />
                            <Input type="select" ref="alteredClassification"
                                label={<strong>Select Provisional&nbsp;<a href="/provisional-curation/?classification=display" target="_block">Clinical Validity Classification</a>:</strong>}
                                labelClassName="col-sm-5 control-label"
                                wrapperClassName="col-sm-7" defaultValue={this.state.autoClassification}
                                groupClassName="form-group">
                                <option value="Definitive">Definitive</option>
                                <option value="Strong">Strong</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Limited">Limited</option>
                                <option value="No Evidence">No Reported Evidence</option>
                                <option value="Disputed">Disputed</option>
                                <option value="Refuted">Refuted</option>
                            </Input>
                            <Input type="textarea" ref="reasons" label="Explain Reason(s) for Change:" rows="5" labelClassName="col-sm-5 control-label"
                                wrapperClassName="col-sm-7" groupClassName="form-group" error={this.getFormError('reasons')}
                                clearError={this.clrFormErrors.bind(null, 'reasons')} />
                            <div className="col-sm-5"><span className="pull-right">&nbsp;</span></div>
                            <div className="col-sm-7">
                                <span>
                                Note: If your selected Clinical Validity Classification is different from the Calculated value, provide a reason to expain why you changed it.
                                </span>
                            </div>
                        </div>
                    </Panel>
                </PanelGroup>
                <div className='modal-footer'>
                    <Input type="button" inputClassName="btn-default btn-inline-spacer" clickHandler={this.cancelForm} title="Cancel" />
                    <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="Save" />
                </div>
            </Form>
        </div>
    );
};

// Method to return a list of experimental evidence scores
// by score status
function getExpScoreList(evidenceList) {
    let newArray = [];
    evidenceList.forEach(evidence => {
        evidence.scores.forEach(item => {
            if (item.scoreStatus === 'Score') {
                newArray.push(item);
            }
        });
    });
    return newArray;
}

// Function to check if an itme exists in an array(list)
var in_array = function(item, list) {
    for(var i in list){
        if (list[i] == item) {
            return true;
        }
    }
    return false;
};

// Function to get earliest year of selected publications
var get_earliest_year = function(earliest, dateStr) {
    var pattern = new RegExp(/^\d\d\d\d/);
    var theYear = pattern.exec(dateStr);
    if (theYear && theYear.valueOf() < earliest.valueOf()) {
        return theYear;
    }
    return earliest;
};

// Funtion to separate proband individuals by assessment values
// target: object containing separated proband individuals
// branch: individual array in annotation/group/family
// article: object containing publication info
// idList: Assessment array
var filter = function(target, branch, article, idList) {
    var allVariants = target['allVariants'],
        sptVariants = target['sptVariants'],
        rvwVariants = target['rvwVariants'],
        cntdctVariants = target['cntdctVariants'],
        patho_spt = idList['support'],
        patho_rvw = idList['review'],
        patho_cntdct = idList['contradict'];

    branch.forEach(function(obj) {
        if (obj.proband && obj.variants && obj.variants.length > 0) {
            // counting at probands only
            var allSupported = true;
            for (var j in obj.variants) {
                // collect all distinct variants from proband individuals
                if (!in_array(obj.variants[j].uuid, allVariants)) {
                    allVariants.push(obj.variants[j].uuid);
                }

                // collect variant assessments, separated by 3 different values.
                if (!in_array(obj.variants[j].uuid, patho_spt)) {
                    allSupported = false;

                    if (in_array(obj.variants[j].uuid, patho_rvw) && !in_array(obj.variants[j].uuid, rvwVariants)) {
                        rvwVariants.push(obj.variants[j].uuid);
                    }
                    else if (in_array(obj.variants[j].uuid, patho_cntdct) && !in_array(obj.variants[j].uuid, cntdctVariants)) {
                        cntdctVariants.push(obj.variants[j].uuid);
                    }
                }
                else {
                    if (!in_array(obj.variants[j].uuid, sptVariants)) {
                        sptVariants.push(obj.variants[j].uuid);
                    }
                }
            }

            if (allSupported) {
                target["probandInd"].push(
                    {
                        "evidence":obj.uuid,
                        "pmid":article.pmid,
                        "date": article.date
                    }
                );
            }

            target["allVariants"] = allVariants;
            target["sptVariants"] = sptVariants;
            target["rvwVariants"] = rvwVariants;
            target["cntdctVariants"] = cntdctVariants;
        }
    });

    return target;
};


// Display a history item for adding a family
var ProvisionalAddModHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var meta = history.meta.provisionalClassification;
        var gdm = meta.gdm;

        return (
            <div>
                <span><a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'} title="View/edit provisional classification">Provisional classification</a> {meta.alteredClassification.toUpperCase()} added to </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ProvisionalAddModHistory, 'provisionalClassification', 'add');


// Display a history item for modifying a family
var ProvisionalModifyHistory = React.createClass({
    render: function() {
        var history = this.props.history;
        var meta = history.meta.provisionalClassification;
        var gdm = meta.gdm;

        return (
            <div>
                <span><a href={'/provisional-curation/?gdm=' + gdm.uuid + '&edit=yes'} title="View/edit provisional classification">Provisional classification</a> modified to {meta.alteredClassification.toUpperCase()} for </span>
                <strong>{gdm.gene.symbol}-{gdm.disease.term}-</strong>
                <i>{gdm.modeInheritance.indexOf('(') > -1 ? gdm.modeInheritance.substring(0, gdm.modeInheritance.indexOf('(') - 1) : gdm.modeInheritance}</i>
                <span>; {moment(history.date_created).format("YYYY MMM DD, h:mm a")}</span>
            </div>
        );
    }
});

globals.history_views.register(ProvisionalModifyHistory, 'provisionalClassification', 'modify');


// Display a history item for deleting a family
var ProvisionalDeleteHistory = React.createClass({
    render: function() {
        return <div>PROVISIONALDELETE</div>;
    }
});

globals.history_views.register(ProvisionalDeleteHistory, 'provisionalClassification', 'delete');
