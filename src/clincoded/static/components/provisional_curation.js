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

// Generate a new summary for url ../provisional-curation/?gdm=GDMId&calculate=yes
// Calculation rules are defined by Small GCWG. See ClinGen_Interface_4_2015.pptx and Clinical Validity Classifications for detail
var NewCalculation = function() {
    var gdm = this.state.gdm;

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

    for (i in gdmPathoList) {
        var variantUuid = gdmPathoList[i].variant.uuid;
        // Collect login user's variant assessments, separated as 3 different values.
        if (gdmPathoList[i].assessments && gdmPathoList[i].assessments.length > 0) {
            for (j in gdmPathoList[i].assessments) {
                if (gdmPathoList[i].assessments[j].submitted_by.uuid === this.state.user && gdmPathoList[i].assessments[j].value === 'Supports') {
                    pathoVariantIdList['support'].push(variantUuid);
                }
                else if (gdmPathoList[i].assessments[j].submitted_by.uuid === this.state.user && gdmPathoList[i].assessments[j].value === 'Review') {
                    pathoVariantIdList['review'].push(variantUuid);
                }
                else if (gdmPathoList[i].assessments[j].submitted_by.uuid === this.state.user && gdmPathoList[i].assessments[j].value === 'Contradicts') {
                    pathoVariantIdList['contradict'].push(variantUuid);
                }
            }
        }
    }

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

    // scan gdm
    var annotations = gdm.annotations ? gdm.annotations : [];
    for (i in annotations) {
        var this_assessment;
        if (annotations[i].groups && annotations[i].groups.length > 0) {
            var groups = annotations[i].groups;
            for (j in groups) {
                if (groups[j].familyIncluded && groups[j].familyIncluded.length > 0) {
                    for (k in groups[j].familyIncluded) {

                        // collect individuals
                        if (groups[j].familyIncluded[k].individualIncluded && groups[j].familyIncluded[k].individualIncluded.length > 0) {
                            individualsCollected = filter(individualsCollected, groups[j].familyIncluded[k].individualIncluded, annotations[i].article, pathoVariantIdList);
                        }

                        // collection segregation assessments
                        if (groups[j].familyIncluded[k].segregation) {
                            userAssessments['segNot'] += 1;

                            if (groups[j].familyIncluded[k].segregation.assessments && groups[j].familyIncluded[k].segregation.assessments.length > 0) {
                                for (l in groups[j].familyIncluded[k].segregation.assessments) {
                                    this_assessment = groups[j].familyIncluded[k].segregation.assessments[l];
                                    if (this_assessment.submitted_by.uuid === this.state.user && this_assessment.value === 'Supports') {
                                        userAssessments['segSpt'] += 1;
                                    }
                                    else if (this_assessment.submitted_by.uuid === this.state.user && this_assessment.value === 'Review') {
                                        userAssessments['segReview'] += 1;
                                    }
                                    else if (this_assessment.submitted_by.uuid === this.state.user && this_assessment.value === 'Contradicts') {
                                        userAssessments['segCntdct'] += 1;
                                    }
                                }
                            }
                        }
                    }
                }
                if (groups[j].individualIncluded && groups[j].individualIncluded.length > 0) {
                    individualsCollected = filter(individualsCollected, groups[j].individualIncluded, annotations[i].article, pathoVariantIdList);
                }
            }
        }
        if (annotations[i].families && annotations[i].families.length > 0) {
            for (j in annotations[i].families) {
                if (annotations[i].families[j].individualIncluded && annotations[i].families[j].individualIncluded.length > 0) {
                    individualsCollected = filter(individualsCollected, annotations[i].families[j].individualIncluded, annotations[i].article, pathoVariantIdList);
                }

                if (annotations[i].families[j].segregation) {
                    userAssessments['segNot'] += 1;

                    if (annotations[i].families[j].segregation.assessments && annotations[i].families[j].segregation.assessments.length > 0) {
                        for (l in annotations[i].families[j].segregation.assessments) {
                            this_assessment = annotations[i].families[j].segregation.assessments[l];
                            if (this_assessment.submitted_by.uuid === this.state.user && this_assessment.value === 'Supports') {
                                userAssessments['segSpt'] += 1;
                            }
                            else if (this_assessment.submitted_by.uuid === this.state.user && this_assessment.value === 'Review') {
                                userAssessments['segReview'] += 1;
                            }
                            else if (this_assessment.submitted_by.uuid === this.state.user && this_assessment.value === 'Contradicts') {
                                userAssessments['segCntdct'] += 1;
                            }
                        }
                    }
                }
            }
        }
        if (annotations[i].individuals && annotations[i].individuals.length > 0) {
            individualsCollected = filter(individualsCollected, annotations[i].individuals, annotations[i].article, pathoVariantIdList);
        }

        // collect experimental assessed support, check matrix
        if (annotations[i].experimentalData && annotations[i].experimentalData.length > 0) {
            for (h in annotations[i].experimentalData) {
                var exp = annotations[i].experimentalData[h];
                var subTypeKey = exp.evidenceType;

                userAssessments['expNot'] += 1;

                if (exp.assessments && exp.assessments.length > 0) {
                    for (j in exp.assessments) {
                        if (exp.assessments[j].submitted_by.uuid === this.state.user && exp.assessments[j].value === 'Supports') {
                            if (exp.evidenceType === 'Expression') {
                                expType[subTypeKey] += 1;
                                exp_scores[0] += 0.5;
                            }
                            else if (exp.evidenceType === 'Protein Interactions') {
                                expType[subTypeKey] += 1;
                                exp_scores[0] += 0.5;

                            }
                            else if (exp.evidenceType === 'Biochemical Function') {
                                expType[subTypeKey] += 1;
                                exp_scores[0] += 0.5;
                            }
                            else if (exp.evidenceType === 'Functional Alteration' && exp.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Engineered equivalent') {
                                subTypeKey = subTypeKey + ' (Engineered equivalent)';
                                expType[subTypeKey] += 1;
                                exp_scores[1] += 0.5;
                            }
                            else if (exp.evidenceType === 'Functional Alteration' && exp.functionalAlteration.cellMutationOrEngineeredEquivalent === 'Patient cells') {
                                subTypeKey = subTypeKey + ' (Patient cells)';
                                expType[subTypeKey] += 1;
                                exp_scores[1] += 1;
                            }
                            else if (exp.evidenceType === 'Model Systems' && exp.modelSystems.animalOrCellCulture === 'Engineered equivalent') {
                                subTypeKey = subTypeKey + ' (Engineered equivalent)';
                                expType[subTypeKey] += 1;
                                exp_scores[2] += 1;
                            }
                            else if (exp.evidenceType === 'Model Systems' && exp.modelSystems.animalOrCellCulture === 'Animal model') {
                                subTypeKey = subTypeKey + ' (Animal model)';
                                expType[subTypeKey] += 1;
                                exp_scores[2] += 2;
                            }
                            else if (exp.evidenceType === 'Rescue' && exp.rescue.patientCellOrEngineeredEquivalent === 'Patient cells') {
                                subTypeKey = subTypeKey + ' (Patient cells)';
                                expType[subTypeKey] += 1;
                                exp_scores[2] += 2;
                            }
                            else if (exp.evidenceType === 'Rescue' && exp.rescue.patientCellOrEngineeredEquivalent === 'Engineered equivalent') {
                                subTypeKey = subTypeKey + ' (Engineered equivalent)';
                                expType[subTypeKey] += 1;
                                exp_scores[2] += 1;
                            }

                            userAssessments['expSpt'] += 1;
                        }
                        else if (exp.assessments[j].submitted_by.uuid === this.state.user && exp.assessments[j].value === 'Review') {
                            userAssessments['expReview'] += 1;
                        }
                        else if (exp.assessments[j].submitted_by.uuid === this.state.user && exp.assessments[j].value === 'Contradicts') {
                            userAssessments['expCntdct'] += 1;
                        }
                    }
                }
            }
        }
    }

    userAssessments['variantSpt'] = individualsCollected['sptVariants'].length;
    userAssessments['variantReview'] = individualsCollected['rvwVariants'].length;
    userAssessments['variantCntdct'] = individualsCollected['cntdctVariants'].length;
    userAssessments['variantNot'] = individualsCollected['allVariants'].length - userAssessments['variantSpt'] - userAssessments['variantReview'] - userAssessments['variantCntdct'];
    userAssessments['expNot'] = userAssessments['expNot'] - userAssessments['expSpt'] - userAssessments['expReview'] - userAssessments['expCntdct'];
    userAssessments['segNot'] = userAssessments['segNot'] - userAssessments['segSpt'] - userAssessments['segReview'] - userAssessments['segCntdct'];

    // Compare designed max value at each score category and get the total experimental score
    var finalExperimentalScore = 0;
    for (i in exp_scores) {
        var max = 2; // set max value for each type
        if (i == 2) {
            max = 4;
        }
        finalExperimentalScore += (exp_scores[i] <= max) ? exp_scores[i] : max; // not more than the max
    }

    // Collect articles and find the earliest publication year
    var proband = 0;
    var articleCollected = [];
    var year = new Date();
    var earliest = year.getFullYear();
    for (i in individualsCollected['probandInd']) {
        if (individualsCollected['probandInd'][i].pmid && individualsCollected['probandInd'][i].pmid != '') {
            proband += 1;
            if (!in_array(individualsCollected['probandInd'][i].pmid, articleCollected)) {
                articleCollected.push(individualsCollected['probandInd'][i].pmid);
                earliest = get_earliest_year(earliest, individualsCollected['probandInd'][i].date);
            }
        }
    }

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

    if (finalExperimentalScore >= 6) {
        expScore = 6;
    }
    else {
        expScore = finalExperimentalScore;
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

    return (
        <div>
            <PanelGroup accordion>
                <Panel title="New Count of Assessments" open>
                    <table className="assessment-counting">
                        <tbody>
                            <tr>
                                <td>&nbsp;</td>
                                <td><strong>Segregation</strong></td>
                                <td><strong>Variant (proband only)</strong></td>
                                <td><strong>Experimental</strong></td>
                            </tr>
                            <tr>
                                <td className="values"><strong>Supports</strong></td>
                                <td>{userAssessments.segSpt}</td>
                                <td>{userAssessments.variantSpt}</td>
                                <td>{userAssessments.expSpt}</td>
                            </tr>
                            <tr>
                                <td className="values"><strong>Review</strong></td>
                                <td>{userAssessments.segReview}</td>
                                <td>{userAssessments.variantReview}</td>
                                <td>{userAssessments.expReview}</td>
                                <td>{userAssessments.v}</td>
                            </tr>
                            <tr>
                                <td className="values"><strong>Contradicts</strong></td>
                                <td >{userAssessments.segCntdct}</td>
                                <td>{userAssessments.variantCntdct}</td>
                                <td>{userAssessments.expCntdct}</td>
                            </tr>
                            <tr>
                                <td className="values"><strong>Not Assessed</strong></td>
                                <td >{userAssessments.segNot}</td>
                                <td>{userAssessments.variantNot}</td>
                                <td>{userAssessments.expNot}</td>
                            </tr>
                            <tr>
                                <td colSpan="4">&nbsp;</td>
                            </tr>
                        </tbody>
                    </table>
                </Panel>
            </PanelGroup>
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
                                            <td className="title larger col-header area-bottom-cells"colSpan="3"></td>
                                            <td className="title larger col-header score-cols area-bottom-cells">Count</td>
                                            <td className="title larger col-header score-cols area-bottom-cells">Total Points</td>
                                            <td className="title larger col-header score-cols area-bottom-cells">Points Counted</td>
                                        </tr>
                                        <tr className="narrow-line"></tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td colSpan="3" className="title larger row-header">Genetic Evidence</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td colSpan="3" className="title row-header">Case Level</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td colSpan="2" className="title row-header">Variant</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="subtitle row-header">Proband with other variant type with some evidence of gene impact</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="subtitle row-header">Proband with predicted or proven null variant</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="subtitle row-header">Variant is <i>de novo</i></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="subtitle row-header">2 variants (not prediced/proven null) with some evidence of gene impact in <i>trans</i></td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="subtitle row-header">Two variants in <i>trans</i> and at least one <i>de novo</i> or a predicted/proven null variant</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td colSpan="2" className="title row-header">Segregation</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td colSpan="3" className="title row-header area-bottom-cells">Case-Control</td>
                                            <td className="area-bottom-cells"></td>
                                            <td className="area-bottom-cells"></td>
                                            <td className="area-bottom-cells"></td>
                                        </tr>
                                        <tr className="narrow-line"></tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td colSpan="3" className="title larger row-header">Experimental Evidence</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td colSpan="2" className="title row-header">Function</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="title row-header">Biochemical Functions</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="title row-header">Protein Interactions</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td className="left-padding"></td>
                                            <td className="title row-header">Expression</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td colSpan="2" className="title row-header">Functional Alteration</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding"></td>
                                            <td colSpan="2" className="title row-header">Model Systems</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
                                        </tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td className="left-padding area-bottom-cells"></td>
                                            <td colSpan="2" className="title row-header area-bottom-cells">Rescue</td>
                                            <td className="area-bottom-cells"></td>
                                            <td className="area-bottom-cells"></td>
                                            <td className="area-bottom-cells"></td>
                                        </tr>
                                        <tr className="narrow-line"></tr>
                                        <tr className="area-top-cells count-title-row">
                                            <td colSpan="3" className="title larger row-header">Total Points</td>
                                            <td></td>
                                            <td></td>
                                            <td></td>
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
