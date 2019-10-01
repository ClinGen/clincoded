/**
 * Return all interpretation record objects flattened in an array,
 * including evaluations, provisional_variant, extra_evidence
 * @param {object} interpretation - The interpretation record data object
 */
export function getAllInterpretationObjects(interpretation) {
    let totalObjects = [];
    // loop through evaluations 
    let evaluations = interpretation.evaluations && interpretation.evaluations.length ? interpretation.evaluations : [];
    evaluations.forEach(evaluation => {
        // Get evaluation records
        totalObjects.push(filteredObject(evaluation));
        // loop through population
        let populations = evaluation.population && evaluation.population.length ? evaluation.population : [];
        if (populations.length) {
            populations.forEach(population => {
                // Get population
                totalObjects.push(filteredObject(population));
            });
        }

        // loop through computational
        let computationals = evaluation.computational && evaluation.computational.length ? evaluation.computational : [];
        if (computationals.length) {
            computationals.forEach(computational => {
                // Get computational
                totalObjects.push(filteredObject(computational));
            });
        }
    });

    // loop through extra_evidence_list 
    let extra_evidences = interpretation.extra_evidence_list && interpretation.extra_evidence_list.length ? interpretation.extra_evidence_list : [];
    extra_evidences.forEach(extra_evidence => {
        // Get extra_evidence records
        totalObjects.push(filteredObject(extra_evidence));
    });

    // Get provisional_variant objects
    let provisional_variants = interpretation.provisional_variant && gdm.provisional_variant.length ? gdm.provisional_variant : [];
    provisional_variants.forEach(provisional_variant => {
        totalObjects.push(filteredObject(provisional_variant));
    });

    return totalObjects;
}

/**
 * Method to filter object keys
 * @param {object} target - A targeted data object in interpretation
 */
function filteredObject(target) {
    const allowed = ['date_created', 'last_modified', 'submitted_by', '@type', 'affiliation', '@id'];

    const filtered = Object.keys(target)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
            obj[key] = target[key];
            return obj;
        }, {});

    return filtered;
}
