'use strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { external_url_map } from '../globals';

// Display the curator data of the curation data
class CurationRecordVariant extends Component {
    render() {
        const { data } = this.props;
        let clinVarId, carId, dbSNPId;

        if (data) {
            clinVarId = (data.clinvarVariantId) ? data.clinvarVariantId : null;
            carId = (data.carId) ? data.carId : null;
            dbSNPId = (data.dbSNPIds.length) ? data.dbSNPIds[0] : null;
            if (dbSNPId && dbSNPId.indexOf('rs') < 0) {
                dbSNPId = 'rs' + dbSNPId;
            }
        }

        return (
            <div className="col-xs-12 col-sm-3 gutter-exc">
                <div className="curation-data-gene">
                    <h4>Variant ID Sources</h4>
                    {clinVarId || carId ?
                        <dl className="inline-dl clearfix">
                            {clinVarId ?
                                <dd>ClinVar VariationID:&nbsp;<a href={external_url_map['ClinVarSearch'] + clinVarId} target="_blank" title={'ClinVar page for ' + clinVarId + ' in a new window'}>{clinVarId}</a></dd>
                                : null}
                            {carId ?
                                <dd>ClinGen Allele Registry ID:&nbsp;<a href={'http://reg.genome.network/allele/' + carId + '.html'} target="_blank" title={'GlinGen Allele Registry page for ' + carId + ' in a new window'}>{carId}</a></dd>
                                : null}
                            {carId ?
                                <dd>CIViC:&nbsp;<a href={external_url_map['CIViC'] + carId} target="_blank" title={'CIViC for ' + carId + ' in a new window'}>{carId}</a></dd>
                                : null}
                            {dbSNPId ?
                                <dd>dbSNP ID:&nbsp;<a href={'https://www.ncbi.nlm.nih.gov/projects/SNP/snp_ref.cgi?rs=' + dbSNPId.replace('rs', '')} target="_blank" title={'dbSNP page for ' + dbSNPId + ' in a new window'}>{dbSNPId}</a></dd>
                                : null}
                        </dl>
                        : null}
                </div>
            </div>
        );
    }
}

CurationRecordVariant.propTypes = {
    data: PropTypes.object, // Variant data
}

export default CurationRecordVariant;