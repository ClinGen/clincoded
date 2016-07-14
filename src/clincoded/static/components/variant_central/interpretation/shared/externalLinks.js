'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../../../globals');

var external_url_map = globals.external_url_map;

module.exports.setContextLinks = function(nc_hgvs, ref) {
    // get Chromosome
    var chr = nc_hgvs.substr(7, 2);
    if (chr.indexOf('0') === 0) {
        chr = chr.substr(1, 1);
    } else if (chr === '23') {
        chr = 'x';
    } else if (chr === '24') {
        chr = 'y';
    }

    // set start and stop points for +/- 30 bp length centered at variation point
    var start = null;
    var end = null;
    var re = /:[g].(\d+)\D/;
    var point = nc_hgvs.match(re)[1];
    start = (parseInt(point) - 30).toString();
    end = (parseInt(point) + 30).toString();

    // set links and return
    if (ref === 'GRCh38') {
        return {
            ucsc_url_38: external_url_map['UCSCGRCh38'] + chr + '%3A' + start + '-' + end,
            viewer_url_38: external_url_map['VariationViewerGRCh38'] + chr + '&assm=GCF_000001405.28&from=' + start + '&to=' + end,
            ensembl_url_38: external_url_map['EnsemblGRCh38'] + chr + ':' + start + '-' + end
        };
    } else if (ref === 'GRCh37') {
        return {
            ucsc_url_37: external_url_map['UCSCGRCh37'] + chr + '%3A' + start + '-' + end,
            viewer_url_37: external_url_map['VariationViewerGRCh37'] + chr + '&assm=GCF_000001405.25&from=' + start + '&to=' + end,
            ensembl_url_37: external_url_map['EnsemblGRCh37'] + chr + ':' + start + '-' + end
        };
    }
};
