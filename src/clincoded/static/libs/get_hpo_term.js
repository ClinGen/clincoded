'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../components/globals';

/**
 * Stateful component to render the HPO term names given 
 * a list of HPO IDs passed as a prop.
 * 
 * Dependent on OLS API service to return data
 * If no data found, simply return the HPO IDs themselves
 * 
 * Due to the XHR requests upon receiving the prop, it relies
 * on changing the state to trigger the re-rendering.
 */
class HpoTerms extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { hpoIds, hpoTerms } = this.props;
        return (
            <ul className="hpo-terms-list">
                {hpoIds && hpoIds.length ?
                    hpoIds.map((id, i) => <li key={i} className="hpo-term-item"><span>{hpoTerms[id]}</span></li>)
                    : null}
            </ul>
        );
    }
}

HpoTerms.propTypes = {
    hpoIds: PropTypes.array,
    hpoTerms: PropTypes.object
};

export default HpoTerms;