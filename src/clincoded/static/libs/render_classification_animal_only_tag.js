'use strict';
import React from 'react';

/**
 * Method to determate if 'Animal Modal Only' tag to be displayed given the provisional classification
 * Applicable to: GCI Classification Matrix, GCI Evaluation Summary
 * @param {object} provisional - The given provisional classification 
 */
export function renderAnimalOnlyTag(provisional) {
    let classificationPoints = provisional.classificationPoints;
    // Check if final classification is automatically calculated to "No Known Disease Relationship" and
    // only non-human points are scored in experimental evidence, then display Animal Model Only tag
   if (provisional.autoClassification === 'No Known Disease Relationship' &&
       classificationPoints && 
       classificationPoints.modelsRescue && classificationPoints.modelsRescue.modelsNonHuman &&
       classificationPoints.modelsRescue.modelsNonHuman.totalPointsGiven && 
       classificationPoints.modelsRescue.modelsNonHuman.totalPointsGiven > 0 &&
       classificationPoints.modelsRescue.modelsNonHuman.totalPointsGiven === classificationPoints.experimentalEvidenceTotal) {
            return <span className="label label-warning">Animal Model Only</span>;
    }
    else {
        return null;
    }
}

