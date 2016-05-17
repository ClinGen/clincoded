'use strict';
// Derived from:
// https://github.com/standard-analytics/pubmed-schema-org/blob/master/lib/pubmed.js
var _ = require('underscore');
var moment = require('moment');

module.exports.parseClinvar = parseClinvar;

function parseClinvar(xml){
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
            }
        }
    }
    return variant;
}

module.exports.parseCAR = parseCAR;

function parseCAR(json) {
    var data = {};
    // set carId in payload, since we'll always have this from a CAR response
    data.carId = json['@id'].substring(json['@id'].indexOf('CA'));
    if (json.externalRecords) {
        // extract ClinVar data if available
        if (json.externalRecords.ClinVar && json.externalRecords.ClinVar.length > 0) {
            // we only need to look at the first entry since the variantionID and preferred name
            // should be the same for all of them
            data.clinvarVariantId = json.externalRecords.ClinVar[0].variationId;
            data.clinvarVariantTitle = json.externalRecords.ClinVar[0].preferredName;
        }
        // extract dbSNPId data if available
        if (json.externalRecords.dbSNP && json.externalRecords.dbSNP.length > 0) {
            data.dbSNPIds = [];
            json.externalRecords.dbSNP.map(function(dbSNPentry, i) {
                data.dbSNPIds.push(dbSNPentry.rs);
            });
        }
    }
    var temp_nc_hgvs = {};
    var temp_other_hgvs = [];
    if (json.genomicAlleles && json.genomicAlleles.length > 0) {
        json.genomicAlleles.map(function(genomicAllele, i) {
            if (genomicAllele.hgvs && genomicAllele.hgvs.length > 0) {
                // extract the genomicAlleles hgvs terms
                genomicAllele.hgvs.map(function(hgvs_temp, j) {
                    // skip the hgvs term if it starts with 'CM'
                    if (!hgvs_temp.startsWith('CM')) {
                        // temp work-around; cannot easily get reference genome for NCs
                        // dump everything as 'other' hgvs term for now...
                        /*
                        if (hgvs_temp.startsWith('NC')) {
                            // special handling for 'NC' hgvs terms
                            temp_nc_hgvs[genomicAllele.referenceSequence] = hgvs_temp;
                        } else {
                            temp_other_hgvs.push(hgvs_temp);
                        }*/
                        temp_other_hgvs.push(hgvs_temp);
                    }
                });
            }
        });
    }
    // extract the aminoAcidAlleles hgvs terms
    if (json.aminoAcidAlleles && json.aminoAcidAlleles.length > 0) {
        json.aminoAcidAlleles.map(function(allele, i) {
            if (allele.hgvs && allele.hgvs.length > 0) {
                allele.hgvs.map(function(hgvs_temp, j) {
                    temp_other_hgvs.push(hgvs_temp);
                });
            }
        });
    }
    // extract the transcriptAlleles hgvs terms
    if (json.transcriptAlleles && json.transcriptAlleles.length > 0) {
        json.transcriptAlleles.map(function(allele, i) {
            if (allele.hgvs && allele.hgvs.length > 0) {
                allele.hgvs.map(function(hgvs_temp, j) {
                    temp_other_hgvs.push(hgvs_temp);
                });
            }
        });
    }

    // this bit will have to change once we actually get assembly info from the CAR
    // so that the proper key:value pairs are created for hgvs terms
    var temp_hgvs = {};
    if (temp_other_hgvs.length > 0) {
        temp_hgvs.others = temp_other_hgvs;
    }
    if (temp_hgvs != {}) {
        data.hgvsNames = temp_hgvs;
    }

    return data;
}
