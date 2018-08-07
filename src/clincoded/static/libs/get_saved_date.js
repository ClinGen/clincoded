'use strict';

/**
 * Function to retrieve a classification's saved date, based on an order of preference:
 * 1) Provisional object's "classificationDate" property
 *    When present (introduced with version 7 of the provisionalClassification schema), this property should have a
 *    timestamp of when the classification was last saved.
 * 2) Provisional object's "provisionalDate" or "last_modified" property
 *    If "classificationDate" isn't available, return the property that will most closely match the timestamp of when
 *    the classification was last saved. When the provisional object's status is "Provisional" or "Approved", that
 *    property is "provisionalDate"; otherwise, it's "last_modified" (status is likely "In progress").
 * @param {object} provisional - The provisional object
 */
export function getClassificationSavedDate(provisional) {
    if (provisional.classificationDate) {
        return provisional.classificationDate;
    } else if ((provisional.classificationStatus === 'Provisional' || provisional.classificationStatus === 'Approved') && provisional.provisionalDate) {
        return provisional.provisionalDate;
    } else {
        return provisional.last_modified;
    }
}
