import { filterMap, isDescribe, toStringLiteral } from './utils';
import { makeTypeContentRoot, makeTypeContentChild } from './types';
import { getAllowValues, getInterfaceOrTypeName, getMetadataFromDetails } from './joiUtils';
import { getIndentStr, getJsDocString } from './write';
// see __tests__/joiTypes.ts for more information
export const supportedJoiTypes = ['array', 'object', 'alternatives', 'any', 'boolean', 'date', 'number', 'string'];
// @TODO - Temporarily used prevent 'map' and 'set' from being used by cast
//         Remove once support for 'map' and 'set' is added
const validCastTo = ['string', 'number'];
function getCommonDetails(details, settings) {
    var _a, _b, _c, _d;
    const interfaceOrTypeName = getInterfaceOrTypeName(settings, details);
    const description = (_a = details.flags) === null || _a === void 0 ? void 0 : _a.description;
    const presence = (_b = details.flags) === null || _b === void 0 ? void 0 : _b.presence;
    const value = (_c = details.flags) === null || _c === void 0 ? void 0 : _c.default;
    const example = (_d = details.examples) === null || _d === void 0 ? void 0 : _d[0];
    let required;
    if (presence === 'required' || (settings.treatDefaultedOptionalAsRequired && value !== undefined)) {
        required = true;
    }
    else if (presence === 'optional') {
        required = false;
    }
    else {
        required = settings.defaultToRequired;
    }
    return { interfaceOrTypeName, jsDoc: { description, example }, required, value };
}
export function getAllCustomTypes(parsedSchema) {
    var _a;
    const customTypes = [];
    if (parsedSchema.__isRoot) {
        customTypes.push(...parsedSchema.children.flatMap(child => getAllCustomTypes(child)));
    }
    else {
        customTypes.push(...(_a = parsedSchema.customTypes) !== null && _a !== void 0 ? _a : []);
    }
    return customTypes;
}
const wrapValue = (value) => {
    if (typeof value === 'string') {
        return `"${value}"`;
    }
    else if (Array.isArray(value)) {
        return `[${value.map(av => wrapValue(av))}]`;
    }
    else if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    else {
        return `${value}`;
    }
};
function typeContentToTsHelper(settings, parsedSchema, indentLevel, doExport = false) {
    if (!parsedSchema.__isRoot) {
        return {
            tsContent: settings.supplyDefaultsInType
                ? parsedSchema.value !== undefined
                    ? `${wrapValue(parsedSchema.value)} | ${parsedSchema.content}`
                    : parsedSchema.content
                : parsedSchema.content,
            jsDoc: parsedSchema.jsDoc
        };
    }
    const children = parsedSchema.children;
    if (doExport && !parsedSchema.interfaceOrTypeName) {
        // Cannot figured a way to make this error happen
        /* istanbul ignore next */
        throw new Error(`Type ${JSON.stringify(parsedSchema)} needs a name to be exported`);
    }
    switch (parsedSchema.joinOperation) {
        case 'list': {
            const childrenContent = children.map(child => typeContentToTsHelper(settings, child, indentLevel));
            if (childrenContent.length > 1) {
                /* istanbul ignore next */
                throw new Error('Multiple array item types not supported');
            }
            let content = childrenContent[0].tsContent;
            if (content.includes('|')) {
                // TODO: might need a better way to add the parens for union
                content = `(${content})`;
            }
            const arrayStr = settings.supplyDefaultsInType
                ? parsedSchema.value !== undefined
                    ? `${wrapValue(parsedSchema.value)} | ${content}`
                    : `${content}[]`
                : `${content}[]`;
            if (doExport) {
                return {
                    tsContent: `export type ${parsedSchema.interfaceOrTypeName} = ${arrayStr};`,
                    jsDoc: parsedSchema.jsDoc
                };
            }
            return { tsContent: arrayStr, jsDoc: parsedSchema.jsDoc };
        }
        case 'union': {
            const childrenContent = children.map(child => typeContentToTsHelper(settings, child, indentLevel).tsContent);
            const unionStr = childrenContent.join(' | ');
            const finalStr = settings.supplyDefaultsInType
                ? parsedSchema.value !== undefined
                    ? `${wrapValue(parsedSchema.value)} | ${unionStr}`
                    : unionStr
                : unionStr;
            if (doExport) {
                return {
                    tsContent: `export type ${parsedSchema.interfaceOrTypeName} = ${finalStr};`,
                    jsDoc: parsedSchema.jsDoc
                };
            }
            return { tsContent: finalStr, jsDoc: parsedSchema.jsDoc };
        }
        case 'object': {
            if (!children.length && !doExport) {
                return { tsContent: 'object', jsDoc: parsedSchema.jsDoc };
            }
            // interface can have no properties {} if the joi object has none defined
            let objectStr = '{}';
            if (children.length !== 0) {
                const childrenContent = children.map(child => {
                    const childInfo = typeContentToTsHelper(settings, child, indentLevel + 1, false);
                    // forcing name to be defined here, might need a runtime check but it should be set if we are here
                    const descriptionStr = getJsDocString(settings, child.interfaceOrTypeName, childInfo.jsDoc, indentLevel);
                    const optionalStr = child.required ? '' : '?';
                    const indentString = getIndentStr(settings, indentLevel);
                    return `${descriptionStr}${indentString}${child.interfaceOrTypeName}${optionalStr}: ${childInfo.tsContent};`;
                });
                objectStr = `{\n${childrenContent.join('\n')}\n${getIndentStr(settings, indentLevel - 1)}}`;
                if (parsedSchema.value !== undefined && settings.supplyDefaultsInType) {
                    objectStr = `${wrapValue(parsedSchema.value)} | ${objectStr}`;
                }
            }
            if (doExport) {
                return {
                    tsContent: `export interface ${parsedSchema.interfaceOrTypeName} ${objectStr}`,
                    jsDoc: parsedSchema.jsDoc
                };
            }
            return { tsContent: objectStr, jsDoc: parsedSchema.jsDoc };
        }
        default:
            throw new Error(`Unsupported join operation ${parsedSchema.joinOperation}`);
    }
}
export function typeContentToTs(settings, parsedSchema, doExport = false) {
    const { tsContent, jsDoc } = typeContentToTsHelper(settings, parsedSchema, 1, doExport);
    // forcing name to be defined here, might need a runtime check but it should be set if we are here
    const descriptionStr = getJsDocString(settings, parsedSchema.interfaceOrTypeName, jsDoc);
    return `${descriptionStr}${tsContent}`;
}
function parseHelper(details, settings, rootSchema) {
    var _a, _b, _c;
    // Convert type if a valid cast type is present
    if (((_a = details.flags) === null || _a === void 0 ? void 0 : _a.cast) && validCastTo.includes((_b = details.flags) === null || _b === void 0 ? void 0 : _b.cast)) {
        // @NOTE - if additional values are added beyond 'string' and 'number' further transformation will
        // be needed on the details object to support those types
        details.type = (_c = details.flags) === null || _c === void 0 ? void 0 : _c.cast;
    }
    switch (details.type) {
        case 'array':
            return parseArray(details, settings);
        case 'string':
            return parseStringSchema(details, settings, rootSchema !== null && rootSchema !== void 0 ? rootSchema : false);
        case 'alternatives':
            return parseAlternatives(details, settings);
        case 'object':
            return parseObjects(details, settings);
        default:
            return parseBasicSchema(details, settings, rootSchema !== null && rootSchema !== void 0 ? rootSchema : false);
    }
}
// TODO: will be issues with useLabels if a nested schema has a label but is not exported on its own
// TODO: will need to pass around ignoreLabels more
/**
 * Parses a joi schema into a TypeContent
 * @param details: the joi schema
 * @param settings: settings used for parsing
 * @param useLabels if true and if a schema has a label we won't parse it and instead just reference the label in the outputted type
 * @param ignoreLabels a list a label to ignore if found. Sometimes nested joi schemas will inherit the parents label so we want to ignore that
 * @param rootSchema
 */
export function parseSchema(details, settings, useLabels = true, ignoreLabels = [], rootSchema) {
    const { interfaceOrTypeName, jsDoc, required, value } = getCommonDetails(details, settings);
    if (interfaceOrTypeName && useLabels && !ignoreLabels.includes(interfaceOrTypeName)) {
        // skip parsing and just reference the label since we assumed we parsed the schema that the label references
        // TODO: do we want to use the labels description if we reference it?
        const child = makeTypeContentChild({
            content: interfaceOrTypeName,
            customTypes: [interfaceOrTypeName],
            jsDoc,
            required
        });
        const allowedValues = createAllowTypes(details);
        if (allowedValues.length !== 0) {
            allowedValues.unshift(child);
            return makeTypeContentRoot({
                joinOperation: 'union',
                interfaceOrTypeName: '',
                children: allowedValues,
                jsDoc,
                required
            });
        }
        return child;
    }
    if (!supportedJoiTypes.includes(details.type)) {
        // See if we can find a base type for this type in the details.
        let typeToUse;
        const baseTypes = getMetadataFromDetails('baseType', details);
        if (baseTypes.length > 0) {
            // If there are multiple base types then the deepest one will be at the
            // end of the list which is most likely the one to use.
            typeToUse = baseTypes.pop();
        }
        // If we could not get the base type from the metadata then see if we can
        // map it to something sensible. If not, then set it to 'unknown'.
        if (typeToUse === undefined) {
            switch (details.type) {
                case 'function':
                    typeToUse = '(...args: any[]) => any';
                    break;
                case 'symbol':
                    typeToUse = 'symbol';
                    break;
                case 'binary':
                    typeToUse = 'Buffer';
                    break;
                default:
                    typeToUse = 'unknown';
                    break;
            }
        }
        if (settings.debug) {
            // eslint-disable-next-line no-console
            console.debug(`Using '${typeToUse}' for unsupported type '${details.type}'`);
        }
        return makeTypeContentChild({ content: typeToUse, interfaceOrTypeName, jsDoc, required });
    }
    const parsedSchema = parseHelper(details, settings, rootSchema);
    if (!parsedSchema) {
        return undefined;
    }
    parsedSchema.interfaceOrTypeName = interfaceOrTypeName;
    parsedSchema.jsDoc = jsDoc;
    parsedSchema.required = required;
    parsedSchema.value = value;
    return parsedSchema;
}
function parseBasicSchema(details, settings, rootSchema) {
    const { interfaceOrTypeName, jsDoc } = getCommonDetails(details, settings);
    const joiType = details.type;
    let content = joiType;
    if (joiType === 'date') {
        content = 'Date';
    }
    const values = getAllowValues(details.allow);
    // at least one value
    if (values.length !== 0) {
        const allowedValues = createAllowTypes(details);
        if (values[0] === null) {
            allowedValues.unshift(makeTypeContentChild({ content }));
        }
        return makeTypeContentRoot({ joinOperation: 'union', children: allowedValues, interfaceOrTypeName, jsDoc });
    }
    if (rootSchema) {
        return makeTypeContentRoot({
            joinOperation: 'union',
            children: [makeTypeContentChild({ content, interfaceOrTypeName, jsDoc })],
            interfaceOrTypeName,
            jsDoc
        });
    }
    else {
        return makeTypeContentChild({ content, interfaceOrTypeName, jsDoc });
    }
}
function createAllowTypes(details) {
    const values = getAllowValues(details.allow);
    // at least one value
    if (values.length !== 0) {
        const allowedValues = values.map((value) => makeTypeContentChild({ content: typeof value === 'string' ? toStringLiteral(value) : `${value}` }));
        return allowedValues;
    }
    return [];
}
/**
 * `undefined` is not part of this list as that would make the field optional instead
 */
const stringAllowValues = [null, ''];
function parseStringSchema(details, settings, rootSchema) {
    const { interfaceOrTypeName, jsDoc } = getCommonDetails(details, settings);
    const values = getAllowValues(details.allow);
    // at least one value
    if (values.length !== 0) {
        if (values.length === 1 && values[0] === '') {
            // special case of empty string sometimes used in Joi to allow just empty string
        }
        else {
            const allowedValues = values.map(value => stringAllowValues.includes(value) && value !== ''
                ? makeTypeContentChild({ content: `${value}` })
                : makeTypeContentChild({ content: toStringLiteral(value) }));
            if (values.filter(value => stringAllowValues.includes(value)).length == values.length) {
                allowedValues.unshift(makeTypeContentChild({ content: 'string' }));
            }
            return makeTypeContentRoot({ joinOperation: 'union', children: allowedValues, interfaceOrTypeName, jsDoc });
        }
    }
    if (rootSchema) {
        return makeTypeContentRoot({
            joinOperation: 'union',
            children: [makeTypeContentChild({ content: 'string', interfaceOrTypeName, jsDoc })],
            interfaceOrTypeName,
            jsDoc
        });
    }
    else {
        return makeTypeContentChild({ content: 'string', interfaceOrTypeName, jsDoc });
    }
}
function parseArray(details, settings) {
    // TODO: handle multiple things in the items arr
    const item = details.items ? details.items[0] : { type: 'any' };
    const { interfaceOrTypeName, jsDoc } = getCommonDetails(details, settings);
    const child = parseSchema(item, settings);
    if (!child) {
        return undefined;
    }
    const allowedValues = createAllowTypes(details);
    // at least one value
    if (allowedValues.length !== 0) {
        allowedValues.unshift(makeTypeContentRoot({ joinOperation: 'list', children: [child], interfaceOrTypeName, jsDoc }));
        return makeTypeContentRoot({ joinOperation: 'union', children: allowedValues, interfaceOrTypeName, jsDoc });
    }
    return makeTypeContentRoot({ joinOperation: 'list', children: [child], interfaceOrTypeName, jsDoc });
}
function parseAlternatives(details, settings) {
    const { interfaceOrTypeName, jsDoc } = getCommonDetails(details, settings);
    const ignoreLabels = interfaceOrTypeName ? [interfaceOrTypeName] : [];
    const children = filterMap(details.matches, match => {
        // hackily patched to avoid blowing up when it comes across an alternative with a .ref()
        // may introduce other bugs
        // certainly does not generate a logical TS type based on the ref values
        if (match.schema)
            return parseSchema(match.schema, settings, true, ignoreLabels);
        return undefined;
    });
    // This is an check that cannot be tested as Joi throws an error before this package
    // can be called, there is test for it in alternatives
    if (children.length === 0) {
        /* istanbul ignore next */
        return undefined;
    }
    return makeTypeContentRoot({ joinOperation: 'union', children, interfaceOrTypeName, jsDoc });
}
function buildUnknownTypeContent(unknownType = 'unknown') {
    return {
        __isRoot: false,
        content: unknownType,
        interfaceOrTypeName: '[x: string]',
        required: true,
        jsDoc: { description: `${unknownType && unknownType[0].toUpperCase() + unknownType.slice(1)} Property` }
    };
}
function parseUnknown(details, settings) {
    const unknownTypes = getMetadataFromDetails('unknownType', details);
    const type = unknownTypes.pop();
    if (typeof type === 'string') {
        return buildUnknownTypeContent(type);
    }
    if (isDescribe(type)) {
        const typeContent = parseSchema(type, settings);
        if (!typeContent) {
            // Can't think of a way to make this happen but want to keep this ready just in case
            /* istanbul ignore next */
            return buildUnknownTypeContent();
        }
        return {
            ...typeContent,
            interfaceOrTypeName: '[x: string]',
            required: true
        };
    }
    return buildUnknownTypeContent();
}
function parseObjects(details, settings) {
    var _a, _b;
    let children = filterMap(Object.entries(details.keys || {}), ([key, value]) => {
        const parsedSchema = parseSchema(value, settings);
        // The only type that could return this is alternatives
        // see parseAlternatives for why this is ignored
        if (!parsedSchema) {
            return undefined;
        }
        parsedSchema.interfaceOrTypeName = /^[$A-Z_][0-9A-Z_$]*$/i.test(key || '') ? key : `'${key}'`;
        return parsedSchema;
    });
    const isMap = ((_a = details.patterns) === null || _a === void 0 ? void 0 : _a.length) === 1 && details.patterns[0].schema.type === 'string';
    if (((_b = details === null || details === void 0 ? void 0 : details.flags) === null || _b === void 0 ? void 0 : _b.unknown) === true || isMap) {
        children.push(parseUnknown(details, settings));
    }
    if (settings.sortPropertiesByName) {
        children = children.sort((a, b) => {
            if (!a.interfaceOrTypeName || !b.interfaceOrTypeName) {
                // interfaceOrTypeName should never be null at this point this is just in case
                /* istanbul ignore next */
                return 0;
            }
            else if (a.interfaceOrTypeName > b.interfaceOrTypeName) {
                return 1;
            }
            else if (a.interfaceOrTypeName < b.interfaceOrTypeName) {
                return -1;
            }
            // this next line can never happen as the object is totally invalid as the object is invalid
            // the code would not build so ignoring this
            /* istanbul ignore next */
            return 0;
        });
    }
    const { interfaceOrTypeName, jsDoc } = getCommonDetails(details, settings);
    const allowedValues = createAllowTypes(details);
    // at least one value
    if (allowedValues.length !== 0) {
        allowedValues.unshift(makeTypeContentRoot({ joinOperation: 'object', children, interfaceOrTypeName, jsDoc }));
        return makeTypeContentRoot({ joinOperation: 'union', children: allowedValues, interfaceOrTypeName, jsDoc });
    }
    return makeTypeContentRoot({ joinOperation: 'object', children, interfaceOrTypeName, jsDoc });
}
