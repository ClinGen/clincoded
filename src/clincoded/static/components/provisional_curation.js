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

var CurationMixin = curator.CurationMixin;
var RecordHeader = curator.RecordHeader;
var PmidSummary = curator.PmidSummary;
var PmidDoiButtons = curator.PmidDoiButtons;
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
            '/gdm/' + gdmUuid, // search for entire data set of the gdm
            '/assessments/' // search for all assessments from db
        ]);
        this.getRestDatas(
            uris
        ).then(datas => {
            var stateObj = {};
            stateObj.user = this.props.session.user_properties.uuid; //'e49d01a5-51f7-4a32-ba0e-b2a71684e4aa'
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

            // search for existing provisional
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length > 0) {
                for (var i in stateObj.gdm.provisionalClassifications) {
                    var owner = stateObj.gdm.provisionalClassifications[i].submitted_by;
                    if (owner.uuid == stateObj.user) { // find
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
        this.loadData();
    },

    submitForm: function(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        // Save all form values from the DOM.
        this.saveAllFormValues();
        if (this.validateDefault()) {
            var newProvisional = this.state.provisional ? curator.flatten(this.state.provisional) : {};
            newProvisional.totalScore = Number(this.state.totalScore);
            newProvisional.autoClassification = this.state.autoClassification;
            newProvisional.alteredClassification = (this.getFormValue('alteredClassification') !== 'none') ? this.getFormValue('alteredClassification') : '';
            newProvisional.reasons = this.getFormValue('reasons');

            if (this.state.provisional) { // edit existing provisional
                this.putRestData('/provisional/' + this.state.provisional.uuid, newProvisional).then(data => {
                    this.state.provisional = data['@graph'][0];
                }).catch(function(e) {
                    console.log('Provisional creation error = : %o', e);
                });
            }
            else { // save a new calculation and provisional classification
                this.postRestData('/provisional/', newProvisional).then(data => {
                    return data['@graph'][0];
                }).then(savedProvisional => {
                    this.state.provisional = savedProvisional;

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
                    this.state.gdm = savedGdm;
                }).catch(function(e) {
                    console.log('Provisional creation error = : %o', e);
                });
            }
        }
        this.resetAllFormValues();
        window.history.go(-1);
        //this.context.navigate('/provisional-curation/?gdm=' + this.state.gdm.uuid + '&view=yes');
        //this.setState();
    },

    cancelForm: function(e) {
        // Don't run through HTML submit handler
        e.preventDefault();
        e.stopPropagation();

        // click Cancel button will go back to view - current
        if (e.detail >= 1){
            window.history.go(-1);
            //this.context.navigate('/provisional-curation/?gdm=' + this.state.gdm.uuid);
        }
    },

    render: function() {
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        var calculate = queryKeyValue('calculate', this.props.href);
        var edit = queryKeyValue('edit', this.props.href);
        //this.queryValues.rerun = rerun;

        var alteredClassification = (this.state.provisional && this.state.provisional.alteredClassification) ? this.state.provisional.alteredClassification : '';
        var reasons = (this.state.provisional && this.state.provisional.reasons) ? this.state.provisional.reasons : '';

        var families = count_proband(this.state.familiesCollected);
        var individuals = count_proband(this.state.individualsCollected);
        return (
            <div>
                {   this.state.gdm ?
                    <div>
                        <RecordHeader gdm={this.state.gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={this.props.session} />
                        <div className="container">
                            {   (this.state.provisional && edit === 'yes') ?
                                EditCurrent.call(this)
                                :
                                (
                                    calculate === 'yes' ?
                                    NewCalculation.call(this)
                                    :
                                    Demo.call(this)
                                )
                            }
                        </div>
                    </div>
                    :
                    null
                }
            </div>
        );
    }
});

globals.curator_page.register(ProvisionalCuration,  'curator_page', 'provisional-curation');

var Demo = function() {
    return (
        <div>
            <h1>Curation Summary and Provisional Classification</h1>
            <div>
                <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
                    <PanelGroup accordion>
                        <Panel title="New calculation and Classification" open>
                            <div className="form-group">
                                <div className="row">
                                    <div className="col-sm-5"><strong className="pull-right">Total Score:</strong></div>
                                    <div className="col-sm-7"><strong>1000</strong></div>
                                </div>
                                <br />
                                <div className="row">
                                    <div className="col-sm-5">
                                        <strong className="pull-right">Scoring Details:</strong>
                                    </div>
                                    <div className="col-sm-7"><span>&nbsp;</span></div>
                                </div>
                                <div className="row">
                                    <div className="col-sm-5">
                                        <strong className="pull-right">&nbsp;</strong>
                                    </div>
                                    <div className="col-sm-7">
                                        <table className="summary-scoring">
                                            <tr><td className="td-title"><strong>Final Experimental Score:</strong></td>
                                                <td className="td-score"><strong>400</strong></td>
                                            </tr>
                                            <tr><td className="td-title">Expression: 100 (0.5 each)</td><td className="td-score">50</td></tr>
                                            <tr><td className="td-title">Protein interactions: 100 (0.5 each)</td><td className="td-score">50</td></tr>
                                            <tr><td className="td-title">Biochemical function: 100 (0.5 each)</td><td className="td-score">50</td></tr>
                                            <tr><td className="td-title">Functional alteration of gene or gene product: 100 (1 each)</td><td className="td-score">100</td></tr>
                                            <tr><td className="td-title">Model systems: 100 (2 each)</td><td className="td-score">200</td></tr>
                                            <tr><td className="td-title">Rescue: 100 (2 each)</td><td className="td-score">200</td></tr>
                                            <tr><td cols="2"><strong>&nbsp;</strong></td></tr>
                                            <tr><td className="td-title"><strong>Proband Score:</strong></td><td className="td-score"><strong>300</strong></td></tr>
                                            <tr><td className="td-title"># Variant assessed</td><td className="td-score">100</td></tr>
                                            <tr><td className="td-title"># Family counted</td><td className="td-score">100</td></tr>
                                            <tr><td className="td-title"># Individual counted</td><td className="td-score">100</td></tr>
                                            <tr><td cols="2"><span>&nbsp;</span></td></tr>
                                            <tr><td className="td-title"><strong>Publication Score:</strong></td><td className="td-score"><strong>200</strong></td></tr>
                                            <tr><td className="td-title"># Article</td><td className="td-score">100</td></tr>
                                            <tr><td cols="2"><span>&nbsp;</span></td></tr>
                                            <tr><td className="td-title"><strong>Time Score:</strong></td><td className="td-score"><strong>100</strong></td></tr>
                                            <tr><td className="td-title">Earliest Year</td><td className="td-score">{'0001'}</td></tr>
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
                                <Input type="select" ref="alteredClassification" label="Change Provisional Clinical Validity Classification:" defaultValue="none"
                                    labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                                    <option value="none">No Selection</option>
                                    <option disabled="disabled"></option>
                                    <option value="Definitive">Definitive</option>
                                    <option value="Strong">Strong</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Limited">Limited</option>
                                    <option value="No Evidence">No Evidence</option>
                                    <option value="Disputed">Disputed</option>
                                    <option value="Refuted">Refuted</option>
                                </Input>
                                <Input type="textarea" ref="reasons" label="Explain Reason(s) for Change:" rows="5" labelClassName="col-sm-5 control-label"
                                    wrapperClassName="col-sm-7" groupClassName="form-group" />
                                <div className="col-sm-5"><span className="pull-right">&nbsp;</span></div>
                                <div className="col-sm-7">
                                    <span>
                                    **Note: If your selected Clinical Validity Classification is different from the Calculated value, provide a reason to expain why you changed it.
                                    </span>
                                </div>
                            </div>
                        </Panel>
                    </PanelGroup>
                    <div className='modal-footer'>
                        <Input type="cancel" inputClassName="btn-default btn-inline-spacer" cancelHandler={this.cancelForm} />
                        <Input type="submit" inputClassName="btn-primary btn-inline-spacer pull-right" id="submit" title="Save" />
                    </div>
                </Form>
            </div>
        </div>
    );
};

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
                            <div className="col-sm-5"><strong>Total Score:</strong></div>
                            <div className="col-sm-7"><span>{this.state.totalScore}</span></div>
                        </div>
                        <div className="row">
                            <div className="col-sm-5">
                                <strong>Calculated Clinical Validity Classification:</strong
                            ></div>
                            <div className="col-sm-7"><span>{this.state.autoClassification}</span></div>
                        </div>
                        <div className="row">
                            <Input type="select" ref="alteredClassification" label="Change Provisional Clinical Validity Classification:"
                                value={alteredClassification} labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7"
                                groupClassName="form-group">
                                <option value="none">No Selection</option>
                                <option disabled="disabled"></option>
                                <option value="Definitive">Definitive</option>
                                <option value="Strong">Strong</option>
                                <option value="Moderate">Moderate</option>
                                <option value="Limited">Limited</option>
                                <option value="No Evidence">No Evidence</option>
                                <option value="Disputed">Disputed</option>
                                <option value="Refuted">Refuted</option>
                            </Input>
                        </div>
                        <div className="row">
                            <Input type="textarea" ref="reasons" label="Explain Reason(s) for Change:" rows="5" labelClassName="col-sm-5 control-label"
                                value={this.state.provisional.reasons} wrapperClassName="col-sm-7" groupClassName="form-group" />
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
        "Protein interactions": 0,
        "Biochemical function": 0,
        "Functional alteration of gene or gene product": 0,
        "Model systems": 0,
        "Rescue": 0
    }
    var expUnit = {
        "Expression": 0.5,
        "Protein interactions": 0.5,
        "Biochemical function": 0.5,
        "Functional alteration of gene or gene product": 1,
        "Model systems": 2,
        "Rescue": 2
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
            // Select experimental, count number of each type and calculate as 3 score categories
            else if (evid_type === 'Expression') {
                expType["Expression"] += 1;
                exp_scores[0] += 0.5;
                //if (!in_array(evid_id, expList)) {
                //    expList.push(evid_id);
                //}
            }
            else if (evid_type === 'Protein interactions') {
                expType["Protein interactions"] += 1;
                exp_scores[0] += 0.5;

            }
            else if (evid_type === 'Biochemical function') {
                expType["Biochemical function"] += 1;
                exp_scores[0] += 0.5;
            }
            else if (evid_type === 'Functional alteration of gene or gene product') {
                expType["Functional alteration of gene or gene product"] += 1;
                exp_scores[1] += 1;
            }
            else if (evid_type === 'Rescue') {
                expType["Rescue"] += 1;
                exp_scores[2] += 2;
            }
            else if (evid_type === 'Model systems') {
                expType["Model systems"] += 1;
                exp_scores[2] += 2;
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

// Generate variantIdList
// condition: id must in pathoList generated from assessments (above)
    var gdmPathoList = gdm.variantPathogenicity;
    var variantIdList = [];
    for (var i in gdmPathoList) {
        var pathoUuid = gdmPathoList[i].uuid;
        var owner = gdmPathoList[i].submitted_by;
        var variant = gdmPathoList[i].variant;
        var varUuid = variant.uuid;

        for (var j in pathoList) {
            if (pathoUuid === pathoList[j].patho) {
                variantIdList.push(varUuid);
                break;
            }
        }
    }

// Collect all families and independent individuals with article info (experimental data is not necessary)
    var annotations = gdm.annotations;
    var familiesCollected = [];
    var individualsCollected = [];
    //var experimentalCollected = [];
    for (var i in annotations) {
        if (annotations[i].groups) {
            var groups = annotations[i].groups;
            for (var j in groups) {
                if (groups[j].familyIncluded) {
                    filter(familiesCollected, groups[j].familyIncluded, annotations[i].article, variantIdList); // take those associated with variant in pathogenicity list and assessed as Supports
                }
                if (groups[j].individualIncluded) {
                    filter(individualsCollected, groups[j].individualIncluded, annotations[i].article, variantIdList); // same as above
                }
            }
        }
        if (annotations[i].families) {
            filter(familiesCollected, annotations[i].families, annotations[i].article, variantIdList);
        }
        if (annotations[i].individuals) {
            filter(individualsCollected, annotations[i].individuals, annotations[i].article, variantIdList);
        }
        // experimental data is not necessary to
        //if (annotations[i].experimentalData) {
        //    filter(experimentalCollected, annotations[i].experimentalData, annotations[i].article, expList);
        //}
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
    //for (var i in experimentalCollected) {
    //    if (!in_array(experimentalCollected[i].pmid, articleCollected) && experimentalCollected[i].pmid != '') {
    //        articleCollected.push(experimentalCollected[i].pmid);
    //        earliest = get_earliest_year(earliest, experimentalCollected[i].date);
    //    }
    //}

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
    if (articleCollected.length === 0) {
        earliest = 'N/A'; // if no article collect,
    }

    var totalScore = probandScore + pubScore + timeScore + expScore;
    var autoClassification;
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
    <div>
        <h1>Curation Summary and Provisional Classification</h1>
        <Form submitHandler={this.submitForm} formClassName="form-horizontal form-std">
            <PanelGroup accordion>
                <Panel title="New calculation and Classification" open>
                    <div className="form-group">
                        <div className="row">
                            <div className="col-sm-5"><strong className="pull-right">Total Score:</strong></div>
                            <div className="col-sm-7"><span>{this.state.totalScore}</span></div>
                        </div>
                        <br />
                        <div className="row">
                            <div className="col-sm-5">
                                <strong className="pull-right">Scoring Details:</strong>
                            </div>
                            <div className="col-sm-7"><span>&nbsp;</span></div>
                        </div>
                        <div className="row">
                            <div className="col-sm-5">
                                <strong className="pull-right">&nbsp;</strong>
                            </div>
                            <div className="col-sm-7">
                                <table className="summary-scoring">
                                    <tr><td className="td-title"><strong>Total Experimental Score:</strong></td>
                                        <td className="td-score"><strong>{expScore}</strong></td>
                                    </tr>
                                    {Object.keys(expType).map(function(key) {
                                        return (
                                            expType[key] > 0 ?
                                                <tr><td className="td-title">{key} x {expType[key]} ({expUnit[key]} each)</td>
                                                    <td className="td-score">{expType[key]*expUnit[key]}</td>
                                                </tr>
                                            :
                                            null
                                        );
                                    })}
                                    <tr><td cols="2"><span>&nbsp;</span></td></tr>
                                    <tr><td className="td-title"><strong>Proband Score:</strong></td><td className="td-score"><strong>{probandScore}</strong></td></tr>
                                    <tr><td className="td-title"># Variant assessed</td><td className="td-score">{variantIdList.length}</td></tr>
                                    <tr><td className="td-title"># Family counted</td><td className="td-score">{count_proband(familiesCollected)}</td></tr>
                                    <tr><td className="td-title"># Individual counted</td><td className="td-score">{count_proband(individualsCollected)}</td></tr>
                                    <tr><td cols="2"><span>&nbsp;</span></td></tr>
                                    <tr><td className="td-title"><strong>Publication Score:</strong></td><td className="td-score"><strong>{pubScore}</strong></td></tr>
                                    <tr><td className="td-title"># Article</td><td className="td-score">{articleCollected.length}</td></tr>
                                    <tr><td cols="2"><span>&nbsp;</span></td></tr>
                                    <tr><td className="td-title"><strong>Time Score:</strong></td><td className="td-score"><strong>{timeScore}</strong></td></tr>
                                    <tr><td className="td-title">Earliest Year</td><td className="td-score">{earliest}</td></tr>
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
                        <Input type="select" ref="alteredClassification" label="Change Provisional Clinical Validity Classification:" defaultValue="none"
                            labelClassName="col-sm-5 control-label" wrapperClassName="col-sm-7" groupClassName="form-group">
                            <option value="none">No Selection</option>
                            <option disabled="disabled"></option>
                            <option value="Definitive">Definitive</option>
                            <option value="Strong">Strong</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Limited">Limited</option>
                            <option value="No Evidence">No Evidence</option>
                            <option value="Disputed">Disputed</option>
                            <option value="Refuted">Refuted</option>
                        </Input>
                        <Input type="textarea" ref="reasons" label="Explain Reason(s) for Change:" rows="5" labelClassName="col-sm-5 control-label"
                            wrapperClassName="col-sm-7" groupClassName="form-group" />
                        <div className="col-sm-5"><span className="pull-right">&nbsp;</span></div>
                        <div className="col-sm-7">
                            <span>
                            **Note: If your selected Clinical Validity Classification is different from the Calculated value, provide a reason to expain why you changed it.
                            </span>
                        </div>
                        { this.state.provisional ?
                            <div>
                                <div className="row">
                                    <div className="col-sm-5"><span className="pull-right">&nbsp;</span></div>
                                    <div className="col-sm-7"><span>&nbsp;</span></div>
                                </div>
                                <div className="row">
                                    <div className="col-sm-5"><span className="pull-right">&nbsp;</span></div>
                                    <div className="col-sm-7">
                                        <span>**Click Save below will permanenetly change your currently saved data.</span>
                                    </div>
                                </div>
                            </div>
                            : null
                        }
                    </div>
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

//Independent functions
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
    for (var i in branch) {
        var obj = branch[i];
        var variantIds = [];
        var allAssessed = false;

        if (obj['@type'][0] === 'family') {
            if (obj.segregation) {
                var seg = obj.segregation;
                if (seg.variants) {
                    var variants = seg.variants;
                    for (var j in variants) {
                        if (!in_array(variants[j].uuid, idList)) {
                            allAssessed = false;
                            break;
                        }
                        else {
                            allAssessed = true;
                            variantIds.push(variants[j].uuid);
                        }
                    }
                }
            }
        }
        else if (obj['@type'][0] === 'individual') {
            if (obj.variants) {
                var variants = obj.variants;
                for (var j in variants) {
                    if (in_array(variants[j].uuid, idList)) {
                        variantIds.push(variants[j].uuid);
                        allAssessed = true;
                    }
                }
            }
        }
        else if (obj['@type'][0] === 'experimental' && in_array(obj.uuid, idList)) {
            target.push({"evidence":branch[i].uuid, "variant":'', "pmid":article.pmid, "date": article.date});
            allAssessed = false;
        }

        if (allAssessed) {
            target.push({"evidence":branch[i].uuid, "variant":variantIds[0], "pmid":article.pmid, "date": article.date});
            if (variantIds.length > 0) {
                target.push({"evidence":'', "variant":variantIds[1], "pmid":'', "date": ''});
            }
        }
    }
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
