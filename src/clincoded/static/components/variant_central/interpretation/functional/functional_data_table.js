'use strict';
import React from 'react';
import PropTypes from 'prop-types';
import { property } from 'underscore';

import { showActivityIndicator } from '../../../activity_indicator';
import { PmidSummary } from '../../../curator';
import { external_url_map } from '../../../globals';

/**
 * This component displays functional data in the experimental tab of the VCI
 * 
 * Because of the deep nesting of the LDH and FDR data that is retrieved,
 * the property() function from underscore.js is employed quite extensively to
 * check the validity of data in order to prevent data access errors
 * 
 * _.property(path)
 * Returns a function that will return the specified property of any passed-in object.
 * @path may be specified as a simple key, or as an array of object keys or array indexes, for deep property fetching.
 * 
 * Ex:
 * property(['statements', 0, 'fdr', 'ld', 'Affiliation', 0, 'entId'])(currentSource);
 * if every key in the path is defined, this will return the value of "entId"
 * if an undefined key is encountered, this will return undefined
 * 
 */

const propTypes = {
    selectedTab: PropTypes.number,
    functionalData: PropTypes.object,
    loading_ldhFuncData: PropTypes.bool.isRequired,
    error_ldhFuncData: PropTypes.object,
    handleTabSelect: PropTypes.func.isRequired,
    isPatientSourced: PropTypes.func.isRequired,
    getGenotypeLabel: PropTypes.func.isRequired,
    getOntologiesUrl: PropTypes.func.isRequired,
};

const defaultProps = {
    selectedTab: 0,
    functionalData: {},
    error_ldhFuncData: null,
};

const FunctionalDataTable = ({
    selectedTab,
    functionalData,
    loading_ldhFuncData,
    error_ldhFuncData,
    handleTabSelect,
    isPatientSourced,
    getGenotypeLabel,
    getOntologiesUrl,
}) => {
    const articleKeys = functionalData && Object.keys(functionalData);
    const currentKey = articleKeys && articleKeys[selectedTab];
    const currentSource = functionalData && functionalData[currentKey];
    const pmid = property(['pubmedSource', 'pmid'])(currentSource);
    const pubmedSource = property(['pubmedSource'])(currentSource);
    const afisStatements = property(['statements'])(currentSource);
    const additionalNotes = property(['statements', 0, 'entContent', 'Notes'])(currentSource) || 'None';
    const contributor = property(['statements', 0, 'fdr', 'ld', 'Affiliation', 0, 'entId'])(currentSource);
    return (
        <div className="panel panel-info functional-impact-panel">
            <div className="panel-heading">
                <h3 className="panel-title">Structured Narrative of Functional Impact</h3>
            </div>
            <div className="panel-content-wrapper">
                {
                    loading_ldhFuncData
                        && showActivityIndicator('Retrieving data... ')
                }
                {
                    currentKey && articleKeys && articleKeys.length > 0 && !loading_ldhFuncData
                        ? (
                            <div className="functional-tabs-wrapper">
                                <ul className="vci-tabs-header tab-label-list vci-subtabs dynamic-tabs" role="tablist">
                                    {
                                        articleKeys.map((key, articleIndex) => (
                                            <li
                                                key={key}
                                                className="tab-label"
                                                role="tab"
                                                onClick={() => handleTabSelect(articleIndex)}
                                                aria-selected={selectedTab === articleIndex}
                                            >
                                                { `Source ${articleIndex + 1}` }
                                            </li>
                                        ))
                                    }
                                </ul>
                                {
                                    <div role="tabpanel" className="panel-body experiment-table tab-panel">
                                        <div className="row">
                                            <span className="col-md-12">
                                                <strong>{ `Source: PMID:${pmid || ''}` }</strong>
                                            </span>
                                            <span className="col-md-12">
                                                <PmidSummary
                                                    article={pubmedSource}
                                                    displayJournal
                                                />
                                            </span>
                                        </div>
                                        {
                                            afisStatements && Array.isArray(afisStatements)
                                                && afisStatements.map((experiment, experimentIndex) => {
                                                    const experimentId = property(['ldhId'])(experiment);
                                                    const methodIri = property(['fdr', 'ld', 'Method', 0, 'entIri'])(experiment);
                                                    const methodCode = property(['fdr', 'ld', 'Method', 0, 'entContent', 'code'])(experiment);
                                                    const methodUrl = getOntologiesUrl(methodCode, methodIri);
                                                    const methodEntId = property(['fdr', 'ld', 'Method', 0, 'entId'])(experiment);
                                                    const materials = property(['fdr', 'ld', 'Material'])(experiment);
                                                    const genotypes = property(['fdr', 'ld', 'Genotype'])(experiment);
                                                    const ldSet = property(['fdr', 'ld', 'LdSet'])(experiment);
                                                    const effects = property(['entContent', 'Effect'])(experiment);
                                                    const comments = property(['entContent', 'comments'])(experiment) || 'None';
                                                    const experimentalRepeats = property(['entContent', 'QC', 'ExperimentalRepeats'])(experiment);
                                                    const experimentalControlNormal = property(['entContent', 'QC', 'NormalControl'])(experiment);
                                                    const validationControlValue = property(['entContent', 'QC', 'ValidationControl', 'value'])(experiment);
                                                    const validationControlStatement = property(['entContent', 'QC', 'ValidationControl', 'statement'])(experiment);
                                                    const statisticalAnalysisValue = property(['entContent', 'QC', 'StatisticalAnalysis', 'value'])(experiment);
                                                    const statisticalAnalysisStatement = property(['entContent', 'QC', 'StatisticalAnalysis', 'statement'])(experiment);
                                                    return (
                                                        <div className="row experiment" key={experimentId}>
                                                            <span className="col-md-12">
                                                                <strong className="experiment-label">{ `Experiment ${experimentIndex + 1}` }</strong>
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Method: </strong>
                                                                <a href={methodUrl} target="_blank" rel="noopener noreferrer">
                                                                    { methodEntId }
                                                                </a>
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Material(s): </strong>
                                                                {
                                                                    materials && Array.isArray(materials)
                                                                        && materials.map((material, materialIndex) => {
                                                                            const materialId = property(['ldhId'])(material);
                                                                            const materialIri = property(['entIri'])(material);
                                                                            const materialCode = property(['entContent', 'code'])(material);
                                                                            const materialUrl = getOntologiesUrl(materialCode, materialIri);
                                                                            const materialEntId = property(['entId'])(material);
                                                                            const patientSourced = isPatientSourced(materialId, ldSet);
                                                                            const genotypeLabel = getGenotypeLabel(materialId, ldSet, genotypes);
                                                                            return (
                                                                                <span key={materialId}>
                                                                                    { materialIndex > 0 ? ', ' : '' }
                                                                                    <a href={materialUrl} target="_blank" rel="noopener noreferrer">
                                                                                        { materialEntId }
                                                                                    </a>
                                                                                    {
                                                                                        patientSourced
                                                                                            && (
                                                                                                <span>
                                                                                                    <span> (</span>
                                                                                                    <i>source: </i>patient; <i>genotype: </i>
                                                                                                    { genotypeLabel }
                                                                                                    <span>)</span>
                                                                                                </span>
                                                                                            )
                                                                                    }
                                                                                </span>
                                                                            );
                                                                        })
                                                                }
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Functional Impact(s): </strong>
                                                                {
                                                                    effects && Array.isArray(effects)
                                                                        && effects.map((effect, effectIndex) => {
                                                                            const effectValue = property(['value'])(effect);
                                                                            const effectIri = property(['iri',])(effect);
                                                                            const effectCode = property(['code'])(effect);
                                                                            const effectUrl = getOntologiesUrl(effectCode, effectIri);
                                                                            const effectLabel = property(['label'])(effect);
                                                                            return (
                                                                                <span key={`${effectValue}-${effectCode}`}>
                                                                                    { `${effectIndex > 0 ? '; ' : ''} ${effectValue} ` }
                                                                                    <a href={effectUrl} target="_blank" rel="noopener noreferrer">
                                                                                        { effectLabel }
                                                                                    </a>
                                                                                </span>
                                                                            );
                                                                        })
                                                                }
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Functional Impact Comments: </strong>
                                                                { comments }
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Experimental Repeats: </strong>
                                                                { experimentalRepeats }
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Experimental Controls: </strong>
                                                                {
                                                                    experimentalControlNormal
                                                                        && <span><i>Normal: </i>{ experimentalControlNormal }</span>
                                                                }
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Validation Control: </strong>
                                                                { validationControlValue }
                                                                {
                                                                    validationControlStatement
                                                                        && <span>{ `, ${validationControlStatement}` }</span> 
                                                                }
                                                            </span>
                                                            <span className="col-md-12">
                                                                <strong>Statistical Analysis: </strong>
                                                                { statisticalAnalysisValue }
                                                                {
                                                                    statisticalAnalysisStatement
                                                                        && <span>{ `, ${statisticalAnalysisStatement}` }</span>
                                                                }
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                        }
                                        <div className="row notes">
                                            <span className="col-md-12">
                                                <strong>Additional Notes: </strong>
                                                { additionalNotes }
                                            </span>
                                        </div>
                                        <div className="row">
                                            <span className="col-md-12">
                                                <strong>Contributor: </strong>
                                                { contributor }
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
                                                    error_ldhFuncData
                                                        ? 'Data is unavailable at this time.'
                                                        : 'No evidence added.'
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
