// # HGVS Notation Helper: Getter Method
// # Parameters: variant object, assembly (GRCh37 or GRCh38), optional boolean value
// # Usage: getHgvsNotation(variant, 'GRCh38', true)

'use strict';
var genomic_chr_mapping = require('../interpretation/mapping/NC_genomic_chr_format.json');

export function getHgvsNotation(variant, assembly, omitChrString) {
    let hgvs,
        genomicHGVS,
        ncGenomic,
        match;

    if (assembly === 'GRCh37' && variant.hgvsNames.GRCh37) {
        genomicHGVS = variant.hgvsNames.GRCh37;
    } else if (assembly === 'GRCh38' && variant.hgvsNames.GRCh38) {
        genomicHGVS = variant.hgvsNames.GRCh38;
    }

    // Extract the NC genomic substring from the HGVS name whose assembly is
    // either GRCh37 or GRCh38. By looking up the genomic-to-chromosome mappings,
    // it formats the HGVS notation either as 'chr3:g.70970756G>A' or '3:g.70970756G>A',
    // depending on whether the 'omitChrString' optional argument is set to true.
    if (genomicHGVS) {
        ncGenomic = genomicHGVS.substr(0, genomicHGVS.indexOf(':'));
        match = genomic_chr_mapping[assembly].find((entry) => entry.GenomicRefSeq === ncGenomic);
    }

    // The 'chr3:g.70970756G>A' format is for myvariant.info that uses GRCh37 assembly.
    // The '3:g.70970756G>A' format is for Ensembl VEP that uses GRCh38 assembly. Due to the
    // presence of 'chrX' and 'chrY' chromosome, substr method is used instead of filtering
    // alpha letters.
    if (match) {
        if (omitChrString) {
            let chromosome = match.ChrFormat.substr(3);
            hgvs = chromosome + genomicHGVS.slice(genomicHGVS.indexOf(':'));
        } else {
            hgvs = match.ChrFormat + genomicHGVS.slice(genomicHGVS.indexOf(':'));
        }
    }

    /**
     * Handle 'deletion' genomic GRCh38 HGVS
     * The ensembl vep/human rest api only accepts the identifier up to the 'del' marker
     * in the hgvs string, such as in 'chr7:g.117120152_117120270del119ins299'
     */
    if (hgvs && hgvs.indexOf('del') > 0 && assembly === 'GRCh38') {
        hgvs = hgvs.substring(0, hgvs.indexOf('del') + 3);
    }

    return hgvs;
}
