// # ClinVar Interpretations Helper: Getter Method
// # Parameters: XML data or response object
// # Usage: getClinvarInterpretations(xml)
// # Dependency: ClinVar API response

'use strict';
import { _ } from 'underscore';
import { globals } '../../globals';

export function getClinvarInterpretations(xml) {
    let interpretations = [];
    // Make sure we have at least one RCV node to work with
    // Then put each RCV id into an array
    let RCVs = [];
    let xmlDoc = new DOMParser().parseFromString(xml, 'text/xml');
    let ClinVarResult = xmlDoc.getElementsByTagName('ClinVarResult-Set')[0];
    if (ClinVarResult) {
        let VariationReport = ClinVarResult.getElementsByTagName('VariationReport')[0];
        if (VariationReport) {
            let ObservationList = VariationReport.getElementsByTagName('ObservationList')[0];
            if (ObservationList) {
                let ObservationNode = ObservationList.getElementsByTagName('Observation')[0];
                if (ObservationNode) {
                    let RCV_Nodes = ObservationNode.getElementsByTagName('RCV');
                    if (RCV_Nodes.length) {
                        RCV_Nodes.forEach(RCV => {
                            RCVs.push(RCV.textContent);
                        });
                    }
                }
            }
        }
    }
    // If RCVs is not an empty array,
    // parse associated disease and clinical significance for each id
    if (RCVs.length) {
        parseRCV(RCVs, interpretations);
    }

    return interpretations;
}

// Method to parse XML data for the most recent version of an RCV accession
function parseRCV(RCVs, interpretations) {
    let interpretation = {
        'RCV': '',
        'clinicalSignificance': '',
        'conditions': []
    };
    let condition = {
        'name': '',
        'identifiers': []
    };
    let identifier = {
        'db': '',
        'id': ''
    };
    RCVs.forEach(RCV => {
        this.getRestDataXml(this.props.href_url.protocol + external_url_map['ClinVarEfetch'] + '&rettype=clinvarset&id=' + RCV).then(result => {
            // Passing 'true' option to invoke 'mixin' function
            let resultSet = new DOMParser().parseFromString(result, 'text/xml');
            let ClinVarResultSet = resultSet.getElementsByTagName('ClinVarResult-Set')[0];
            if (ClinVarResultSet) {
                let ClinVarSet = ClinVarResultSet.getElementsByTagName('ClinVarSet')[0];
                if (ClinVarSet) {
                    let ReferenceClinVarAssertion = ClinVarSet.getElementsByTagName('ReferenceClinVarAssertion')[0];
                    if (ReferenceClinVarAssertion) {
                        // Get clinical significance description
                        let ClinicalSignificance = ReferenceClinVarAssertion.getElementsByTagName('ClinicalSignificance')[0];
                        if (ClinicalSignificance) {
                            let Description = ClinicalSignificance.getElementsByTagName('Description')[0];
                            interpretation['RCV'] = RCV;
                            interpretation['clinicalSignificance'] = Description.textContent;
                        }
                        // Get conditions/disease
                        let TraitSet = ReferenceClinVarAssertion.getElementsByTagName('TraitSet')[0];
                        if (TraitSet) {
                            let Traits = TraitSet.getElementsByTagName('Trait');
                            let nameNodes = [];
                            Traits.forEach(Trait => {
                                if (Trait.getAttribute('Type') === 'Disease') {
                                    nameNodes = Trait.getElementsByTagName('Name');
                                    let nameNode = nameNodes.find((n) => n.getElementsByTagName('ElementValue')[0].getAttribute('Type') === 'Preferred');
                                }
                            });
                            nameNodes.forEach(node => {
                                let ElementValue = node.getElementsByTagName('ElementValue')[0];
                                if (ElementValue.getAttribute('Type') === 'Preferred') {
                                    nameNodes = Trait.getElementsByTagName('Name');
                                }
                            })
                        }
                    }
                }
            }

        }).catch(function(e) {
            console.log('ClinVarEfetch for RCV Error=: %o', e);
        });
    });
    
}