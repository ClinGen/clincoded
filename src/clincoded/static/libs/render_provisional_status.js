'use strict';
import React from 'react';
import moment from 'moment';
import { sortListByDate } from './helpers/sort';
import { getQueryUrl } from "../components/globals";

/**
 * Method to render the provisional status of a given GDM's classification
 * @param {array} snapshots - List of snapshots associated with classification
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} gdm - The GDM object
 * @param {object} context - The global context object
 * @param {boolean} showLink - Whether to render link to view/approve provisional (gdm) or view provisional summary (interpretation)
 * @param {boolean} stringOnly - Whether return status text or status labels/tags (default returns labels/tags)
 * @param {boolean|null} isMyClassification - refer to `renderProvisionalLink()`
 * @param {string|null} affiliationId - refer to `renderProvisionalLink()`
 * @param {string|null} userId - refer to `renderProvisionalLink()`
 */
export function renderProvisionalStatus(snapshots, resourceType, gdm, context, showLink, stringOnly=false, isMyClassification=null, affiliationId=null, userId=null) {
    const sortedSnapshots = snapshots && snapshots.length ? sortListByDate(snapshots, 'date_created') : [];
    // Get any snapshots that had been provisioned
    const provisionedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Provisioned' && snapshot.resourceType === resourceType;
    });
    // Get any snapshots that had been approved
    const approvedSnapshots = sortedSnapshots.filter(snapshot => {
        return snapshot.approvalStatus === 'Approved' && snapshot.resourceType === resourceType;
    });
    let showProvisionalLink = false;
    if (resourceType === 'classification' && context && context.name === 'curation-central' && showLink) {
        showProvisionalLink = true;
    } else if (resourceType === 'interpretation' && showLink) {
        showProvisionalLink = true;
    }
    if (provisionedSnapshots && provisionedSnapshots.length && (!approvedSnapshots || (approvedSnapshots && !approvedSnapshots.length))) {
        if (stringOnly) {
            return 'Provisional';
        } else {
            return (
                <span className="status-wrapper provisional">
                    <span className="label label-info status-item" data-toggle="tooltip" data-placement="top"
                        data-tooltip={'Provisioned on ' + moment(provisionedSnapshots[0].date_created).format("YYYY MMM DD, h:mm a")}>
                        PROVISIONAL
                    </span>
                    {showProvisionalLink ? renderProvisionalLink(provisionedSnapshots[0], resourceType, gdm, isMyClassification, affiliationId, userId) : null}
                </span>
            );
        }
    } else {
        return null;
    }
}

/**
 * Method to render linkout to the evidence summary of a given approved classification or interpretation
 * @param {object} snapshot - The approved classification or interpretation snapshot
 * @param {string} resourceType - A string value of either 'classification' or 'interpretation'
 * @param {object} gdm - The GDM object
 * @param {boolean} isMyClassification - Whether or not the classification associated with the provisional status is own by the logged in user. If so, the provisional status link will direct user to `provisional-classification` page, which allows user to modify the status (approve/publish/unpublish...). Otherwise, will direct user to the read-only evidence summary page. This parameter only applies to classification (in GCI); in case of interpretation (in VCI), this value is left out as `null` and has no effect.
 * @param {string|null} affiliationId - only effective when @param isMyClassification is false. Used to display affiliation information in the evidence summary page.
 * @param {string|null} userId - only effective when @param isMyClassification is false. Used to display user information in the evidence summary page when the classification author doesn't belong to any affiliation.
 */
function renderProvisionalLink(snapshot, resourceType, gdm, isMyClassification=null, affiliationId=null, userId=null) {
    if (resourceType === 'classification') {
        let linkTarget = '_self';
        
        // generate href and title
        let provisionalLinkHref;
        let provisionalLinkTitle;
        if (isMyClassification === false) {
            // render as others classification's link to evidence summary (read-only)

            if (!snapshot) {
                throw "Must have snapshot when rendering others classification provisional link, but instead the snapshot is " + snapshot; 
            }

            // add additional params
            const params = [{ key: 'status', value: 'Provisional' }];
            if (affiliationId && affiliationId.length) {
                params.push({ key: 'affiliationId', value: affiliationId });
            } else if (userId && userId.length) {
                params.push({ key: 'userId', value: userId });
            }
            
            // get finalized url
            provisionalLinkHref = getQueryUrl(
                "/gene-disease-evidence-summary/", [
                    { key: 'snapshot', value: snapshot.uuid },
                    ...params
                ],
                false
            );
            provisionalLinkTitle = 'View Current Provisional';
            linkTarget = '_blank';
        } else {
            // default: generate link to classification page (page where user can modify status)
            provisionalLinkHref = getQueryUrl(
                "/provisional-classification/", [
                    { key: 'gdm', value: gdm.uuid },
                    { key: 'approval', value: 'yes' },
                ]
            );
            provisionalLinkTitle = 'View/Approve Current Provisional';
        }

        return (
            <span className="classification-link-item">
                <a target={linkTarget} href={provisionalLinkHref} title={provisionalLinkTitle}><i className="icon icon-link"></i></a>
            </span>
        );
    } else if (resourceType === 'interpretation') {
        return (
            <span className="classification-link-item">
                <a href={'/variant-interpretation-summary/?snapshot=' + snapshot.uuid} title="View Current Provisional" target="_blank"><i className="icon icon-link"></i></a>
            </span>
        );
    }
}
