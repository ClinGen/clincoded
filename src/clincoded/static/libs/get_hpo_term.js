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
        this.state = {
            hpoTermList: null
        };
    }

    componentDidMount() {
        this.fetchHpoTerms(this.props.hpoIds);
    }

    fetchHpoTerms(ids) {
        let hpoTermList = [];
        ids.forEach(id => {
            let hpoTerm;
            let url = external_url_map['HPOApi'] + id.replace(':', '_');
            // Make the OLS REST API call
            this.context.fetch(url, {
                method: 'GET',
                headers: {'Accept': 'application/json'}
            }).then(response => {
                if (!response.ok) throw response;
                return response.json();
            }).then(result => {
                let termLabel = result['_embedded']['terms'][0]['label'];
                if (termLabel) {
                    hpoTerm = termLabel;
                } else {
                    hpoTerm = id + ' (note: term not found)';
                }
                hpoTermList.push(hpoTerm);
                this.setState({hpoTermList: hpoTermList});
            }, error => {
                // Unsuccessful retrieval
                console.warn('Error in fetching HPO data =: %o', error);
                hpoTerm = id + ' (note: term not found)';
                hpoTermList.push(hpoTerm);
                this.setState({hpoTermList: hpoTermList});
            });
        });
    }

    render() {
        let hpoTermList = this.state.hpoTermList;
        return (
            <ul className="hpo-terms-list">
                {hpoTermList && hpoTermList.length ?
                    hpoTermList.map((term, i) => <li key={i} className="hpo-term-item"><span>{term}</span></li>)
                    : null}
            </ul>
        );
    }
}

HpoTerms.propTypes = {
    hpoIds: PropTypes.array
};

HpoTerms.contextTypes = {
    fetch: PropTypes.func
};

export default HpoTerms;