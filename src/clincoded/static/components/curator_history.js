'use strict';

// The curator history records operations performed by the currently logged-in curator on the database.
// It consists mainly of three objects and a description:
// 
// * Primary Object: The object that represents the operation even though other objects might
//   also need updating, e.g. When adding a group, the group is primary, and the modified
//   GDM is secondary. Think of this as the subject of a sentence describing the operation.
//
// * Secondary Object: The object that gets affected by the primary object's operation,
//   e.g. the GDM when a group gets added. Think of this as the object of a sentence describing
//   the operation.
//
// * Assocated Object: Any other object related to the operation, e.g. the selected PubMed
//   article when adding a Group to a GDM. Think of this as the indirect object of a sentence
//   describing the operation.
//
// * Description: String that gets displayed when displaying a history item. It includes embedded
//   codes so that object identifiers can be placed into the string as well as links to their
//   objects.

module.exports = {
    // Record an operation on the ClinGen database performed by the curator. The operation to record
    // gets passed in the "operation" object which must contain the optional properties:
    // {
    //     primaryUri: URI of the primary object
    //     secondaryUri: URI of the secondary object
    //     associatedUri: URI of the associated object
    //     description: Human-readable description of the operation, with embedded codes
    // }
    recordOperation: function(operationType, operationMeta) {
        var historyItem = {
            operationType: operationType,
        };

        // Copy the URIs into the curator history object
        if (operationMeta.primaryUri) {
            historyItem.primaryHref = operationMeta.primaryUri;
        }
        if (operationMeta.secondaryUri) {
            historyItem.secondaryHref = operationMeta.secondaryUri;
        }
        if (operationMeta.associatedUri) {
            historyItem.associatedHref = operationMeta.associatedUri;
        }

        this.postRestData('/histories/', historyItem);
        return true;
    }
};
