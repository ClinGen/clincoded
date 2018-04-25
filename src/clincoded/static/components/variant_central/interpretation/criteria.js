'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

var evidenceCodes = require('./mapping/evidence_code.json');

// Display met criteria
var CurationInterpretationCriteria = module.exports.CurationInterpretationCriteria = createReactClass({
    propTypes: {
        interpretation: PropTypes.object,
        selectedTab: PropTypes.string
    },

    getInitialState: function() {
        return {
            interpretation: this.props.interpretation,
            selectedTab: this.props.selectedTab
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.interpretation && this.props.interpretation) {
            this.setState({interpretation: nextProps.interpretation});
        }
        if (nextProps.selectedTab) {
            this.setState({selectedTab: nextProps.selectedTab});
        }
    },

    // Method to render individual criteria codes and their respective tooltip
    // 'data-status' attribute flags whether a criterion is met
    renderCriteriaBar: function(key, evidence, interpretation) {
        let status = 'not-evaluated';
        // Flag 'met' criteria via [data-status]
        let evalArray = interpretation.evaluations;
        if (evalArray) {
            if (evalArray.length) {
                evalArray.forEach(entry => {
                    if (typeof entry.criteria !== 'undefined' && entry.criteria === key) {
                        status = entry.criteriaStatus;
                    }
                });
            }
        }
        return (
            <button className={'btn btn-default ' + evidence[key].class + ' ' + evidence[key].category
                + this.getCurrentTab(evidence[key].category)}
                type="button" key={key} data-status={status} data-
                data-toggle="tooltip" data-placement="top" data-tooltip={evidence[key].definition}>
                <span>{key}</span>
            </button>
        );
    },

    // Method to return current tab
    getCurrentTab: function(category) {
        let currentTabName, className = '';
        let currentTab = this.state.selectedTab;
        if (currentTab) {
            switch (currentTab) {
                case 'population':
                    currentTabName = 'population';
                    break;
                case 'variant-type':
                    currentTabName = 'computational';
                    break;
                case 'experimental':
                    currentTabName = 'functional';
                    break;
                case 'segregation-case':
                    currentTabName = 'segregation';
                    break;
                default:
                    currentTabName = null;
            }
        }
        if (currentTabName && currentTabName === category) {
            className = ' onCurrentTab';
        }
        return className;
    },

    render() {
        var keys = Object.keys(evidenceCodes);
        var interpretation = this.state.interpretation;

        return (
            <div className="container curation-criteria curation-variant">
                {(interpretation) ?
                    <div className="criteria-bar btn-toolbar" role="toolbar" aria-label="Criteria bar with code buttons">
                        <div className="criteria-group btn-group btn-group-sm" role="group" aria-label="Criteria code button group">
                            {keys.map(key => {
                                return (this.renderCriteriaBar(key, evidenceCodes, interpretation));
                            })}
                        </div> 
                    </div>
                : null}
            </div>
        );
    }
});
