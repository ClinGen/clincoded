'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import { property } from 'underscore';

import { showActivityIndicator } from '../../../activity_indicator';
import { PmidSummary } from '../../../curator';

/**
 * This component displays functional data in the experimental tab of the VCI
 * 
 * Because of the deep nesting of the LDH and FDR data is retrieved,
 * the property() function from underscore.js is employed quite extensively to
 * check the validity of data in order to prevent data access errors
 * 
 * _.property(path)
 * Returns a function that will return the specified property of any passed-in object.
 * @path may be specified as a simple key, or as an array of object keys or array indexes, for deep property fetching.
 * 
 * Ex:
 * property(['entContent', 'PatientSourced', 'Genotype', 'label'])(material)
 * if every key in the path is defined, this will return the value of "label"
 * if an undefined key is encountered, this will return undefined
 * 
 */

const propTypes = {
    selectedTab: PropTypes.number,
    ext_genboreeFuncData: PropTypes.object,
    loading_genboreeFuncData: PropTypes.bool.isRequired,
    error_genboreeFuncData: PropTypes.object,
    handleTabSelect: PropTypes.func.isRequired,
};

const defaultProps = {
    selectedTab: 0,
    ext_genboreeFuncData: {},
    error_genboreeFuncData: null,
};

const FunctionalDataTable = ({
    selectedTab,
    ext_genboreeFuncData,
    loading_genboreeFuncData,
    error_genboreeFuncData,
    handleTabSelect,
}) => {
    const sourceArticles = property(['ld', 'AlleleFunctionalImpactStatement'])(ext_genboreeFuncData);
    const articleKeys = sourceArticles && Object.keys(sourceArticles);
    const currentKey = articleKeys && articleKeys[selectedTab];
    return (
        <div className="panel panel-info functional-impact-panel">
            <div className="panel-heading">
                <h3 className="panel-title">Structured Narrative of Functional Impact</h3>
            </div>
            <div className="panel-content-wrapper">
                {
                    loading_genboreeFuncData
                        && showActivityIndicator('Retrieving data... ')
                }
                {
                    currentKey && articleKeys && articleKeys.length > 0 && !loading_genboreeFuncData
                        ? (
                            <div className="functional-tabs-wrapper">
                                <ul className="vci-tabs-header tab-label-list vci-subtabs dynamic-tabs" role="tablist">
                                    {
                                        articleKeys.map((key, index) => (
                                            <li
                                                key={key}
                                                className="tab-label"
                                                role="tab"
                                                onClick={() => handleTabSelect(index)}
                                                aria-selected={selectedTab === index}
                                            >
                                                { `Source ${index + 1}` }
                                            </li>
                                        ))
                                    }
                                </ul>
                                {
                                    <div role="tabpanel" className="panel-body experiment-table tab-panel">
                                        <div className="row">
                                            <span className="col-md-12">
                                                <strong>{ `Source: PMID:${property(['pubmedSource', 'pmid'])(sourceArticles[currentKey]) || ''}` }</strong>
                                            </span>
                                            <span className="col-md-12">
                                                <PmidSummary
                                                    article={property(['pubmedSource'])(sourceArticles[currentKey])}
                                                    displayJournal
                                                />
                                            </span>
                                        </div>
                                        {
                                            property(['statements'])(sourceArticles[currentKey]) && Array.isArray(sourceArticles[currentKey].statements)
                                                && sourceArticles[currentKey].statements.map((experiment, index) => (
                                                    <div className="row experiment" key={experiment.id}>
                                                        <span className="col-md-12">
                                                            <strong className="experiment-label">{ `Experiment ${index + 1}` }</strong>
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Method: </strong>
                                                            <a href={property(['fdr', 'ld', 'Method', 0, 'entIri'])(experiment)} target="_blank" rel="noopener noreferrer">
                                                                { property(['fdr', 'ld', 'Method', 0, 'entId'])(experiment) }
                                                            </a>
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Material(s): </strong>
                                                            {
                                                                property(['fdr', 'ld', 'Material'])(experiment) && Array.isArray(experiment.fdr.ld.Material)
                                                                    && experiment.fdr.ld.Material.map((material, materialIndex) => (
                                                                        <span key={material.id}>
                                                                            { materialIndex > 0 ? ', ' : '' }
                                                                            <a href={property(['entIri'])(material)} target="_blank" rel="noopener noreferrer">
                                                                                { property(['entId'])(material) }
                                                                            </a>
                                                                            {
                                                                                property(['entContent', 'PatientSourced'])(material)
                                                                                    && (
                                                                                        <span>
                                                                                            <span> (</span>
                                                                                            <i>source: </i>patient; <i>genotype: </i>
                                                                                            { property(['entContent', 'PatientSourced', 'Genotype', 'label'])(material) || 'none' }
                                                                                            <span>)</span>
                                                                                        </span>
                                                                                    )
                                                                            }
                                                                        </span>
                                                                    ))
                                                            }
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Functional Impact(s): </strong>
                                                            {
                                                                property(['entContent', 'Effect'])(experiment) && Array.isArray(experiment.entContent.Effect)
                                                                    && experiment.entContent.Effect.map((elem, effectIndex) => (
                                                                        <span key={`${property(['value'])(elem)}-${property(['code'])(elem)}`}>
                                                                            { `${effectIndex > 0 ? '; ' : ''} ${property(['value'])(elem)} ` }
                                                                            <a href={property(['iri'])(elem)} target="_blank" rel="noopener noreferrer">
                                                                                { property(['entId'])(elem) }
                                                                            </a>
                                                                        </span>
                                                                    ))
                                                            }
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Functional Impact Comments: </strong>
                                                            { property(['entContent', 'comments'])(experiment) || 'none' }
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Experimental Repeats: </strong>
                                                            { property(['entContent', 'QC', 'ExperimentalRepeats'])(experiment) }
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Experimental Controls: </strong>
                                                            {
                                                                property(['entContent', 'QC', 'ExperimentalControl', 'normal'])(experiment)
                                                                    && <span><i>Normal: </i>{ experiment.entContent.QC.ExperimentalControl.normal }</span>
                                                            }
                                                            {
                                                                property(['entContent', 'QC', 'ExperimentalControl', 'normal'])(experiment) && property(['entContent', 'QC', 'ExperimentalControl', 'negative'])(experiment)
                                                                    && <span>; </span>
                                                            }
                                                            {
                                                                property(['entContent', 'QC', 'ExperimentalControl', 'negative'])(experiment)
                                                                    && <span><i>Negative: </i>{ experiment.entContent.QC.ExperimentalControl.negative }</span>
                                                            }
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Validation Control: </strong>
                                                            { property(['entContent', 'QC', 'ValidationControl', 'value'])(experiment) }
                                                            {
                                                                property(['entContent', 'QC', 'ValidationControl', 'statement'])(experiment)
                                                                    && <span>{ `, ${property(['entContent', 'QC', 'ValidationControl', 'statement'])(experiment)}` }</span> 
                                                            }
                                                        </span>
                                                        <span className="col-md-12">
                                                            <strong>Statistical Analysis: </strong>
                                                            { property(['entContent', 'QC', 'StatisticalAnalysis', 'value'])(experiment) }
                                                            {
                                                                property(['entContent', 'QC', 'StatisticalAnalysis', 'statement'])(experiment)
                                                                    && <span>{ `, ${property(['entContent', 'QC', 'StatisticalAnalysis', 'statement'])(experiment)}` }</span>
                                                            }
                                                        </span>
                                                    </div>
                                                ))
                                        }
                                        <div className="row notes">
                                            <span className="col-md-12">
                                                <strong>Additional Notes: </strong>
                                                { property(['statements', 0, 'entContent', 'Notes'])(sourceArticles[currentKey]) || 'none' }
                                            </span>
                                        </div>
                                        <div className="row">
                                            <span className="col-md-12">
                                                <strong>Contributor: </strong>
                                                { property(['statements', 0, 'fdr', 'ld', 'Affiliation', 0, 'entId'])(sourceArticles[currentKey]) }
                                            </span>
                                        </div>
                                    </div>
                                }
                            </div>
                        ) : (
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <td colSpan="4">
                                            <span>
                                                &nbsp;&nbsp;
                                                {
                                                    error_genboreeFuncData && error_genboreeFuncData.status === 404
                                                        ? 'No evidence added.'
                                                        : 'Data is unavailable at this time.'
                                                }
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        )
                }
            </div>
        </div>
    );
};

FunctionalDataTable.propTypes = propTypes;
FunctionalDataTable.defaultProps = defaultProps;

export default FunctionalDataTable;
