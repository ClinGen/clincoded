'use strict';

// Map gene properties to their counterparts in HGNC data
const genePropertyMap = {
    'symbol': 'symbol',
    'hgncId': 'hgnc_id',
    'entrezId': 'entrez_id',
    'name': 'name',
    'hgncStatus': 'status',
    'synonyms': 'alias_symbol',
    'nameSynonyms': 'alias_name',
    'previousSymbols': 'prev_symbol',
    'previousNames': 'prev_name',
    'chromosome': 'location',
    'locusType': 'locus_type',
    'omimIds': 'omim_id',
    'pmids': 'pubmed_id'
};

/**
 * Function to parse JSON document of HGNC data for gene object creation
 * @param {object} hgncJSON - JSON document containing HGNC data
 * @returns {object} - object with mapped schema properties set to HGNC values
 */
export function parseHGNC(hgncJSON) {
    let hgncGeneForDB = {};

    Object.keys(genePropertyMap).forEach(property => {
        if (hgncJSON.hasOwnProperty(genePropertyMap[property])) {

            // Expecting PubMed IDs to be returned as numbers, need to convert them to strings
            if (genePropertyMap[property] == 'pubmed_id') {
                if (hgncJSON[genePropertyMap[property]].length) {
                    hgncGeneForDB[property] = [];
                }

                hgncJSON[genePropertyMap[property]].forEach(pmid => {
                    if (pmid || pmid === 0) {
                        hgncGeneForDB[property].push(pmid.toString());
                    }
                });
            } else {
                hgncGeneForDB[property] = hgncJSON[genePropertyMap[property]];
            }
        }
    });

    return hgncGeneForDB;
}

/**
 * Function to filter a gene object for comparison with HGNC data
 * @param {object} geneObject - object containing gene data
 * @returns {object} - object with just mapped schema properties
 */
export function filterGeneForHGNCComparison(geneObject) {
    let geneForComparison = {};

    Object.keys(genePropertyMap).forEach(property => {
        // Intended to save non-empty strings and arrays
        if (geneObject[property] && geneObject[property].length) {
            geneForComparison[property] = geneObject[property];
        }
    });

    return geneForComparison;
}
