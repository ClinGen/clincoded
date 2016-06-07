'use strict';
var _ = require('underscore');

// Function for parsing ClinVar data for variant object creation
// Derived from:
// https://github.com/standard-analytics/pubmed-schema-org/blob/master/lib/pubmed.js
module.exports.parseClinvar = parseClinvar;
function parseClinvar(xml, mixin){
    var variant = {};
    var doc = new DOMParser().parseFromString(xml, 'text/xml');

    var $ClinVarResult = doc.getElementsByTagName('ClinVarResult-Set')[0];
    if ($ClinVarResult) {
        var $VariationReport = $ClinVarResult.getElementsByTagName('VariationReport')[0];
        if ($VariationReport) {
            // Get the ID (just in case) and Preferred Title
            variant.clinvarVariantId = $VariationReport.getAttribute('VariationID');
            variant.clinvarVariantTitle = $VariationReport.getAttribute('VariationName');
            var $Allele = $VariationReport.getElementsByTagName('Allele')[0];
            if ($Allele) {
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
                for(var i = 0; i < $XRef.length; i++) {
                    if ($XRef[i].getAttribute('DB') === 'dbSNP') {
                        variant.dbSNPIds.push($XRef[i].getAttribute('ID'));
                    }
                }
                // Call to extract more ClinVar data from XML response
                if (mixin) {
                    parseClinvarMixin(variant, $Allele, $HGVSlist_raw, $VariationReport);
                }
            }
        }
    }
    return variant;
}

// Function to extract more ClinVar data than what the db stores
function parseClinvarMixin(variant, allele, hgvs_list, dataset) {
    variant.RefSeqTranscripts = {};
    variant.gene = {};
    variant.allele = {};
    variant.allele.SequenceLocation = [];
    // Group transcripts by RefSeq nucleotide change, molecular consequence, and protein change
    variant.RefSeqTranscripts.NucleotideChangeList = [];
    variant.RefSeqTranscripts.MolecularConsequenceList = [];
    variant.RefSeqTranscripts.ProteinChangeList = [];
    // Parse <MolecularConsequence> nodes
    var MolecularConsequenceList = allele.getElementsByTagName('MolecularConsequenceList')[0];
    var MolecularConsequence = MolecularConsequenceList.getElementsByTagName('MolecularConsequence');
    for(let n of MolecularConsequence) {
        var MolecularObj = {
            "HGVS": n.getAttribute('HGVS'),
            "SOid": n.getAttribute('SOid'),
            "Function": n.getAttribute('Function')
        };
        variant.RefSeqTranscripts.MolecularConsequenceList.push(MolecularObj);
    }
    // Parse <HGVS> nodes
    var HGVSnodes = hgvs_list.getElementsByTagName('HGVS');
    for (let x of HGVSnodes) {
        var hgvsObj = {
            "HGVS": x.textContent,
            "Change": x.getAttribute('Change'),
            "AccessionVersion": x.getAttribute('AccessionVersion'),
            "Type": x.getAttribute('Type')
        };
        // nucleotide change
        if (x.getAttribute('Type') === 'HGVS, coding, RefSeq') {
            variant.RefSeqTranscripts.NucleotideChangeList.push(hgvsObj);
        }
        // protein change
        if (x.getAttribute('Type') === 'HGVS, protein, RefSeq') {
            variant.RefSeqTranscripts.ProteinChangeList.push(hgvsObj);
        }
    }
    // Parse <gene> node
    var geneList = dataset.getElementsByTagName('GeneList')[0];
    var geneNode = geneList.getElementsByTagName('Gene')[0];
    variant.gene.symbol = geneNode.getAttribute('Symbol');
    variant.gene.full_name = geneNode.getAttribute('FullName');
    // Parse <SequenceLocation> nodes
    var SequenceLocationNodes = allele.getElementsByTagName('SequenceLocation');
    for(let y of SequenceLocationNodes) {
        var SequenceLocationObj = {
            "Assembly": y.getAttribute('Assembly'),
            "AssemblyAccessionVersion": y.getAttribute('AssemblyAccessionVersion'),
            "AssemblyStatus": y.getAttribute('AssemblyStatus'),
            "Chr": y.getAttribute('Chr'),
            "Accession": y.getAttribute('Accession'),
            "start": y.getAttribute('start'),
            "stop": y.getAttribute('stop')
        };
        variant.allele.SequenceLocation.push(SequenceLocationObj);
    }
}

// Function for parsing CAR data for variant object creation
module.exports.parseCAR = parseCAR;
function parseCAR(json) {
    var variant = {};
    // set carId in payload, since we'll always have this from a CAR response
    variant.carId = json['@id'].substring(json['@id'].indexOf('CA'));
    if (json.externalRecords) {
        // extract ClinVar data if available
        if (json.externalRecords.ClinVar && json.externalRecords.ClinVar.length > 0) {
            // we only need to look at the first entry since the variantionID and preferred name
            // should be the same for all of them
            variant.clinvarVariantId = json.externalRecords.ClinVar[0].variationId;
            variant.clinvarVariantTitle = json.externalRecords.ClinVar[0].preferredName;
        }
        // extract dbSNPId data if available
        if (json.externalRecords.dbSNP && json.externalRecords.dbSNP.length > 0) {
            variant.dbSNPIds = [];
            json.externalRecords.dbSNP.map(function(dbSNPentry, i) {
                variant.dbSNPIds.push(dbSNPentry.rs);
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
                        // FIXME/TODO: cannot easily get reference genome for NCs from CAR.
                        // Dump everything into the 'others' field for now.
                        /*
                        if (hgvs_temp.startsWith('NC')) {
                            if (genomicAllele.referenceSequence.endsWith('RS000065')) {
                                variant.hgvsNames.GRCh38 = hgvs_temp;
                            } else if (genomicAllele.referenceSequence.endsWith('RS000041')) {
                                variant.hgvsNames.GRCh37 = hgvs_temp;
                            } else {
                                variant = parseCarHgvsHandler(hgvs_temp, variant);
                            }
                        } else {
                            variant = parseCarHgvsHandler(hgvs_temp, variant);
                        }
                        */
                        variant = parseCarHgvsHandler(hgvs_temp, variant);
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
    alleles.map(function(allele, i) {
        if (allele.hgvs && allele.hgvs.length > 0) {
            allele.hgvs.map(function(hgvs_temp, j) {
                variant = parseCarHgvsHandler(hgvs_temp, variant);
            });
        }
    });
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
