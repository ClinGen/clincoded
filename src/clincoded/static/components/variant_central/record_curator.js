'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;

var queryKeyValue = globals.queryKeyValue;
let external_url_map = globals.external_url_map;

import PopOverComponent from '../../libs/bootstrap/popover';

// Display in-progress or provisional interpretations associated with variant
var CurationRecordCurator = module.exports.CurationRecordCurator = React.createClass({
    mixins: [RestMixin],

    propTypes: {
        calculatedPathogenicity: React.PropTypes.string,
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        interpretation: React.PropTypes.object,
        session: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            variant: this.props.data,
            calculatedPathogenicity: this.props.calculatedPathogenicity,
            interpretationUuid: this.props.interpretationUuid,
            interpretation: this.props.interpretation ? this.props.interpretation : null // parent interpretation object
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation, interpretationUuid: nextProps.interpretationUuid});
        }
        if (typeof nextProps.calculatedPathogenicity !== undefined && nextProps.calculatedPathogenicity !== this.props.calculatedPathogenicity) {
            this.setState({calculatedPathogenicity: nextProps.calculatedPathogenicity});
        }
    },

    // Sort interpretation array, and move current user's as the first element
    getInterpretations: function(data, session) {
        let myInterpretation = null;
        let otherInterpretations = [];
        if (data && data.associatedInterpretations && data.associatedInterpretations.length) {
            for (let interpretation of data.associatedInterpretations) {
                if (interpretation.submitted_by.uuid === session.user_properties.uuid) {
                    myInterpretation = interpretation;
                } else {
                    otherInterpretations.push(interpretation);
                }
            }
        }
        return {
            myInterpretation: myInterpretation,
            otherInterpretations: otherInterpretations
        };
    },

    goToInterpretationPage: function(e) {
        e.preventDefault(); e.stopPropagation();

        let uuid = this.getInterpretations(this.props.data, this.props.session).myInterpretation.uuid;
        let selectedTab = queryKeyValue('tab', window.location.href);
        let selectedSubtab = queryKeyValue('subtab', window.location.href);
        let url = '/variant-central/?edit=true&variant=' + this.props.data.uuid + '&interpretation=' + uuid + (selectedTab ? '&tab=' + selectedTab : '') + (selectedSubtab ? '&subtab=' + selectedSubtab : '');
        window.location.href = url;
    },

    render: function() {
        var variant = this.props.data;
        var session = this.props.session;
        var recordHeader = this.props.recordHeader;
        var interpretationUuid = this.state.interpretationUuid;

        let sortedInterpretations = variant && variant.associatedInterpretations && variant.associatedInterpretations.length ? this.getInterpretations(variant, session) : null;
        let myInterpretation = this.state.interpretation ? this.state.interpretation
            : (sortedInterpretations && sortedInterpretations.myInterpretation ? sortedInterpretations.myInterpretation : null);
        let otherInterpretations = sortedInterpretations && sortedInterpretations.otherInterpretations.length ? sortedInterpretations.otherInterpretations : null;
        let calculatedPathogenicity = this.state.calculatedPathogenicity ? this.state.calculatedPathogenicity
            : (myInterpretation && myInterpretation.provisional_variant && myInterpretation.provisional_variant.length ? myInterpretation.provisional_variant[0].autoClassification : 'None');
        let modifiedPathogenicity = myInterpretation && myInterpretation.provisional_variant && myInterpretation.provisional_variant.length && myInterpretation.provisional_variant[0].alteredClassification ?
            myInterpretation.provisional_variant[0].alteredClassification : 'None';

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    {interpretationUuid ?
                        <div className="clearfix">
                            <h4>My Interpretation</h4>
                            {myInterpretation ?
                                <div className="current-user-interpretations">
                                    <div className="associated-disease"><strong>Disease:</strong>&nbsp;
                                        {myInterpretation && myInterpretation.disease ?
                                            <span>
                                                {myInterpretation.disease.term}
                                                <span>&nbsp;</span>
                                                {!myInterpretation.disease.freetext ? 
                                                    <span>
                                                        (
                                                        <a href={external_url_map['MondoSearch'] + myInterpretation.disease.id} target="_blank">{myInterpretation.disease.id.replace('_', ':')}</a>
                                                        {myInterpretation.disease.description && myInterpretation.disease.description.length ?
                                                            <span><span>,&nbsp;</span>
                                                                <PopOverComponent popOverWrapperClass="interpretation-disease-description"
                                                                    actuatorTitle="View definition" popOverRef={ref => (this.popoverDesc = ref)}>
                                                                    {myInterpretation.disease.description}
                                                                </PopOverComponent>
                                                            </span>
                                                        : null}
                                                        )
                                                    </span>
                                                : null}
                                            </span>
                                            :
                                            <span>Not associated</span>
                                        }
                                    </div>
                                    <div><strong>Calculated Pathogenicity:</strong> {calculatedPathogenicity}</div>
                                    <div><strong>Modified Pathogenicity:</strong> {modifiedPathogenicity}</div>
                                    <div><strong>Status:</strong> <i>{myInterpretation.markAsProvisional ? 'Provisional ' : 'In Progress '}</i></div>
                                    <div><strong>Last Edited:</strong> {moment(myInterpretation.last_modified).format("YYYY MMM DD, h:mm a")}</div>
                                </div>
                                :
                                null
                            }
                        </div>
                        :
                        <div className="clearfix">
                            <h4>All Existing Interpretations</h4>
                            {myInterpretation ?
                                <table className="login-users-interpretations">
                                    <tbody>
                                        <tr>
                                            <td>
                                                {myInterpretation.disease ? <strong>{myInterpretation.disease.term}</strong> : <strong>No disease</strong>}
                                                {myInterpretation.modeInheritance ?
                                                    <span>-
                                                        {myInterpretation.modeInheritance.indexOf('(HP:') === -1 ?
                                                            <i>{myInterpretation.modeInheritance}</i>
                                                            :
                                                            <i>{myInterpretation.modeInheritance.substr(0, myInterpretation.modeInheritance.indexOf('(HP:')-1)}</i>
                                                        }
                                                        ,&nbsp;
                                                    </span>
                                                    :
                                                    <span>, </span>
                                                }
                                                <span className="no-broken-item">{myInterpretation.submitted_by.title},</span>&nbsp;
                                                <span className="no-broken-item"><i>{myInterpretation.markAsProvisional ? 'Provisional Interpretation' : 'In progress'}
                                                {myInterpretation.markAsProvisional && myInterpretation.provisional_variant[0].alteredClassification ?
                                                    ': ' + myInterpretation.provisional_variant[0].alteredClassification : null},&nbsp;</i></span>
                                                <span className="no-broken-item">
                                                    last edited: {moment(myInterpretation.last_modified).format("YYYY MMM DD, h:mm a")}
                                                </span>
                                            </td>
                                            <td className="icon-box">
                                                <a className="continue-interpretation" href="#" onClick={this.goToInterpretationPage} title="Edit interpretation">
                                                    <i className="icon icon-pencil-square large-icon"></i>
                                                </a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                :
                                null
                            }
                            {otherInterpretations && otherInterpretations.length ?
                                <div className="col-lg-12 other-users-interpretations">
                                    {otherInterpretations.map(function(interpretation, i) {
                                        return (
                                            <dl key={i}>
                                                <dd>
                                                    {interpretation.disease ? <strong>{interpretation.disease.term}</strong> : <strong>No disease</strong>}
                                                    {interpretation.modeInheritance ?
                                                        <span>-
                                                            {interpretation.modeInheritance.indexOf('(HP:') === -1 ?
                                                                <i>{interpretation.modeInheritance}</i>
                                                                :
                                                                <i>{interpretation.modeInheritance.substr(0, interpretation.modeInheritance.indexOf('(HP:')-1)}</i>
                                                            }
                                                        , </span>
                                                        :
                                                        ', '
                                                    }
                                                    <span className="no-broken-item"><a href={'mailto:' + interpretation.submitted_by.email}>{interpretation.submitted_by.title }</a>,</span>&nbsp;
                                                    <span className="no-broken-item"><i>{interpretation.markAsProvisional ? 'Provisional Interpretation' : 'In progress'}
                                                    {interpretation.markAsProvisional && interpretation.provisional_variant[0].alteredClassification ?
                                                        ': ' + interpretation.provisional_variant[0].alteredClassification : null},&nbsp;</i></span>
                                                    last edited: {moment(interpretation.last_modified).format("YYYY MMM DD, h:mm a")}
                                                </dd>
                                            </dl>
                                        );
                                    })}
                                </div>
                                :
                                null
                            }
                        </div>
                    }
                </div>
            </div>
        );
    }
});
