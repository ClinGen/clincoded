'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');
var RestMixin = require('../rest').RestMixin;
var LocalStorageMixin = require('react-localstorage');

// Display in-progress or provisional interpretations associated with variant
var CurationRecordCurator = module.exports.CurationRecordCurator = React.createClass({
    mixins: [RestMixin, LocalStorageMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationUuid: React.PropTypes.string,
        session: React.PropTypes.object
    },

    getDefaultProps: function() {
        return {
            recordHeader: 'Interpretations'
        };
    },

    getInitialState: function() {
        return {
            interpretationUuid: this.props.interpretationUuid
        };
    },

    componentWillReceiveProps: function(nextProps) {
        this.setState({interpretationUuid: nextProps.interpretationUuid});
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
        if (variant) {
            if (variant.associatedInterpretations && variant.associatedInterpretations.length > 0) {
                var myInterpretations = this.getInterpretations(variant, session, 'currentUser');
                var otherInterpretations = this.getInterpretations(variant, session, 'otherUsers');
            }
        }

        return (
            <div className="col-xs-12 col-sm-6 gutter-exc">
                <div className="curation-data-curator">
                    <h4>{recordHeader}</h4>
                    {variant ?
                        <div className="clearfix">
                            {myInterpretations && myInterpretations.length ?
                                <div className="current-user-interpretations">
                                    <dl className="inline-dl clearfix">
                                        <dt>My interpretations:</dt>
                                        <dd>
                                            {myInterpretations.map(function(item, i) {
                                                return (
                                                    <div key={i}>
                                                        <span className="my-interpretation">
                                                            {(item.interpretation_disease) ? item.interpretation_disease + ', ' : null}
                                                            {item.interpretation_status},&nbsp;
                                                            (last edited {moment(item.last_modified).format('YYYY MMM DD, h:mm a')})
                                                        </span>
                                                        {(item.uuid === interpretationUuid) ?
                                                            <span className="current-interpretation"> &#x02713;</span>
                                                        : null}
                                                    </div>
                                                );
                                            })}
                                        </dd>
                                    </dl>
                                </div>
                            : null}
                            {otherInterpretations && otherInterpretations.length ?
                                <div className="other-users-interpretations">
                                    <dl className="inline-dl clearfix">
                                        <dt>Other interpretations:</dt>
                                        <br />
                                        <dd>
                                            {otherInterpretations.map(function(item, i) {
                                                return (
                                                    <div key={i}>
                                                        <span className="other-interpretation">
                                                            {otherInterpretations[0].submitted_by.title + ', '}
                                                            {(otherInterpretations[0].interpretation_disease !== '') ? otherInterpretations[0].interpretation_disease + ', ' : null}
                                                            {otherInterpretations[0].interpretation_status + ', '}
                                                            (last edited {moment(otherInterpretations[0].last_modified).format('YYYY MMM DD, h:mm a')})
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </dd>
                                    </dl>
                                </div>
                            : null}
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
