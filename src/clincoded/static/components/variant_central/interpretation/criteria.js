'use strict';
var React = require('react');
var globals = require('../../globals');
var evidenceCodes = require('./mapping/evidence_code.json');

var queryKeyValue = globals.queryKeyValue;
var editQueryValue = globals.editQueryValue;

// Display met criteria
var CurationInterpretationCriteria = module.exports.CurationInterpretationCriteria = React.createClass({
    propTypes: {
        interpretation: React.PropTypes.object
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.interpretation && this.props.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
    },

    // FIXME: fake data attribute to flag criteria that can be evaluated but not yet evaluated
    // after associating a disease with interpretation.
    // Shall be removed when actual functionality is implemented.
    handleCriteria: function(criteria_code) {
        var status;
        var evaluated = ["BS1", "BS2", "BP1", "BP3", "BP7", "PP3", "PM2", "PM4", "PM5", "PS1", "PS4"];
        var not_evaluated = ["BS3", "BS4", "BP2", "BP4", "PP1", "PP2", "PM1", "PS3"];
        for (let x of evaluated) {
            if (x === criteria_code) {
                status = "evaluated";
            }
        }
        for (let y of not_evaluated) {
            if (y === criteria_code) {
                status = "not_evaluated";
            }
        }
        return status;
    },

    render: function() {
        var self =this;
        var evidenceCodesList = ["BS1", "BS2", "BS3", "BS4", "BP1", "BP2", "BP3", "BP4", "BP5", "BP6", "BP7", "PP1", "PP2", "PP3", "PP4", "PP5",
            "PM1", "PM2", "PM3", "PM4", "PM5", "PM6", "PS1", "PS2", "PS3", "PS4", "PVS1"]; // took BA1 out to fit in width
        return (
            <div className="curation-criteria curation-variant">
                {(this.state.interpretation) ?
                    <div className="criteria-bar btn-toolbar" role="toolbar" aria-label="Criteria bar with code buttons">
                        <div className="criteria-group btn-group btn-group-sm" role="group" aria-label="Criteria code button group">

                            <div className="feature-in-development"> {/* FIXME div for temp yellow UI display */}

                                {/* FIXME: Remove 'data-status' attribute when actual functionality is implemented to handle 'met' criteria */}
                                {evidenceCodesList.map(function(evidence, i) {
                                    return (
                                        <button type="button" className={'btn btn-default ' + evidence.class} key={i} data-status={self.handleCriteria(evidence)}
                                            data-toggle="tooltip" data-placement="top" data-tooltip={evidenceCodes[evidence].definition}>
                                            <span>{evidence}</span>
                                        </button>
                                    );
                                })}


                            </div> {/* /FIXME div for temp yellow UI display */}

                        </div>
                    </div>
                    : null
                }
            </div>
        );
    }
});
