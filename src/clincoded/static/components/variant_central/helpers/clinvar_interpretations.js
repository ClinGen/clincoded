// # ClinVar Interpretations Helper: Getter Method
// # Parameters: XML data or response object
// # Usage: getClinvarInterpretations(xml)
// # Dependency: ClinVar API response

'use strict';

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
                    for (let ObservationNode of ObservationNodes) {
                        // Filter RVCs, collect primary RCVs of this variant only
                        if (ObservationNode.getAttribute('VariationID') === v_id && ObservationNode.getAttribute('ObservationType') === 'primary') {
                            let RCV_Nodes = ObservationNode.getElementsByTagName('RCV');
                            if (RCV_Nodes.length) {
                                for(let RCV_Node of RCV_Nodes) {
                                    RCVs.push(RCV_Node.textContent);
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
    const disease_types = ['Disease', 'NamedProteinVariant'];

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
                    for(let Trait of Traits) {
                        let nameNodes = [],
                            xRefNodes = [],
                            identifiers = [],
                            disease = '';
                        if (disease_types.includes(Trait.getAttribute('Type'))) {
                            nameNodes = Trait.getElementsByTagName('Name');
                            // Expect to find the only one <ElementValue> node in each <Name> node
                            for(let nameNode of nameNodes) {
                                let ElementValueNode = nameNode.getElementsByTagName('ElementValue')[0];
                                if (ElementValueNode.getAttribute('Type') === 'Preferred') {
                                    // Set disease name property value for each associated condition
                                    disease = ElementValueNode.textContent;
                                }
                            }
                            // Expect to find multiple <XRef> nodes in each <Trait> node
                            // Filter & find only the <XRef> nodes that are immediate children of <Trait> node
                            for (var i=0; i<Trait.childNodes.length; i++) {
                                if (Trait.childNodes[i].nodeName === 'XRef') {
                                    xRefNodes.push(Trait.childNodes[i]);
                                }
                            }
                            // Set identifiers property value for each associated condition
                            if (xRefNodes) {
                                for(let xRef of xRefNodes) {
                                    let identifier = {
                                        'db': xRef.getAttribute('DB'),
                                        'id': xRef.getAttribute('ID')
                                    };
                                    identifiers.push(identifier);
                                }
                            }
                        }
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
