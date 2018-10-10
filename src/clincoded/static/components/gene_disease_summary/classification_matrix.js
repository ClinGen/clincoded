'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { isScoringForCurrentSOP } from '../../libs/sop';
import GeneDiseaseClassificationMatrix from '../../libs/gene_disease_classification_matrix';
import GeneDiseaseClassificationMatrixSOPv5 from '../../libs/gene_disease_classification_matrix_sop_v5';

class GeneDiseaseEvidenceSummaryClassificationMatrix extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const classification = this.props.classification;
        const classificationPoints = classification.classificationPoints;

        return (
            <div className="evidence-summary panel-classification-matrix">
                <div className="panel panel-info">
                    <div className="panel-heading">
                        <h3 className="panel-title">Calculated Classification Matrix</h3>
                    </div>
                    {isScoringForCurrentSOP(classificationPoints) ?
                        <GeneDiseaseClassificationMatrix classificationPoints={classificationPoints} />
                    :
                        <GeneDiseaseClassificationMatrixSOPv5 classificationPoints={classificationPoints} />
                    }
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryClassificationMatrix.propTypes = {
    classification: PropTypes.object
};

export default GeneDiseaseEvidenceSummaryClassificationMatrix;
