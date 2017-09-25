'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import moment from 'moment';
import url from 'url';
import { curator_page, history_views, userMatch, queryKeyValue } from '../globals';
import { RestMixin } from '../rest';
import { Form, FormMixin, Input } from '../../libs/bootstrap/form';
import { parseAndLogError } from '../mixins';
import * as CuratorHistory from '../curator_history';
import * as methods from '../methods';
import * as curator from '../curator';
const CurationMixin = curator.CurationMixin;
const RecordHeader = curator.RecordHeader;

import GeneDiseaseScoreMatrix from './score_matrix';

var ProvisionalClassification = createReactClass({
    mixins: [FormMixin, RestMixin, CurationMixin, CuratorHistory],

    contextTypes: {
        navigate: PropTypes.func,
        closeModal: PropTypes.func
    },

    queryValues: {},

    getInitialState() {
        return {
            user: null, // login user uuid
            gdm: null, // current gdm object, must be null initially.
            provisional: {}, // login user's existing provisional object, must be null initially.
            editKey: queryKeyValue('edit', this.props.href),
        };
    },

    loadData() {
        const gdmUuid = this.queryValues.gdmUuid;

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
            if (stateObj.gdm.provisionalClassifications && stateObj.gdm.provisionalClassifications.length) {
                stateObj.gdm.provisionalClassifications.forEach(provisional => {
                    const owner = provisional.submitted_by;
                    if (owner.uuid === stateObj.user) {
                        stateObj.provisional = provisional;
                        this.queryValues.provisionalUuid = provisional.uuid;
                    }
                });
            }
            this.setState(stateObj);

            return Promise.resolve();
        }).catch(function(e) {
            console.log('OBJECT LOAD ERROR: %s — %s', e.statusText, e.url);
        });
    },

    componentDidMount() {
        this.loadData();
    },

    // method to update the interpretation object and send it down to child components on demand
    updateGdmObj() {
        const gdmUuid = this.queryValues.gdmUuid;
        const provisionalUuid = this.queryValues.provisionalUuid;
        this.getRestData('/gdm/' + gdmUuid).then(gdm => {
            this.setState({gdm: gdm});
            return Promise.resolve(gdm);
        }).then(result => {
            this.getRestData('/provisional/' + provisionalUuid).then(provisional => {
                this.setState({provisional: provisional});
            });
        });
    },

    render() {
        this.queryValues.gdmUuid = queryKeyValue('gdm', this.props.href);
        let session = (this.props.session && Object.keys(this.props.session).length) ? this.props.session : null;
        let gdm = this.state.gdm ? this.state.gdm : null;
        let provisional = this.state.provisional;
        let show_clsfctn = queryKeyValue('classification', this.props.href);

        return (
            <div>
                { show_clsfctn === 'display' ?
                    Classification.call()
                    :
                    ( gdm ?
                        <div>
                            <RecordHeader gdm={gdm} omimId={this.state.currOmimId} updateOmimId={this.updateOmimId} session={session} summaryPage={true} linkGdm={true} />
                            <div className="container">
                                <h1>Summary & Provisional Classification</h1>
                                <div className="summary-provisional-classification-description">
                                    The calculated values below are based on the set of saved evidence that existed when the "Generate New Summary"
                                    button was clicked. To save these values and the calculated or selected Classification, click "Save" below - they
                                    will then represent the new "Last Saved Summary & Provisional Classification".
                                </div>
                                <GeneDiseaseScoreMatrix user={this.state.user} gdm={gdm} provisional={provisional}
                                    isProvisionalClassification={true} editKey={this.state.editKey} />
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

curator_page.register(ProvisionalClassification,  'curator_page', 'provisional-classification');

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

// Display a history item for adding a family
class ProvisionalAddModHistory extends Component {
    render() {
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
}

history_views.register(ProvisionalAddModHistory, 'provisionalClassification', 'add');


// Display a history item for modifying a family
class ProvisionalModifyHistory extends Component {
    render() {
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
}

history_views.register(ProvisionalModifyHistory, 'provisionalClassification', 'modify');


// Display a history item for deleting a family
class ProvisionalDeleteHistory extends Component {
    render() {
        return <div>PROVISIONALDELETE</div>;
    }
}

history_views.register(ProvisionalDeleteHistory, 'provisionalClassification', 'delete');
