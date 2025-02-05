"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllowValues = exports.ensureInterfaceorTypeName = exports.getInterfaceOrTypeName = exports.getMetadataFromDetails = void 0;
/**
 * Fetch the metadata values for a given field. Note that it is possible to have
 * more than one metadata record for a given field hence it is possible to get
 * back a list of values.
 *
 * @param field - the name of the metadata field to fetch
 * @param details - the schema details
 * @returns the values for the given field
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMetadataFromDetails(field, details) {
    var _a;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metas = (_a = details === null || details === void 0 ? void 0 : details.metas) !== null && _a !== void 0 ? _a : [];
    return metas.filter(entry => entry[field]).map(entry => entry[field]);
}
exports.getMetadataFromDetails = getMetadataFromDetails;
/**
 * Get the interface name from the Joi
 * @returns a string if it can find one
 */
function getInterfaceOrTypeName(settings, details) {
    var _a, _b, _c;
    if (((_a = details.flags) === null || _a === void 0 ? void 0 : _a.presence) === 'forbidden') {
        return 'undefined';
    }
    if (settings.useLabelAsInterfaceName) {
        return (_c = (_b = details === null || details === void 0 ? void 0 : details.flags) === null || _b === void 0 ? void 0 : _b.label) === null || _c === void 0 ? void 0 : _c.replace(/\s/g, '');
    }
    else {
        if ((details === null || details === void 0 ? void 0 : details.metas) && details.metas.length > 0) {
            const classNames = getMetadataFromDetails('className', details);
            if (classNames.length !== 0) {
                // If Joi.concat() or Joi.keys() has been used then there may be multiple
                // get the last one as this is the current className
                const className = classNames.pop();
                return className === null || className === void 0 ? void 0 : className.replace(/\s/g, '');
            }
        }
        return undefined;
    }
}
exports.getInterfaceOrTypeName = getInterfaceOrTypeName;
/**
 * Note: this is updating by reference
 */
function ensureInterfaceorTypeName(settings, details, interfaceOrTypeName) {
    var _a;
    if (settings.useLabelAsInterfaceName) {
        // Set the label from the exportedName if missing
        if (!details.flags) {
            details.flags = { label: interfaceOrTypeName };
        }
        else if (!details.flags.label) {
            // Unable to build any test cases for this line but will keep it if joi.describe() changes
            /* istanbul ignore next */
            details.flags.label = interfaceOrTypeName;
        }
    }
    else {
        // Set the meta[].className from the exportedName if missing
        if (!details.metas || details.metas.length === 0) {
            details.metas = [{ className: interfaceOrTypeName }];
        }
        else {
            const className = (_a = details.metas.find(meta => meta.className)) === null || _a === void 0 ? void 0 : _a.className;
            if (!className) {
                details.metas.push({ className: interfaceOrTypeName });
            }
        }
    }
}
exports.ensureInterfaceorTypeName = ensureInterfaceorTypeName;
/**
 * Ensure values is an array and remove any junk
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAllowValues(allow) {
    if (!allow || allow.length === 0) {
        return [];
    }
    // This may contain things like, so remove them
    // { override: true }
    // { ref: {...}}
    // If a user wants a complex custom type they need to use an interface
    const allowValues = allow.filter(item => item === null || !(typeof item === 'object'));
    return allowValues;
}
exports.getAllowValues = getAllowValues;
