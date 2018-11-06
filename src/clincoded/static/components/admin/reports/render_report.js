import React from 'react';

/**
 * Method to render variant interpretations quarterly report for NIH
 */
export const RenderInterpretationQuarterlyNIH = (props) => {
    return (
        <div className="report-content">
            <table className="table table-striped table-bordered table-report">
                <thead>
                    <tr>
                        <th className="report-header-cell" onClick={() => props.sortBy('affiliationName')}>Expert Panel</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('totalInterpretations')}>Total Interpretations (started)</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('interpretationsWithSavedSummary')}>Interpretations with saved summaries (not provisioned or approved)</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('interpretationsProvisional')}>Interpretations provisioned</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('interpretationsApproved')}>Interpretations approved</th>
                    </tr>
                </thead>
                <tbody>
                    {props.affiliatedInterpreationsList.map(item => {
                        return (
                            <tr key={item.affiliationId}>
                                <td className="report-content-cell">{item.affiliationName}</td>
                                <td className="report-content-cell">{item.totalInterpretations}</td>
                                <td className="report-content-cell">{item.interpretationsWithSavedSummary}</td>
                                <td className="report-content-cell">{item.interpretationsProvisional}</td>
                                <td className="report-content-cell">{item.interpretationsApproved}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Method to render gene-disease records quarterly report for NIH
 */
export const RenderGeneDiseaseRecordQuarterlyNIH = (props) => {
    return (
        <div className="report-content">
            <table className="table table-striped table-bordered table-report">
                <thead>
                    <tr>
                        <th className="report-header-cell" onClick={() => props.sortBy('affiliationName')}>Expert Panel</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('totalGDMs')}>Total Gene-Disease records (started)</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('gdmsWithSavedSummary')}>Gene-Disease records with saved classifications (not provisioned or approved or published)</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('gdmsProvisional')}>Gene-Disease records provisioned</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('gdmsApproved')}>Gene-Disease records approved</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('gdmsPublished')}>Gene-Disease records published</th>
                    </tr>
                </thead>
                <tbody>
                    {props.affiliatedGDMsList.map(item => {
                        return (
                            <tr key={item.affiliationId}>
                                <td className="report-content-cell">{item.affiliationName}</td>
                                <td className="report-content-cell">{item.totalGdms}</td>
                                <td className="report-content-cell">{item.gdmsWithSavedSummary}</td>
                                <td className="report-content-cell">{item.gdmsProvisional}</td>
                                <td className="report-content-cell">{item.gdmsApproved}</td>
                                <td className="report-content-cell">{item.gdmsPublished}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
