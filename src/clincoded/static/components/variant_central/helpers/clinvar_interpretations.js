// # ClinVar Interpretations Helper: Getter Method
// # Parameters: XML data or response object
// # Usage: getClinvarInterpretations(xml)
// # Dependency: ClinVar API response

'use strict';

// FIXME: Consoliate repetitive code that can be shared in different methods
export function getClinvarInterpretations(xml) {
    let interpretationSummary = {};
    let xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    let ClinVarResult = xmlDoc.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResult) {
        let VariationReport = ClinVarResult.getElementsByTagName('VariationReport')[0];
        if (VariationReport) {
            let ObservationList = VariationReport.getElementsByTagName('ObservationList')[0];
            if (ObservationList) {
                let ObservationNodes = ObservationList.getElementsByTagName('Observation');
                if (ObservationNodes && ObservationNodes.length) {
                    let ReviewStatus, Description, DateLastEvaluated, SubmissionCount, Explanation;
                    for (var i = 0; i < ObservationNodes.length; i++) {
                        let ObservationType = ObservationNodes[i].getAttribute('ObservationType');
                        if (ObservationType === 'primary') {
                            SubmissionCount = ObservationNodes[i].getAttribute('SubmissionCount');
                            ReviewStatus = ObservationNodes[i].getElementsByTagName('ReviewStatus')[0];
                            let ClinicalSignificance = ObservationNodes[i].getElementsByTagName('ClinicalSignificance')[0];
                            if (ClinicalSignificance) {
                                DateLastEvaluated = ClinicalSignificance.getAttribute('DateLastEvaluated');
                                Description = ClinicalSignificance.getElementsByTagName('Description')[0];
                                Explanation = ClinicalSignificance.getElementsByTagName('Explanation')[0];
                            }
                        }
                    }
                    interpretationSummary = {
                        'ReviewStatus': ReviewStatus.textContent,
                        'ClinicalSignificance': Description ? Description.textContent : null,
                        'Explanation': Explanation ? Explanation.textContent : null,
                        'DateLastEvaluated': DateLastEvaluated,
                        'SubmissionCount': SubmissionCount
                    };
                }
            }
        }
    }
    return interpretationSummary;
}

export function getClinvarRCVs(xml) {
    // Make sure we have at least one RCV node to work with
    // Then put each RCV id into an array
    let RCVs = [];
    let xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    let ClinVarResult = xmlDoc.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResult) {
        let VariationReport = ClinVarResult.getElementsByTagName('VariationReport')[0];
        if (VariationReport) {
            // Catch variation id and will used to filter RCVs later
            let v_id = VariationReport.getAttribute('VariationID');
            let ObservationList = VariationReport.getElementsByTagName('ObservationList')[0];
            if (ObservationList) {
                let ObservationNodes = ObservationList.getElementsByTagName('Observation');
                if (ObservationNodes && ObservationNodes.length) {
                    for (var i = 0; i < ObservationNodes.length; i++) {
                        // Filter RVCs, collect primary RCVs of this variant only
                        if (ObservationNodes[i].getAttribute('VariationID') === v_id && ObservationNodes[i].getAttribute('ObservationType') === 'primary') {
                            let RCV_Nodes = ObservationNodes[i].getElementsByTagName('RCV');
                            if (RCV_Nodes.length) {
                                for(var j = 0; j < RCV_Nodes.length; j++) {
                                    RCVs.push(RCV_Nodes[j].textContent);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return RCVs;
}

// Method to parse conditions data for the most recent version of individual RCV accession
export function parseClinvarInterpretation(result) {
    // List of Type values of <Trait>. Each should be traited as disease and collected.
    //const disease_types = ['Disease', 'NamedProteinVariant'];

    // Define 'interpretation' object model
    let interpretation = {
        'RCV': '',
        'reviewStatus': '',
        'clinicalSignificance': '',
        'conditions': []
    };
    // Find the <ReferenceClinVarAssertion> node in the returned XML
    let resultSet = new DOMParser().parseFromString(result, 'text/xml');
    let ClinVarResultSet = resultSet.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResultSet) {
        let ClinVarSet = ClinVarResultSet.getElementsByTagName('ClinVarSet')[0];
        if (ClinVarSet) {
            let ReferenceClinVarAssertion = ClinVarSet.getElementsByTagName('ReferenceClinVarAssertion')[0];
            if (ReferenceClinVarAssertion) {
                // Get clinvar accession if <ReferenceClinVarAssertion> node is found
                let ClinVarAccession = ReferenceClinVarAssertion.getElementsByTagName('ClinVarAccession')[0];
                // Get clinical significance description if <ReferenceClinVarAssertion> node is found
                let ClinicalSignificance = ReferenceClinVarAssertion.getElementsByTagName('ClinicalSignificance')[0];
                if (ClinicalSignificance) {
                    // Expect only 1 <ReviewStatus> node and 1 <Description> node within <ClinicalSignificance>
                    let ReviewStatus = ClinicalSignificance.getElementsByTagName('ReviewStatus')[0];
                    let Description = ClinicalSignificance.getElementsByTagName('Description')[0];
                    // Set 'RCV' and 'clinicalSignificance' property values of the 'interpretation' object
                    interpretation['RCV'] = ClinVarAccession.getAttribute('Acc');
                    interpretation['reviewStatus'] = ReviewStatus.textContent;
                    interpretation['clinicalSignificance'] = Description.textContent;
                }
                // Get conditions/disease if <ReferenceClinVarAssertion> node is found
                let TraitSet = ReferenceClinVarAssertion.getElementsByTagName('TraitSet')[0];
                if (TraitSet) {
                    let Traits = TraitSet.getElementsByTagName('Trait');
                    // Handle one <Trait> node (e.g. each associated condition) at a time
                    for(var i = 0; i < Traits.length; i++) {
                        let nameNodes = [],
                            xRefNodes = [],
                            identifiers = [],
                            disease = '';
                        //if (disease_types.includes(Trait.getAttribute('Type'))) {
                        nameNodes = Traits[i].getElementsByTagName('Name');
                        // Expect to find the only one <ElementValue> node in each <Name> node
                        for(var l = 0; l < nameNodes.length ; l++) {
                            let ElementValueNode = nameNodes[l].getElementsByTagName('ElementValue')[0];
                            if (ElementValueNode.getAttribute('Type') === 'Preferred') {
                                // Set disease name property value for each associated condition
                                disease = ElementValueNode.textContent;
                            }
                        }

                        for (var j = 0; j < Traits[i].childNodes.length; j++) {
                            if (Traits[i].childNodes[j].nodeName === 'XRef' && Traits[i].childNodes[j].getAttribute('ID') && Traits[i].childNodes[j].getAttribute('DB')) {
                                if (Traits[i].childNodes[j].getAttribute('Type') && Traits[i].childNodes[j].getAttribute('Type') === 'primary') {
                                    xRefNodes.push(Traits[i].childNodes[j]);
                                } else if (!Traits[i].childNodes[j].getAttribute('Type')) {
                                    xRefNodes.push(Traits[i].childNodes[j]);
                                }
                            }
                        }

                        // Set identifiers property value for each associated condition
                        if (xRefNodes) {
                            for(var k = 0; k < xRefNodes.length; k++) {
                                let identifier = {
                                    'db': xRefNodes[k].getAttribute('DB'),
                                    'id': xRefNodes[k].getAttribute('ID')
                                };
                                identifiers.push(identifier);
                            }
                        }
                        //}
                        let condition = {
                            'name': disease,
                            'identifiers': identifiers
                        };
                        interpretation['conditions'].push(condition);
                    }
                }
            }
        }
    }
    return interpretation;
}
