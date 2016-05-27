'use strict';
var React = require('react');
var globals = require('../globals');
var modal = require('../../libs/bootstrap/modal');

var Modal = modal.Modal;
var ModalMixin = modal.ModalMixin;
var external_url_map = globals.external_url_map;

// Display the curator data of the curation data
var CurationRecordVariant = module.exports.CurationRecordVariant = React.createClass({
    mixins: [ModalMixin],

    propTypes: {
        data: React.PropTypes.object, // ClinVar data payload
        interpretationTranscript: React.PropTypes.string,
        updateInterpretationTranscript: React.PropTypes.func
    },

    getDefaultProps: function() {
        return {
            recordHeader: 'Variant ID Sources'
        };
    },

    render: function() {
        var variant = this.props.data;
        var recordHeader = this.props.recordHeader;
        if (variant) {
            var clinVarId = (variant.clinvarVariantId) ? variant.clinvarVariantId : 'Unknown';
            var carId = (variant.carId) ? variant.carId : 'Unknown';
            var dbSNPId = (variant.dbSNPIds.length) ? variant.dbSNPIds[0] : 'Unknown';
        }
        var addEdit = this.props.interpretationTranscript ? 'Edit' : 'Add';

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-gene">
                    <h4>{recordHeader}</h4>
                    {variant ?
                        <dl className="inline-dl clearfix">
                            <dd><a href={external_url_map['ClinVar'] + clinVarId} target="_blank" title={'ClinVar page for ' + clinVarId + ' in a new window'}>ClinVar</a></dd>
                            <dd><a href={'http://reg.genome.network/allele/' + carId + '.html'} target="_blank" title={'GlinGen Allele Registry page for ' + carId + ' in a new window'}>ClinGen Allele Registry</a></dd>
                            <dd><a href={external_url_map['dbSNP'] + dbSNPId.slice(2)} target="_blank" title={'dbSNP page for ' + dbSNPId + ' in a new window'}>dbSNP</a></dd>
                        </dl>
                    : null}
                </div>
            </div>
        );
    }
});
