'use strict';
var React = require('react');
var _ = require('underscore');
var moment = require('moment');
var globals = require('../globals');
var externalLinks = require('./interpretation/shared/externalLinks');

var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationRecordGeneDisease = module.exports.CurationRecordGeneDisease = React.createClass({

    propTypes: {
        data: React.PropTypes.object // ClinVar data payload
    },

    getDefaultProps: function() {
        return {
            recordHeader: 'Variant Genomic Context'
        };
    },

    setContextLinks: function(nc_hgvs, ref) {
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
    },

    render: function() {
        var variant = this.props.data;
        var recordHeader = this.props.recordHeader;
        var gRCh38 = null;
        var gRCh37 = null;
        var links_38 = null;
        var links_37 = null;

        if (variant && variant.hgvsNames) {
            // get GRCh38 and GRCh37 NC_ terms from local db
            gRCh38 =  variant.hgvsNames.GRCh38 ? variant.hgvsNames.GRCh38 : (variant.hgvsNames.gRCh38 ? variant.hgvsNames.gRCh38 : null);
            gRCh37 =  variant.hgvsNames.GRCh37 ? variant.hgvsNames.GRCh37 : (variant.hgvsNames.gRCh37 ? variant.hgvsNames.gRCh37 : null);

            // get Chromosome
            if (gRCh38 || gRCh37) {
                var hgvs_term = gRCh38 ? gRCh38 : gRCh37;
                chr = hgvs_term.substr(7, 2);
                if (chr.indexOf('0') === 0) {
                    chr = chr.substr(1, 1);
                } else if (chr === '23') {
                    chr = 'x';
                } else if (chr === '24') {
                    chr = 'y';
                }
            }

            // set start and stop points for +/- 60 bp length and generate links
            var start_38 = null;
            var end_38 = null;
            var start_37 = null;
            var end_37 = null;
            var re = /:[g].(\d+)\D/;
            if (gRCh38) {
                var point_38 = gRCh38.match(re)[1];
                start_38 = parseInt(point_38) - 30;
                end_38 = parseInt(point_38) + 30;
                ucsc_url_38 = external_url_map['UCSCGRCh38'] + chr + '%3A' + start_38.toString() + '-' + end_38.toString();
                viewer_url_38 = external_url_map['VariationViewerGRCh38'] + chr + '&assm=GCF_000001405.28&from=' + start_38.toString() + '&to=' + end_38.toString();
                ensembl_url_38 = external_url_map['EnsemblGRCh38'] + chr + ':' + start_38.toString() + '-' + end_38.toString();
            }
            if (gRCh37) {
                var point_37 = gRCh37.match(re)[1];
                start_37 = parseInt(point_37) - 30;
                end_37 = parseInt(point_37) + 30;
                ucsc_url_37 = external_url_map['UCSCGRCh37'] + chr + '%3A' + start_37.toString() + '-' + end_37.toString();
                viewer_url_37 = external_url_map['VariationViewerGRCh37'] + chr + '&assm=GCF_000001405.25&from=' + start_37.toString() + '&to=' + end_37.toString();
                ensembl_url_37 = external_url_map['EnsemblGRCh37'] + chr + ':' + start_37.toString() + '-' + end_37.toString();
            }
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-disease">
                    <h4>{recordHeader}</h4>
                    <dl className="inline-dl clearfix">
                        {(links_38 || links_37) ?
                            <dd>UCSC [
                                {links_38 ? <a href={links_38.ucsc_url_38} target="_blank" title={'UCSC Genome Browser for ' + gRCh38 + ' in a new window'}>GRCh38/hg38</a> : null }
                                {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                {links_37 ? <a href={links_37.ucsc_url_37} target="_blank" title={'UCSC Genome Browser for ' + gRCh37 + ' in a new window'}>GRCh37/hg19</a> : null }
                                ]
                            </dd>
                            :
                            null
                        }
                        {(links_38 || links_37) ?
                            <dd>Variation Viewer [
                                {links_38 ? <a href={links_38.viewer_url_38} target="_blank" title={'Variation Viewer page for ' + gRCh38 + ' in a new window'}>GRCh38</a> : null }
                                {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                {links_37 ? <a href={links_37.viewer_url_37} target="_blank" title={'Variation Viewer page for ' + gRCh37 + ' in a new window'}>GRCh37</a> : null }
                                ]
                            </dd>
                            :
                            null
                        }
                        {(links_38 || links_37) ?
                            <dd>Ensembl Browser [
                                {links_38 ? <a href={links_38.ensembl_url_38} target="_blank" title={'Ensembl Browser page for ' + gRCh38 + ' in a new window'}>GRCh38</a> : null }
                                {(links_38 && links_37) ? <span>&nbsp;|&nbsp;</span> : null }
                                {links_37 ? <a href={links_37.ensembl_url_37} target="_blank" title={'Ensembl Browser page for ' + gRCh37 + ' in a new window'}>GRCh37</a> : null }
                                ]
                            </dd>
                            :
                            null
                        }
                    </dl>
                </div>
            </div>
        );
    }
});
