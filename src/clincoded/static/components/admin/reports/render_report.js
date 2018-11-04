import React from 'react';

export const RenderInterpretationQuarterlyNIH = (props) => {
    return (
        <div className="report-content">
            <table className="table table-striped table-bordered table-report">
                <thead>
                    <tr>
                        <th className="report-header-cell" onClick={() => props.sortBy('affiliationName')}>Expert Panel</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('totalInterpretations')}>Total Interpretations</th>
                        <th className="report-header-cell" onClick={() => props.sortBy('interpretationsWithSavedSummary')}>Interpretations with saved summaries</th>
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
