'use strict';
var React = require('react');

// Recursive function to compare oldObj against newObj and its key:values. Creates diffObj that shares the keys (full-depth) with newObj,
// but with values of true or false depending on whether or not oldObj's values for that key matches newValue's. A value of true means that
// the key:value is different. Also creates diffObjFlag that keeps track of whether or not there is any change in the diffObj. A value of true
// means that there is a difference between newObj and oldObj. Returns array [diffObj, diffObjFlag]
var findDiffKeyValues = module.exports.findDiffKeyValuesMixin = {
    findDiffKeyValues: function(newObj, oldObj) {
        var tempReturn = [],
            diffObj = {},
            diffObjFlag = false; // default diffObjFlag to false: no difference
        for (var key in newObj) {
            // use for loop to support both arrays and objects
            if (['boolean', 'number', 'string'].indexOf(typeof newObj[key]) > -1) {
                // if value stored in key is a boolean, number, or string, do a comparison
                if (newObj[key] === oldObj[key]) {
                    // no difference
                    diffObj[key] = false;
                } else {
                    // difference found. set diffObjFlag to true, as well
                    diffObj[key] = true;
                    diffObjFlag = true;
                }
            } else {
                // if it's an array or object, recurse
                tempReturn = this.findDiffKeyValues(newObj[key], oldObj[key]);
                diffObj[key] = tempReturn[0];
                diffObjFlag = diffObjFlag ? true : tempReturn[1]; // if the diffObjFlag was previously set to true, always set to true. Otherwise use the returned value
            }
        }
        return [diffObj, diffObjFlag];
    }
};
