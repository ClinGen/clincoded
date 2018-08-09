'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * Render the classification matrix given the data object
 * @param {object} classificationPoints - The points object of a GDM Classification
 */
class GeneDiseaseClassificationMatrix extends Component {
    constructor(props) {
        super(props);
    }

    /**
     * Simple Math.round method
     * alternative #1 - Math.round(num * 10) / 10; //*** returns 1 decimal
     * alternative #2 - Math.round((num + 0.00001) * 100) / 100; //*** returns 2 decimals
     */
    classificationMathRound(number, decimals) {
        return Number(Math.round(number + ('e' + decimals)) + ('e-' + decimals));
    }

    render() {
        const classificationPoints = this.props.classificationPoints;

        return (
            <div className="summary-matrix-wrapper">
                <table className="summary-matrix">
                    <tbody>
                        <tr className="header large bg-gray separator-below">
                            <td colSpan="6">Evidence Type</td>
                            <td>Count</td>
                            <td>Total Points</td>
                            <td>Points Counted</td>
                        </tr>
                        <tr>
                            <td rowSpan="10" className="header"><div className="rotate-text"><div>Genetic Evidence</div></div></td>
                            <td rowSpan="8" className="header"><div className="rotate-text"><div>Case-Level</div></div></td>
                            <td rowSpan="5" className="header"><div className="rotate-text"><div>Variant</div></div></td>
                            <td rowSpan="3" className="header">Autosomal Dominant OR X-linked Disorder</td>
                            <td colSpan="2">Proband with other variant type with some evidence of gene impact</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantTypeWithGeneImpact']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantTypeWithGeneImpact']['totalPointsGiven']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithOtherVariantTypeWithGeneImpact']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Proband with predicted or proven null variant</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNullVariant']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNullVariant']['totalPointsGiven']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['probandWithPredictedOrProvenNullVariant']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Variant is <i>de novo</i></td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['variantIsDeNovo']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['variantIsDeNovo']['totalPointsGiven']}</td>
                            <td>{classificationPoints['autosomalDominantOrXlinkedDisorder']['variantIsDeNovo']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td rowSpan="2" className="header">Autosomal Recessive Disorder</td>
                            <td colSpan="2">Two variants (not predicted/proven null) with some evidence of gene impact in <i>trans</i></td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsWithGeneImpactInTrans']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsWithGeneImpactInTrans']['totalPointsGiven']}</td>
                            <td rowSpan="2">{classificationPoints['autosomalRecessiveDisorder']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Two variants in <i>trans</i> and at least one <i>de novo</i> or a predicted/proven null variant</td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsInTransWithOneDeNovo']['evidenceCount']}</td>
                            <td>{classificationPoints['autosomalRecessiveDisorder']['twoVariantsInTransWithOneDeNovo']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2" rowSpan="3" className="header">Segregation</td>
                            <td>Candidate gene sequencing</td>
                            <td className="classification-matrix-summed-lod"><i>Summed LOD:</i><br /><span>{this.classificationMathRound(classificationPoints['segregation']['evidencePointsCandidate'], 2)}</span></td>
                            <td>{classificationPoints['segregation']['evidenceCountCandidate']}</td>
                            <td rowSpan="3">{classificationPoints['segregation']['pointsCounted']}</td>
                            <td rowSpan="3">{classificationPoints['segregation']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td>Exome/genome or all genes sequenced in linkage region</td>
                            <td className="classification-matrix-summed-lod"><i>Summed LOD:</i><br /><span>{this.classificationMathRound(classificationPoints['segregation']['evidencePointsExome'], 2)}</span></td>
                            <td>{classificationPoints['segregation']['evidenceCountExome']}</td>
                        </tr>
                        <tr>
                            <td className="header">Total summed segregation evidence</td>
                            <td className="header">{this.classificationMathRound(classificationPoints['segregation']['totalPointsGiven'], 2)}</td>
                            <td className="header">{classificationPoints['segregation']['evidenceCountTotal']}</td>
                        </tr>
                        <tr>
                            <td colSpan="5" className="header">Case-Control</td>
                            <td>{classificationPoints['caseControl']['evidenceCount']}</td>
                            <td>{classificationPoints['caseControl']['totalPointsGiven']}</td>
                            <td>{classificationPoints['caseControl']['pointsCounted']}</td>
                        </tr>
                        <tr className="header separator-below">
                            <td colSpan="7">Genetic Evidence Total</td>
                            <td>{classificationPoints['geneticEvidenceTotal']}</td>
                        </tr>
                        <tr>
                            <td rowSpan="12" className="header"><div className="rotate-text"><div>Experimental Evidence</div></div></td>
                            <td colSpan="3" rowSpan="3" className="header">Functional</td>
                            <td colSpan="2">Biochemical Functions</td>
                            <td>{classificationPoints['function']['biochemicalFunctions']['evidenceCount']}</td>
                            <td>{classificationPoints['function']['biochemicalFunctions']['totalPointsGiven']}</td>
                            <td rowSpan="3">{classificationPoints['function']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Protein Interactions</td>
                            <td>{classificationPoints['function']['proteinInteractions']['evidenceCount']}</td>
                            <td>{classificationPoints['function']['proteinInteractions']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Expression</td>
                            <td>{classificationPoints['function']['expression']['evidenceCount']}</td>
                            <td>{classificationPoints['function']['expression']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" rowSpan="2" className="header">Functional Alteration</td>
                            <td colSpan="2">Patient cells</td>
                            <td>{classificationPoints['functionalAlteration']['patientCells']['evidenceCount']}</td>
                            <td>{classificationPoints['functionalAlteration']['patientCells']['totalPointsGiven']}</td>
                            <td rowSpan="2">{classificationPoints['functionalAlteration']['pointsCounted']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Non-patient cells</td>
                            <td>{classificationPoints['functionalAlteration']['nonPatientCells']['evidenceCount']}</td>
                            <td>{classificationPoints['functionalAlteration']['nonPatientCells']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" rowSpan="2" className="header">Models</td>
                            <td colSpan="2">Non-human model organism</td>
                            <td>{classificationPoints['modelsRescue']['modelsNonHuman']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['modelsNonHuman']['totalPointsGiven']}</td>
                            <td rowSpan="6">{classificationPoints['modelsRescue']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Cell culture model</td>
                            <td>{classificationPoints['modelsRescue']['modelsCellCulture']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['modelsCellCulture']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="3" rowSpan="4" className="header">Rescue</td>
                            <td colSpan="2">Rescue in human</td>
                            <td>{classificationPoints['modelsRescue']['rescueHuman']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescueHuman']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Rescue in non-human model organism</td>
                            <td>{classificationPoints['modelsRescue']['rescueNonHuman']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescueNonHuman']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Rescue in cell culture model</td>
                            <td>{classificationPoints['modelsRescue']['rescueCellCulture']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescueCellCulture']['totalPointsGiven']}</td>
                        </tr>
                        <tr>
                            <td colSpan="2">Rescue in patient cells</td>
                            <td>{classificationPoints['modelsRescue']['rescuePatientCells']['evidenceCount']}</td>
                            <td>{classificationPoints['modelsRescue']['rescuePatientCells']['totalPointsGiven']}</td>
                        </tr>
                        <tr className="header separator-below">
                            <td colSpan="7">Experimental Evidence Total</td>
                            <td>{classificationPoints['experimentalEvidenceTotal']}</td>
                        </tr>
                        <tr className="total-row header">
                            <td colSpan="8">Total Points</td>
                            <td>{classificationPoints['evidencePointsTotal']}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

GeneDiseaseClassificationMatrix.propTypes = {
    classificationPoints: PropTypes.object
};

export default GeneDiseaseClassificationMatrix;
