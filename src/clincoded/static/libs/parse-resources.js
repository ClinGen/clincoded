'use strict';
import _ from 'underscore';

// Function for parsing ClinVar data for variant object creation
// Derived from:
// https://github.com/standard-analytics/pubmed-schema-org/blob/master/lib/pubmed.js
export function parseClinvar(xml, extended) {
    var variant = {};
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    var $ClinVarResult = doc.getElementsByTagName('ClinVarResult-Set')[0];
    if ($ClinVarResult) {
        var $VariationReport = $ClinVarResult.getElementsByTagName('VariationReport')[0];
        if ($VariationReport) {
            // Get the ID (just in case) and Preferred Title
            variant.clinvarVariantId = $VariationReport.getAttribute('VariationID');
            variant.clinvarVariantTitle = $VariationReport.getAttribute('VariationName');
            // FIXME: Need to handle 'Haplotype' variant which has multiple alleles
            // e.g. http://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=clinvar&rettype=variation&id=7901
            var $Allele = $VariationReport.getElementsByTagName('Allele')[0];
            if ($Allele) {
                // Parse <VariantType> node under <Allele>
                let $variationType = $Allele.getElementsByTagName('VariantType')[0];
                if ($variationType) {
                    variant.variationType = $variationType.textContent;
                }
                // Parse <Name> node under <OtherNameList>
                let $OtherNameListNode = $Allele.getElementsByTagName('OtherNameList')[0];
                let $OtherNameNodes = [];
                variant.otherNameList = [];
                if ($OtherNameListNode) {
                    $OtherNameNodes = $OtherNameListNode.getElementsByTagName('Name');
                    for (var k = 0; k < $OtherNameNodes.length; k++) {
                        variant.otherNameList.push($OtherNameNodes[k].textContent)
                    }
                }
                // Parse <MolecularConsequence> node under <MolecularConsequenceList>
                let $MolecularConsequenceListNode = $Allele.getElementsByTagName('MolecularConsequenceList')[0];
                let $MolecularConsequenceNodes = [];
                variant.molecularConsequenceList = [];
                if ($MolecularConsequenceListNode) {
                    $MolecularConsequenceNodes = $MolecularConsequenceListNode.getElementsByTagName('MolecularConsequence');
                    for (var i = 0; i < $MolecularConsequenceNodes.length; i++) {
                        let molecularItem = {
                            "hgvsName": $MolecularConsequenceNodes[i].getAttribute('HGVS'),
                            "term": $MolecularConsequenceNodes[i].getAttribute('Function'),
                            "soId": $MolecularConsequenceNodes[i].getAttribute('SOid')
                        };
                        variant.molecularConsequenceList.push(molecularItem);
                    }
                }
                var $HGVSlist_raw = $Allele.getElementsByTagName('HGVSlist')[0];
                if ($HGVSlist_raw) {
                    variant.hgvsNames = {};
                    variant.hgvsNames.others = [];
                    // get the HGVS entries
                    var $HGVSlist = $HGVSlist_raw.getElementsByTagName('HGVS');
                    _.map($HGVSlist, $HGVS => {
                        let temp_hgvs = $HGVS.textContent;
                        let assembly = $HGVS.getAttribute('Assembly');
                        if (assembly) {
                            variant.hgvsNames[assembly] = temp_hgvs;
                        } else {
                            variant.hgvsNames.others.push(temp_hgvs);
                        }
                    });
                }
                variant.dbSNPIds = [];
                var $XRefList = $Allele.getElementsByTagName('XRefList')[0];
                var $XRef = $XRefList.getElementsByTagName('XRef');
                for(var j = 0; j < $XRef.length; j++) {
                    if ($XRef[j].getAttribute('DB') === 'dbSNP') {
                        variant.dbSNPIds.push($XRef[j].getAttribute('ID'));
                    }
                }
                // Call to extract more ClinVar data from XML response
                if (extended) {
                    parseClinvarExtended(variant, $Allele, $HGVSlist_raw, $VariationReport, $MolecularConsequenceNodes);
                }
            }
        }
    }
    return variant;
}

// Function to extract more ClinVar data than what the db stores
function parseClinvarExtended(variant, allele, hgvs_list, dataset, molecularConsequenceNodes) {
    variant.RefSeqTranscripts = {};
    variant.gene = {};
    variant.allele = {};
    variant.allele.SequenceLocation = [];
    variant.allele.ProteinChange = '';
    // Group transcripts by RefSeq nucleotide change, molecular consequence, and protein change
    variant.RefSeqTranscripts.NucleotideChangeList = [];
    variant.RefSeqTranscripts.MolecularConsequenceList = [];
    variant.RefSeqTranscripts.ProteinChangeList = [];
    // Get the 'VariationType' attribute in <VariationReport> node
    // Not to be confused with the <VariantType> node under <Allele>
    variant.clinvarVariationType = dataset.getAttribute('VariationType');
    // Parse <MolecularConsequence> nodes
    if (molecularConsequenceNodes) {
        for (var i = 0; i < molecularConsequenceNodes.length; i++) {
            // Used for transcript tables on "Basic Information" tab in VCI
            // HGVS property for mapping to transcripts with matching HGVS names
            // SOid and Function properties for UI display
            var MolecularObj = {
                "HGVS": molecularConsequenceNodes[i].getAttribute('HGVS'),
                "SOid": molecularConsequenceNodes[i].getAttribute('SOid'),
                "Function": molecularConsequenceNodes[i].getAttribute('Function')
            };
            variant.RefSeqTranscripts.MolecularConsequenceList.push(MolecularObj);
        }
    }
    // Parse <HGVS> nodes
    if (hgvs_list) {
        var HGVSnodes = hgvs_list.getElementsByTagName('HGVS');
        if (HGVSnodes) {
            for (var j = 0; j < HGVSnodes.length; j++) {
                // Used for transcript tables on "Basic Information" tab in VCI
                // Type property for identifying the nucleotide change transcripts
                // and protein change transcripts
                var hgvsObj = {
                    "HGVS": HGVSnodes[j].textContent,
                    "Change": HGVSnodes[j].getAttribute('Change'),
                    "AccessionVersion": HGVSnodes[j].getAttribute('AccessionVersion'),
                    "Type": HGVSnodes[j].getAttribute('Type')
                };
                // nucleotide change
                if (HGVSnodes[j].getAttribute('Type') === 'HGVS, coding, RefSeq') {
                    variant.RefSeqTranscripts.NucleotideChangeList.push(hgvsObj);
                }
                // protein change
                if (HGVSnodes[j].getAttribute('Type') === 'HGVS, protein, RefSeq') {
                    variant.RefSeqTranscripts.ProteinChangeList.push(hgvsObj);
                }
            }
        }
    }
    // Parse <gene> node
    var geneList = dataset.getElementsByTagName('GeneList')[0];
    if (geneList) {
        var geneNode = geneList.getElementsByTagName('Gene')[0];
        if (geneNode) {
            variant.gene.id = geneNode.getAttribute('GeneID');
            variant.gene.symbol = geneNode.getAttribute('Symbol');
            variant.gene.full_name = geneNode.getAttribute('FullName');
            variant.gene.hgnc_id = geneNode.getAttribute('HGNCID');
        }
    }

    // Evaluate whether a variant has protein change
    // First check whether te <ProteinChange> node exists. If not,
    // then check whether the <HGVS> node with Type="HGVS, protein, RefSeq" attribute exists
    const protein_change = allele.getElementsByTagName('ProteinChange')[0];
    let alt_protein_change;
    if (variant.RefSeqTranscripts.ProteinChangeList.length > 0) {
        const changeAttr = variant.RefSeqTranscripts.ProteinChangeList[0].Change;
        if (changeAttr.length) {
            // Remove 'p.' from string value
            let posStart = changeAttr.indexOf('.') + 1;
            let newAttrValue = changeAttr.slice(posStart);
            // Extract the numbers into a new string
            let num = newAttrValue.match(/[0-9]+(?!.*[0-9])/);
            // Separate groups of letters into arrays
            let stringArray = newAttrValue.split(/[0-9]+(?!.*[0-9])/);
            // Transform string into the format similar to common <ProteinChange> value
            alt_protein_change = stringArray[0] + num + stringArray[1].substr(0, 1);
        }
    }
    // Set protein change property value
    if (protein_change) {
        variant.allele.ProteinChange = protein_change.textContent;
    } else if (alt_protein_change) {
        variant.allele.ProteinChange = alt_protein_change;
    } else {
        variant.allele.ProteinChange = null;
    }
    // Parse <SequenceLocation> nodes
    var SequenceLocationNodes = allele.getElementsByTagName('SequenceLocation');
    if (SequenceLocationNodes) {
        for(var k = 0; k < SequenceLocationNodes.length; k++) {
            // Properties in SequenceLocationObj are used to construct LinkOut URLs
            // Used primarily for LinkOut links on "Basic Information" tab in VCI
            // referenceAllele and alternateAllele properties are added for Population tab
            var SequenceLocationObj = {
                "Assembly": SequenceLocationNodes[k].getAttribute('Assembly'),
                "AssemblyAccessionVersion": SequenceLocationNodes[k].getAttribute('AssemblyAccessionVersion'),
                "AssemblyStatus": SequenceLocationNodes[k].getAttribute('AssemblyStatus'),
                "Chr": SequenceLocationNodes[k].getAttribute('Chr'),
                "Accession": SequenceLocationNodes[k].getAttribute('Accession'),
                "start": SequenceLocationNodes[k].getAttribute('start'),
                "stop": SequenceLocationNodes[k].getAttribute('stop'),
                "referenceAllele": SequenceLocationNodes[k].getAttribute('referenceAllele'),
                "alternateAllele": SequenceLocationNodes[k].getAttribute('alternateAllele')
            };
            variant.allele.SequenceLocation.push(SequenceLocationObj);
        }
    }
}

// Function for parsing CAR data for variant object creation
export function parseCAR(json) {
    var variant = {};
    // set carId in payload, since we'll always have this from a CAR response
    variant.carId = json['@id'].substring(json['@id'].indexOf('CA'));
    if (json.externalRecords) {
        // extract ClinVar data if available
        if (json.externalRecords.ClinVarVariations && json.externalRecords.ClinVarVariations.length > 0) {
            // only need the ClinVar Variation data, since we'll re-ping ClinVar with it, if available
            variant.clinvarVariantId = json.externalRecords.ClinVarVariations[0].variationId;
        }
        // extract dbSNPId data if available
        if (json.externalRecords.dbSNP && json.externalRecords.dbSNP.length > 0) {
            variant.dbSNPIds = [];
            json.externalRecords.dbSNP.map(function(dbSNPentry, i) {
                variant.dbSNPIds.push(dbSNPentry.rs.toString());
            });
        }
    }
    variant.hgvsNames = {};
    if (json.genomicAlleles && json.genomicAlleles.length > 0) {
        json.genomicAlleles.map(function(genomicAllele, i) {
            if (genomicAllele.hgvs && genomicAllele.hgvs.length > 0) {
                // extract the genomicAlleles hgvs terms
                genomicAllele.hgvs.map(function(hgvs_temp, j) {
                    // skip the hgvs term if it starts with 'CM'
                    if (!hgvs_temp.startsWith('CM')) {
                        // if NC, file by referenceGenome
                        if (hgvs_temp.startsWith('NC')) {
                            if (genomicAllele.referenceGenome) {
                                variant.hgvsNames[genomicAllele.referenceGenome] = hgvs_temp;
                            } else {
                                variant = parseCarHgvsHandler(hgvs_temp, variant);
                            }
                        } else {
                            variant = parseCarHgvsHandler(hgvs_temp, variant);
                        }
                    }
                });
            }
        });
    }
    // extract the aminoAcidAlleles hgvs terms
    if (json.aminoAcidAlleles && json.aminoAcidAlleles.length > 0) {
        variant = parseCarHgvsLoop(json.aminoAcidAlleles, variant);
    }
    // extract the transcriptAlleles hgvs terms
    if (json.transcriptAlleles && json.transcriptAlleles.length > 0) {
        variant = parseCarHgvsLoop(json.transcriptAlleles, variant);
    }
    return variant;
}

// helper function for the parseCar() function; loops through some of the CAR's repeating
// data structures to find HGVS terms and add them to the variant object
function parseCarHgvsLoop(alleles, variant) {
    variant['tempAlleles'] = [];
    alleles.map(function(allele, i) {
        if (allele.hgvs && allele.hgvs.length > 0) {
            allele.hgvs.map(function(hgvs_temp, j) {
                variant = parseCarHgvsHandler(hgvs_temp, variant);
            });
        }
        // Collect all the allele objects containing 'geneSymbol'
        // and put them in a temp array for canonical transcript matching
        // (if match found, the gene is selected for constructing the canonical transcript title)
        if (allele.geneSymbol) {
            let temp_allele_obj = {
                geneSymbol: allele.geneSymbol,
                hgvs: allele.hgvs,
                proteinEffect: allele.proteinEffect
            };
            variant['tempAlleles'].push(temp_allele_obj);
        }
    });
    // Evaluate whether there are overlapping genes in the variant
    // If so, we won't try constructing the canonical transcript title.
    // Instead, we just show the GRCh38 HGVS representation for the variant title.
    // Hence, delete the variant['tempAlleles'] as it is no longer useful.
    let genes = []; // For keeping track of overlapping genes
    variant['tempAlleles'].forEach(item => {
        let match = genes.find(gene => gene === item.geneSymbol);
        if (!match) genes.push(item.geneSymbol);
    });
    if (genes.length > 1) delete variant['tempAlleles'];
    return variant;
}

// helper function for the parseCar() function: checks to see if the variant object's hgvsNames'
// others variable is set, creates it if not, and adds an HGVS term to it
function parseCarHgvsHandler(hgvs_temp, variant) {
    if (!variant.hgvsNames.others) {
        variant.hgvsNames.others = [];
    }
    variant.hgvsNames.others.push(hgvs_temp);
    return variant;
}
