'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ClassificationMatrix from '../../libs/classification_matrix';

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
                    <ClassificationMatrix classificationPoints={classificationPoints} />
                </div>
            </div>
        );
    }
}

GeneDiseaseEvidenceSummaryClassificationMatrix.propTypes = {
    classification: PropTypes.object
};

export default GeneDiseaseEvidenceSummaryClassificationMatrix;
