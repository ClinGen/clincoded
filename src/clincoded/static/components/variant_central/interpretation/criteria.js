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

    handleCriteria: function() {
    	var criteria;
    	for (let n of evidenceCodes) {

    	}
    },

	render: function() {
        return (
            <div className="curation-criteria curation-variant">
            	{(this.state.interpretation) ?
            		<div className="criteria-bar btn-toolbar" role="toolbar" aria-label="Criteria bar with code buttons">
            			<div className="criteria-group btn-group btn-group-sm" role="group" aria-label="Criteria code button group">
            				{evidenceCodes.map(function(evidence, i) {
            					return (
                                    <button type="button" className={'btn btn-default ' + evidence.class} key={i}
                                    	data-toggle="tooltip" data-placement="top" data-tooltip={evidence.definition}>
                                        <span>{evidence.code}</span>
                                    </button>
                                );
            				})}
            			</div>
            		</div>
            	: null}
            </div>
        );
    }
});