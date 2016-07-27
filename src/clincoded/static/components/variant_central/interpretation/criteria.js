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

    // Method to render individual criteria codes and their respective tooltip
    // 'data-status' attribute flags whether an interpretation is associated with disease
    // 'data-evaluation' attribute flags whether a criterion is met
    renderCriteriaBar: function(key, evidence, interpretation) {
        // Flag disease-dependent criteria via @class
        let isDiseaseDependent = (evidence[key]['disease-dependent']) ? 'disease-dependent' : 'not-disease-dependent';
        let status = 'not-disease-associated',
            evaluation = 'not-met';
        // Flag disease-associated interpretation via [data-status]
        if (interpretation.interpretation_disease) {
            status = 'disease-associated';
        }
        // Flag 'met' criteria via [data-evaluation]
        let evalArray = interpretation.evaluations;
        if (evalArray) {
            if (evalArray.length) {
                evalArray.forEach(entry => {
                    if (typeof entry.criteria !== 'undefined' && entry.criteria === key) {
                        evaluation = (entry.value === 'true') ? 'met' : 'not-met';
                    }
                });
            }
        }
        return (
            <button className={'btn btn-default ' + evidence[key].class + ' ' + evidence[key].category + ' ' + isDiseaseDependent}
                type="button" key={key} data-status={status} data-evaluation={evaluation}
                data-toggle="tooltip" data-placement="top" data-tooltip={evidence[key].definition}>
                <span>{key}</span>
            </button>
        );
    },

    render: function() {
        var keys = Object.keys(evidenceCodes);
        var interpretation = this.state.interpretation;

        return (
            <div className="curation-criteria curation-variant">
                {(interpretation) ?
                    <div className="criteria-bar btn-toolbar" role="toolbar" aria-label="Criteria bar with code buttons">
                        <div className="criteria-group btn-group btn-group-sm" role="group" aria-label="Criteria code button group">
                            {keys.map(key => {
                                return (this.renderCriteriaBar(key, evidenceCodes, interpretation));
                            })}
                        </div>                       
                    </div>
                    : null
                }
            </div>
        );
    }
});