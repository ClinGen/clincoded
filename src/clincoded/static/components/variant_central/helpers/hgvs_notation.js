// # HGVS Notation Helper: Getter Method
// # Parameters: variant object, assembly (GRCh37 or GRCh38), optional boolean value
// # Usage: getHgvsNotation(variant, 'GRCh38', true)
//
// This method extracts the genomic substring from HGVS name whose assembly is
// either GRCh37 or GRCh38. By looking up the genomic-to-chromosome mappings,
// it formats the HGVS notation either as 'chr3:g.70970756G>A' or '3:g.70970756G>A',
// depending on whether the 'chr' optional argument is set to true.
//
// The 'chr3:g.70970756G>A' format is for myvariant.info that uses GRCh37 assembly.
// The '3:g.70970756G>A' format is for Ensembl VEP that uses GRCh38 assembly. Due to the
// presence of 'chrX' and 'chrY' chromosome, substr method is used instead of filtering
// alpha letters.

'use strict';
var genomic_chr_mapping = require('./interpretation/mapping/NC_genomic_chr_format.json');

const getHgvsNotation = function (variant, assembly, omitChrString) {
    let hgvs;
    let nc;
    let ncGenomic;
    let match;

    if (assembly === 'GRCh37' && variant.hgvsNames.GRCh37) {
        nc = variant.hgvsNames.GRCh37;
    } else if (assembly === 'GRCh38' && variant.hgvsNames.GRCh38) {
        nc = variant.hgvsNames.GRCh38;
    }

    ncGenomic = nc.substr(0, nc.indexOf(':'));
    match = genomic_chr_mapping[assembly].find((entry) => entry.GenomicRefSeq === ncGenomic);

    if (match) {
        if (omitChrString) {
            let chromosome = match.ChrFormat.substr(3);
            hgvs = chromosome + nc.slice(nc.indexOf(':'));
        } else {
            hgvs = match.ChrFormat + nc.slice(nc.indexOf(':'));
        }
    }

    if (hgvs && hgvs.indexOf('del') > 0) {
        hgvs = hgvs.substring(0, hgvs.indexOf('del') + 3);
    }

    return hgvs;
};

module.exports = getHgvsNotation;