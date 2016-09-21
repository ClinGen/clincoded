'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;
var moment = require('moment');

let external_url_map = globals.external_url_map;

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

    getDefaultProps: function() {
        return {
            recordHeader: 'Interpretations'
        };
    },

    getInitialState: function() {
        return {
            calculatedPathogenicity: this.props.calculatedPathogenicity,
            interpretationUuid: this.props.interpretationUuid,
            interpretation: null // parent interpretation object
        };
    },

    componentWillReceiveProps: function(nextProps) {
        // this block is for handling props and states when props (external data) is updated after the initial load/rendering
        // when props are updated, update the parent interpreatation object, if applicable
        if (typeof nextProps.interpretation !== undefined && !_.isEqual(nextProps.interpretation, this.props.interpretation)) {
            this.setState({interpretation: nextProps.interpretation, interpretationUuid: nextProps.interpretationUuid});
        }
        if (typeof nextProps.calculatedPathogenicity !== undefined && !_.isEqual(nextProps.calculatedPathogenicity, this.props.calculatedPathogenicity)) {
            this.setState({calculatedPathogenicity: nextProps.calculatedPathogenicity});
        }
    },

    // Create 2 arrays of interpretations: one associated with current user
    // while the other associated with other users
    getInterpretations: function(data, session, type) {
        var myInterpretations = [];
        var otherInterpretations = [];
        var interpretations = data.associatedInterpretations;
        for (var i=0; i<interpretations.length; i++) {
            if (typeof interpretations[i] !== 'undefined') {
                if (interpretations[i].submitted_by.uuid === session.user_properties.uuid) {
                    myInterpretations.push(interpretations[i]);
                } else if (interpretations[i].submitted_by.uuid !== session.user_properties.uuid) {
                    otherInterpretations.push(interpretations[i]);
                }
            }
        }
        if (type === 'currentUser') {
            return myInterpretations;
        } else if (type === 'otherUsers') {
            return otherInterpretations;
        }
    },

    render: function() {
        var variant = this.props.data;
        var session = this.props.session;
        var recordHeader = this.props.recordHeader;
        var interpretationUuid = this.state.interpretationUuid;

        let interpretation = this.state.interpretation ? this.state.interpretation
            : (variant && variant.associatedInterpretations && variant.associatedInterpretations.length ? this.getInterpretations(variant, session, 'currentUser')[0] : null);
        let calculatedPathogenicity = this.state.calculatedPathogenicity ? this.state.calculatedPathogenicity
            : (interpretation && interpretation.provisional_variant && interpretation.provisional_variant.length ? interpretation.provisional_variant[0].autoClassification : 'None');
        let modifiedPathogenicity = interpretation && interpretation.provisional_variant && interpretation.provisional_variant.length && interpretation.provisional_variant[0].alteredClassification ?
            interpretation.provisional_variant[0].alteredClassification : 'None';

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    <h4>{recordHeader}</h4>
                    {variant ?
                        <div className="clearfix">
                            {interpretation ?
                                <div className="current-user-interpretations">
                                    <div><strong>Disease:</strong>&nbsp;
                                        {interpretation.disease ?
                                            <span>{interpretation.disease.term}, <a href={external_url_map['OrphaNet'] + interpretation.disease.orphaNumber} target="_blank">{'ORPHA' + interpretation.disease.orphaNumber}</a></span>
                                            :
                                            <span>Not associated</span>
                                        }
                                    </div>
                                    <div><strong>Calculated Pathogenicity:</strong> {calculatedPathogenicity}</div>
                                    <div><strong>Modified Pathogenicity:</strong> {modifiedPathogenicity}</div>
                                    <div><strong>Status:</strong> {interpretation.markAsProvisional ? 'Provisional ' : 'In Progress '}</div>
                                    <div><strong>Last Edited:</strong> {moment(interpretation.last_modified).format("YYYY MMM DD, h:mm a")}</div>
                                </div>
                                :
                                null
                            }
                        </div>
                    : null}
                </div>
            </div>
        );
    }
});

var handleEditEvent = function(url) {
    window.location.href = url;
}
