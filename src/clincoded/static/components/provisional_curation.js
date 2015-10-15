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
    mixins: [FormMixin, RestMixin, CurationMixin],

    contextTypes: {
        navigate: React.PropTypes.func,
        closeModal: React.PropTypes.func
    },

    queryValues: {},

    getInitialState: function() {
        return {
            //urlFrom: document.referrer,
            user: null, // login user uuid
            gdm: null, // current gdm object, must be null initially.
            provisional: null, // login user's existing provisional object, must be null initially.
            assessments: null,  // list of all assessments, must be nul initially.
            totalScore: null,
            autoClassification: null
        };
    },

    loadData: function() {
        var gdmUuid = this.queryValues.gdmUuid;

        // get gdm and all assessments from db.
        var uris = _.compact([
            gdmUuid ? '/gdm/' + gdmUuid : '', // search for entire data set of the gdm
            gdmUuid ? '/assessments/' : '' // search for all assessments from db
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
                    case 'assessment_collection':
                        stateObj.assessments = data['@graph'];
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

            this.setState(stateObj);

            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    componentDidMount: function() {
        //this.clrFormErrors.bind(null, 'reasons');
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
                        this.resetAllFormValues();
                        //this.context.navigate(backUrl);
                        window.history.go(-1);
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = : %o', e);
                    });
                }
                else { // save a new calculation and provisional classification
                    this.postRestData('/provisional/', newProvisional).then(data => {
                        return data['@graph'][0];
                    }).then(savedProvisional => {
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
                        //this.context.navigate(backUrl);
                        window.history.go(-1);
                    }).catch(function(e) {
                        console.log('PROVISIONAL GENERATION ERROR = %o', e);
                    });
                }
            }
        }
    },

    cancelForm: function(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        // click Cancel button will go back to view - current
        if (e.detail >= 1){
            window.history.go(-1);
            //var backUrl = '/curation-central/?gdm=' + this.state.gdm.uuid;
            //backUrl += this.queryValues.pmid ? '&pmid=' + this.queryValues.pmid : '';
            //this.context.navigate(backUrl);
        }
    },

    render: function() {
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        this.queryValues.pmid = queryKeyValue('pmid', this.props.href) ? queryKeyValue('pmid', this.props.href) : '';
        var calculate = queryKeyValue('calculate', this.props.href);
        var edit = queryKeyValue('edit', this.props.href);
        var session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        var gdm = this.state.gdm ? this.state.gdm : null;
        var provisional = this.state.provisional ? this.state.provisional : null;

        return (
            <div>
                { gdm ?
                    <div>
                        <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} />
                        <div className="container">
                            {
                                (provisional && edit === 'yes') ?
                                EditCurrent.call(this)
                                :
                                (   calculate === 'yes' ?
                                    <div>
                                        <h1>Curation Summary and Provisional Classification</h1>
                                        {
                                            provisional ?
                                            <PanelGroup accordion>
                                                <Panel title="Currently Saved Calculation and Classification" open>
                                                    <div className="row">
                                                            <div className="col-sm-5"><strong>Generated:</strong></div>
                                                            <div className="col-sm-7"><span>{moment(provisional.last_modified).format("YYYY MMM DD, h:mm a")}</span></div>
                                                        </div>
                                                        <div className="row">
                                                            <div className="col-sm-5"><strong>Total Score:</strong></div>
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
                                                    </Panel>
                                                </PanelGroup>
                                            : null
                                        }
                                        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                                            {NewCalculation.call(this)}
                                            <div className='modal-footer'>
                                                <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                                                <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="Save" />
                                            </div>
                                        </Form>
                                    </div>
                                    :
                                    null
                                )
                            }
                        </div>
                    </div>
                    : null
                }
            </div>
        );
    }
});

globals.curator_page.register(ProvisionalCuration,  'curator_page', 'provisional-curation');

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
                            <div className="col-sm-5"><strong className="pull-right">otal Score:</strong></div>
                            <div className="col-sm-7"><span>{this.state.totalScore}</span></div>
                        </div>
                        <div className="row">
                            <div className="col-sm-5">
                                <strong className="pull-right">Calculated Clinical Validity Classification:</strong
                            ></div>
                            <div className="col-sm-7"><span>{this.state.autoClassification}</span></div>
                        </div>
                        <div className="row">
                            <Input type="select" ref="alteredClassification" label="Select Provisional Clinical Validity Classification:"
                                value={alteredClassification} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
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
                    <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                    <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="Save" />
                </div>
            </Form>
        </div>
    );
};


var NewCalculation = function() {
    var gdm = this.state.gdm;
    var assessments = this.state.assessments;

// Gegerate pathogenicity id list and collect experimental id list from all assessments
// condition: assessed by login user, value as Supports, current gdm
// count piece number at each experimental type and add score at 3 different categories
    var pathoList = [];
    //var expList = [];
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
    }
    for (var i in assessments) {
        var value = assessments[i]['value'];
        var owner = assessments[i]['submitted_by']['uuid'];
        var gdmAssessed = assessments[i]['evidence_gdm'];
        var evid_type = assessments[i]['evidence_type'];
        var evid_id = assessments[i]['evidence_id'];

        if (gdmAssessed === gdm.uuid && owner === this.state.user && value === 'Supports') {
            // Generate pathoList
            if (evid_type === 'Pathogenicity' || evid_type === 'pathogenicity') {
                pathoList.push({"patho":evid_id, "owner":owner, "value":value});
            }
        }
    }

// Generate variantIdList
    var gdmPathoList = gdm.variantPathogenicity;
    var variantIdList = [];
    for (var i in gdmPathoList) {
        // pick up variants from login user's pathogenicity assessed as Supports.
        if (gdmPathoList[i].assessments && gdmPathoList[i].assessments.length > 0) {
            for (var j in gdmPathoList[i].assessments) {
                if (gdmPathoList[i].assessments[j].submitted_by.uuid === this.state.user && gdmPathoList[i].assessments[j].value === 'Supports') {
                    var variantUuid = gdmPathoList[i].variant['@id'].substr(10).replace('/', '');
                    variantIdList.push(variantUuid);
                    break;
                }
            }
        }
    }

// Collect all individuals in all annotations, pass to function filter with article info (experimental data is not necessary)
    var annotations = gdm.annotations;
    var familiesCollected = [];
    var individualsCollected = [];
    for (var i in annotations) {
        if (annotations[i].groups && annotations[i].groups.length > 0) {
            var groups = annotations[i].groups;
            for (var j in groups) {
                if (groups[j].familyIncluded && groups[j].familyIncluded.length > 0) {
                    for (var k in groups[j].familyIncluded) {
                        if (groups[j].familyIncluded[k].individualIncluded && groups[j].familyIncluded[k].individualIncluded.length > 0) {
                            individualsCollected = filter(individualsCollected, groups[j].familyIncluded[k].individualIncluded, annotations[i].article, variantIdList); // same as above
                        }
                    }
                }
                    //familiesCollected = filter(familiesCollected, groups[j].familyIncluded, annotations[i].article, variantIdList);
                if (groups[j].individualIncluded && groups[j].individualIncluded.length > 0) {
                    individualsCollected = filter(individualsCollected, groups[j].individualIncluded, annotations[i].article, variantIdList);
                }
            }
        }
        if (annotations[i].families && annotations[i].families.length > 0) {
            for (var j in annotations[i].families) {
                if (annotations[i].families[j].individualIncluded && annotations[i].families[j].individualIncluded.length > 0) {
                    individualsCollected = filter(individualsCollected, annotations[i].families[j].individualIncluded, annotations[i].article, variantIdList);
                }
            }
            //familiesCollected = filter(familiesCollected, annotations[i].families, annotations[i].article, variantIdList);
        }
        if (annotations[i].individuals && annotations[i].individuals.length > 0) {
            individualsCollected = filter(individualsCollected, annotations[i].individuals, annotations[i].article, variantIdList);
        }

        // collect experimental assessed support
        if (annotations[i].experimentalData && annotations[i].experimentalData.length > 0) {
            for (var j in annotations[i].experimentalData) {
                var exp = annotations[i].experimentalData[j];
                var subTypeKey = exp.evidenceType;

                if (exp.assessments && exp.assessments.length > 0) {
                    for (var j in exp.assessments) {
                        if (exp.assessments[j].submitted_by.uuid === this.state.user && exp.assessments[j].value === 'Supports') {
                            if (exp.evidenceType === 'Expression') {
                                expType[subTypeKey] += 1;
                                exp_scores[0] += 0.5;
                                //if (!in_array(evid_id, expList)) {
                                //    expList.push(evid_id);
                                //}
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
                            break;
                        }
                    }
                }
            }
        }
    }

// Compare designed max value at each score category and get the total experimental score
    var finalExperimentalScore = 0;
    for (var i in exp_scores) {
        var max = 2; // set max value for each type
        if (i == 2) {
            max = 4;
        }
        finalExperimentalScore += (exp_scores[i] <= max) ? exp_scores[i] : max; // not more than the max
    }

// Collect articles and find the earliest publication year
    var articleCollected = [];
    var year = new Date();
    var earliest = year.getFullYear();
    for (var i in familiesCollected) {
        if (!in_array(familiesCollected[i].pmid, articleCollected) && familiesCollected[i].pmid != '') {
            articleCollected.push(familiesCollected[i].pmid);
            earliest = get_earliest_year(earliest, familiesCollected[i].date);
        }
    }
    for (var i in individualsCollected) {
        if (!in_array(individualsCollected[i].pmid, articleCollected) && individualsCollected[i].pmid != '') {
            articleCollected.push(individualsCollected[i].pmid);
            earliest = get_earliest_year(earliest, individualsCollected[i].date);
        }
    }

// get final scores
    var currentYear = year.getFullYear();
    //var years = (currentYear.valueOf() - earliest.valueOf()) + ' = ' + currentYear + ' - ' + earliest;
    var time = currentYear.valueOf() - earliest.valueOf();
    var timeScore = 0, probandScore = 0, pubScore = 0, expScore = 0;
    if (time >= 3) {
        timeScore = 2;
    }
    else if (time >= 1) {
        timeScore = 1;
    }
    else {
        timeScore = 0;
    }

    var proband = count_proband(familiesCollected) + count_proband(individualsCollected);
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

    var expScore = 0;
    if (finalExperimentalScore >= 6) {
        expScore = 6;
    }
    else {
        expScore = finalExperimentalScore;
    }

    var pubScore = 0;
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
    var autoClassification = 'No Reported Evidence';
    if (totalScore > 16){
        autoClassification = 'Definitive';
    }
    else if (totalScore > 12) {
        autoClassification = 'Strong';
    }
    else if (totalScore > 9) {
        autoClassification = 'Moderate';
    }
    else if (totalScore > 1) {
        autoClassification = 'Limited';
    }

    this.state.totalScore = totalScore;
    this.state.autoClassification = autoClassification;

    return (
                <PanelGroup accordion>
                    <Panel title="New Calculation and Classification" open>
                        <div className="form-group">
                            <div>
                                The calculated values below are based on the set of saved evidence that exists when the "Generate New Summary"
                                is clicked. To save these values as the "Current Summary & Provisional Classification" calculated values and make
                                any changes to the Provisional Classification, you must click the Save button below.
                            </div>
                            <div><span>&nbsp;</span></div>
                            <div className="row">
                                <div className="col-sm-5"><strong className="pull-right">Total Score:</strong></div>
                                <div className="col-sm-7"><strong>{this.state.totalScore}</strong></div>
                            </div>
                            <br />
                            <div className="row">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Scoring Details:</strong>
                                </div>
                                <div className="col-sm-7">
                                    <table className="summary-scoring">
                                        <tr>
                                            <td className="td-title"><strong>Evidence</strong></td>
                                            <td className="td-score"><strong>Count</strong></td>
                                            <td className="td-score"><strong>Score</strong></td>
                                        </tr>
                                        <tr><td cols="3">&nbsp;</td></tr>
                                        {Object.keys(expType).map(function(key) {
                                            return (
                                                expType[key] > 0 ?
                                                    <tr>
                                                        <td className="td-title">{key}</td>
                                                        <td className="td-score">{expType[key]}</td>
                                                        <td className="td-score">&nbsp;</td>
                                                    </tr>
                                                :
                                                null
                                            );
                                        })}
                                        <tr><td className="td-title"><strong>Final Experimental Score</strong></td>
                                            <td className="td-score"><span>&nbsp;</span></td>
                                            <td className="td-score"><strong>{expScore}</strong></td>
                                        </tr>
                                        <tr><td cols="3"><strong>&nbsp;</strong></td></tr>
                                        <tr>
                                            <td className="td-title">Number of probands with variants assessed as "Supports" pathogenicity</td>
                                            <td className="td-score">{proband}</td>
                                            <td className="td-score">&nbsp;</td>
                                        </tr>
                                        <tr>
                                            <td className="td-title"><strong>Proband Score</strong></td>
                                            <td className="td-score"><span>&nbsp;</span></td>
                                            <td className="td-score"><strong>{probandScore}</strong></td>
                                        </tr>
                                        <tr><td cols="3"><span>&nbsp;</span></td></tr>
                                        <tr>
                                            <td className="td-title">Clinical Publications</td>
                                            <td className="td-score">{articleCollected.length}</td>
                                            <td className="td-score">&nbsp;</td>
                                        </tr>
                                        <tr>
                                            <td className="td-title"><strong>Publication Score</strong></td>
                                            <td className="td-score">&nbsp;</td>
                                            <td className="td-score"><strong>{pubScore}</strong></td>
                                        </tr>
                                        <tr><td cols="3"><span>&nbsp;</span></td></tr>
                                        <tr>
                                            <td className="td-title">Number of years since first report</td>
                                            <td className="td-score">{time}</td>
                                            <td className="td-score">&nbsp;</td>
                                        </tr>
                                        <tr>
                                            <td className="td-title"><strong>Time Score (First Clinical Report)</strong></td>
                                            <td className="td-score">&nbsp;</td>
                                            <td className="td-score"><strong>{timeScore}</strong></td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                            <br />
                            <div className="row">
                                <div className="col-sm-5">
                                    <strong className="pull-right">Calculated Clinical Validity Classification:</strong>
                                </div>
                                <div className="col-sm-7"><span>{this.state.autoClassification}</span></div>
                            </div>
                            <br />
                            <Input type="select" ref="alteredClassification" label="Select Provisional Clinical Validity Classification:"
                                wrapperClassName="col-sm-7" defaultValue={this.state.autoClassification} labelClassName="col-sm-5 control-label"
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
                                **Note: If your selected Clinical Validity Classification is different from the Calculated value, provide a reason to expain why you changed it.
                                </span>
                            </div>
                        </div>
                    </Panel>
                </PanelGroup>
    );
};

var in_array = function(item, list) {
    for(var i in list){
        if (list[i] == item) {
            return true;
        }
    }
    return false;
};

var get_earliest_year = function(earliest, dateStr) {
    var pattern = new RegExp(/^\d\d\d\d/);
    var theYear = pattern.exec(dateStr);
    if (theYear && theYear.valueOf() < earliest.valueOf()) {
        return theYear;
    }
    return earliest;
};

var filter = function(target, branch, article, idList) {
    branch.forEach(function(obj) {
        var variantIds = [];
        var allAssessed = false;

        if (obj.proband && obj.variants && obj.variants.length > 0) {
            // pick up proband individuals if all associated variant assessed Support
            for (var j in obj.variants) {
                if (!in_array(obj.variants[j].uuid, idList)) {
                    allAssessed = false;
                    break;
                }
                else {
                    allAssessed = true;
                    variantIds.push(obj.variants[j].uuid);
                }
            }

            if (allAssessed) {
                target.push(
                    {
                        "evidence":obj.uuid,
                        "variants":variantIds,
                        "pmid":article.pmid,
                        "date": article.date
                    }
                );
            }
        }
    });

    return target;
};

var count_proband = function(evidenceList) {
    var proband = 0;
    for (var i in evidenceList) {
        if (i === 0 || evidenceList[i].evidence !== '') {
            proband++;
        }
    }
    return proband;
};
