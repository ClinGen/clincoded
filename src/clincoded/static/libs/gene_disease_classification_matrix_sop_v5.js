'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Render the classification matrix given the data object
 * @param {object} classificationPoints - The points object of a GDM Classification
 */
class GeneDiseaseClassificationMatrixSOPv5 extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const classificationPoints = this.props.classificationPoints;

        return (
            <div className="summary-matrix-wrapper">
                <table className="summary-matrix">
                    <tbody>
                        <tr className="header large bg-gray separator-below">
                            <td colSpan="5">Evidence Type</td>
                            <td>Count</td>
                            <td>Total Points</td>
                            <td>Points Counted</td>
                        </tr>
                        <tr>
                            <td rowSpan="8" className="header"><div className="rotate-text"><div>Genetic Evidence</div></div></td>
                            <td rowSpan="6" className="header"><div className="rotate-text"><div>Case-Level</div></div></td>
                            <td rowSpan="5" className="header"><div className="rotate-text"><div>Variant</div></div></td>
                            <td rowSpan="3" className="header">Autosomal Dominant OR X-linked Disorder</td>
                            <td>Proband with other variant type with some evidence of gene impact</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantTypeWithGeneImpact']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantTypeWithGeneImpact']['totalPointsGiven']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantTypeWithGeneImpact']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td>Proband with predicted or proven null variant</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNullVariant']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNullVariant']['totalPointsGiven']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNullVariant']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td>Variant is <i>de novo</i></td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['variantIsDeNovo']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['variantIsDeNovo']['totalPointsGiven']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['variantIsDeNovo']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td rowSpan="2" className="header">Autosomal Recessive Disorder</td>
                            <td>Two variants (not predicted/proven null) with some evidence of gene impact in <i>trans</i></td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsWithGeneImpactInTrans']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsWithGeneImpactInTrans']['totalPointsGiven']}</td>
                            <td rowSpan="2">{classificationPoints['autosomalRecessiveDisorder']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td>Two variants in <i>trans</i> and at least one <i>de novo</i> or a predicted/proven null variant</td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsInTransWithOneDeNovo']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsInTransWithOneDeNovo']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" className="header">Segregation</td>
                            <td>{classificationPoints['segregation']['evidenceCount']}</td>
                            <td>
                                <span>{classificationPoints['segregation']['pointsCounted']}</span> (<abbr title="Combined LOD Score"><span>{classificationPoints['segregation']['totalPointsGiven']}</span><strong>*</strong></abbr>)
                            </td>
                            <td>{classificationPoints['segregation']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td colSpan="4" className="header">Case-Control</td>
                            <td>{classificationPoints['caseControl']['evidenceCount']}</td>
                            <td>{classificationPoints['caseControl']['totalPointsGiven']}</td>
                            <td>{classificationPoints['caseControl']['pointsCounted']}</td>
                        </tr>
                        <tr className="header separator-below">
                            <td colSpan="6">Genetic Evidence Total</td>
                            <td>{classificationPoints['geneticEvidenceTotal']}</td>
                        </tr>
                        <tr>
                            <td rowSpan="12" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
                            <td colSpan="3" rowSpan="3" className="header">Functional</td>
                            <td>Biochemical Functions</td>
                            <td>{classificationPoints['function']['biochemicalFunctions']['evidenceCount']}</td>
                            <td>{classificationPoints['function']['biochemicalFunctions']['totalPointsGiven']}</td>
                            <td rowSpan="3">{classificationPoints['function']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td>Protein Interactions</td>
                            <td>{classificationPoints['function']['proteinInteractions']['evidenceCount']}</td>
                            <td>{classificationPoints['function']['proteinInteractions']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td>Expression</td>
                            <td>{classificationPoints['function']['expression']['evidenceCount']}</td>
                            <td>{classificationPoints['function']['expression']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" rowSpan="2" className="header">Functional Alteration</td>
                            <td>Patient cells</td>
                            <td>{classificationPoints['functionalAlteration']['patientCells']['evidenceCount']}</td>
                            <td>{classificationPoints['functionalAlteration']['patientCells']['totalPointsGiven']}</td>
                            <td rowSpan="2">{classificationPoints['functionalAlteration']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td>Non-patient cells</td>
                            <td>{classificationPoints['functionalAlteration']['nonPatientCells']['evidenceCount']}</td>
                            <td>{classificationPoints['functionalAlteration']['nonPatientCells']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" rowSpan="2" className="header">Models</td>
                            <td>Non-human model organism</td>
                            <td>{classificationPoints['modelsRescue']['modelsNonHuman']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['modelsNonHuman']['totalPointsGiven']}</td>
                            <td rowSpan="6">{classificationPoints['modelsRescue']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td>Cell culture model</td>
                            <td>{classificationPoints['modelsRescue']['modelsCellCulture']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['modelsCellCulture']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" rowSpan="4" className="header">Rescue</td>
                            <td>Rescue in human</td>
                            <td>{classificationPoints['modelsRescue']['rescueHuman']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescueHuman']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td>Rescue in non-human model organism</td>
                            <td>{classificationPoints['modelsRescue']['rescueNonHuman']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescueNonHuman']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td>Rescue in cell culture model</td>
                            <td>{classificationPoints['modelsRescue']['rescueCellCulture']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescueCellCulture']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td>Rescue in patient cells</td>
                            <td>{classificationPoints['modelsRescue']['rescuePatientCells']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescuePatientCells']['totalPointsGiven']}</td>
                        </tr>
                        <tr className="header separator-below">
                            <td colSpan="6">Experimental Evidence Total</td>
                            <td>{classificationPoints['experimentalEvidenceTotal']}</td>
                        </tr>
                        <tr className="total-row header">
                            <td colSpan="7">Total Points</td>
                            <td>{classificationPoints['evidencePointsTotal']}</td>
                        </tr>
                    </tbody>
                </table>
                <strong>*</strong> &ndash; Combined LOD Score
            </div>
        );
    }
}

GeneDiseaseClassificationMatrixSOPv5.propTypes = {
    classificationPoints: PropTypes.object
};

export default GeneDiseaseClassificationMatrixSOPv5;
