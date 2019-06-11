'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';
import { queryKeyValue, editQueryValue, addQueryKey } from '../../globals';

const evidenceCodes = require('./mapping/evidence_code.json');

const mappingTab = {
    population: 'population',
    predictors: 'variant-type',
    computational: 'variant-type',
    functional: 'experimental',
    experimental: 'experimental',
    segregation: 'segregation-case'
};

const mappingSubtab = {
    BP1: 'missense',
    BP4: 'missense',
    PP2: 'missense',
    PP3: 'missense',
    PM5: 'missense',
    PS1: 'missense',
    PVS1: 'lof',
    BP7: 'silent-intron',
    BP3: 'indel',
    PM4: 'indel'
};

// Display met criteria
var CurationInterpretationCriteria = module.exports.CurationInterpretationCriteria = createReactClass({
    propTypes: {
        interpretation: PropTypes.object,
        selectedTab: PropTypes.string,
        updateSelectedCriteria: PropTypes.func,
        unusedCriteria: PropTypes.array
    },

    getInitialState() {
        return {
            selectedTab: this.props.selectedTab
        };
    },

    componentWillReceiveProps(nextProps) {
        if (nextProps.selectedTab) {
            this.setState({selectedTab: nextProps.selectedTab});
        }
    },

    /**
     * Method to handle click events on the criteria buttons
     * Should take users to the tab of the targeted criteriaz
     */
    handleClick(key, category, e) {
        e.preventDefault(); e.stopPropagation();

        const interpretation = this.props.interpretation;
        const selectedTab = this.state.selectedTab;
        const selectedSubtab = queryKeyValue('subtab', window.location.href);
        const selectedCriteria = queryKeyValue('criteria', window.location.href);

        if (interpretation) {
            if (selectedTab) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'tab', mappingTab[category]));
            } else {
                window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'tab', mappingTab[category]));
            }
            if (selectedSubtab) {
                if (mappingSubtab[key]) {
                    window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'subtab', mappingSubtab[key]));
                } else {
                    window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'subtab', ''));
                }
            } else {
                if (mappingSubtab[key]) {
                    window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'subtab', mappingSubtab[key]));
                }
            }
            if (selectedCriteria) {
                window.history.replaceState(window.state, '', editQueryValue(window.location.href, 'criteria', key));
            } else {
                window.history.replaceState(window.state, '', addQueryKey(window.location.href, 'criteria', key));
            }
        }
        this.props.updateSelectedCriteria(mappingTab[category], mappingSubtab[key], key);
    },

    // Method to render individual criteria codes and their respective tooltip
    // 'data-status' attribute flags whether a criterion is met
    renderCriteriaBar(key, evidence, interpretation) {
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
        const unused = Array.isArray(this.props.unusedCriteria) && (this.props.unusedCriteria.indexOf(key) > -1);
        return (
            <button className={'btn btn-default ' + evidence[key].class + ' ' + evidence[key].category + this.getCurrentTab(evidence[key].category)}
                type="button" key={key} data-status={status}
                data-toggle="tooltip" data-placement="top"
                data-tooltip={evidence[key].definition}
                onClick={this.handleClick.bind(this, key, evidence[key].category)}>
                {unused &&
                    <div className="criteria-cross">
                        <div className="criteria-neg-slope-line" />
                        <div className="criteria-pos-slope-line" />
                    </div>
                }
                <span className="criteria-key">{key}</span>
            </button>
        );
    },

    // Method to return current tab
    getCurrentTab(category) {
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
        const keys = Object.keys(evidenceCodes);
        const { interpretation } = this.props;

        return (
            <div className="container curation-criteria curation-variant">
                {interpretation ?
                    <div>
                        <div className="criteria-bar btn-toolbar" role="toolbar" aria-label="Criteria bar with code buttons">
                            <div className="criteria-group btn-group btn-group-sm" role="group" aria-label="Criteria code button group">
                                {keys.map(key => {
                                    return (this.renderCriteriaBar(key, evidenceCodes, interpretation));
                                })}
                            </div>
                        </div>
                        <p className="criteria-usage-note"><i className="icon icon-info-circle"></i> Mouse over a criterion code to see its description; click on it to go to its evaluation section.</p>
                    </div>
                    : null}
            </div>
        );
    }
});
