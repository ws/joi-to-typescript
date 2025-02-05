"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseSchemaFile = exports.convertSchemaInternal = void 0;
const joi_1 = __importDefault(require("joi"));
const path_1 = __importDefault(require("path"));
const write_1 = require("./write");
const parse_1 = require("./parse");
const joiUtils_1 = require("./joiUtils");
function convertSchemaInternal(settings, joi, exportedName, rootSchema) {
    const details = joi.describe();
    const interfaceOrTypeName = (0, joiUtils_1.getInterfaceOrTypeName)(settings, details) || exportedName;
    if (!interfaceOrTypeName) {
        if (settings.useLabelAsInterfaceName) {
            throw new Error(`At least one "object" does not have .label(''). Details: ${JSON.stringify(details)}`);
        }
        else {
            throw new Error(`At least one "object" does not have .meta({className:''}). Details: ${JSON.stringify(details)}`);
        }
    }
    if (settings.debug && interfaceOrTypeName.toLowerCase().endsWith('schema')) {
        if (settings.useLabelAsInterfaceName) {
            // eslint-disable-next-line no-console
            console.debug(`It is recommended you update the Joi Schema '${interfaceOrTypeName}' similar to: ${interfaceOrTypeName} = Joi.object().label('${interfaceOrTypeName.replace('Schema', '')}')`);
        }
        else {
            // eslint-disable-next-line no-console
            console.debug(`It is recommended you update the Joi Schema '${interfaceOrTypeName}' similar to: ${interfaceOrTypeName} = Joi.object().meta({className:'${interfaceOrTypeName.replace('Schema', '')}'})`);
        }
    }
    (0, joiUtils_1.ensureInterfaceorTypeName)(settings, details, interfaceOrTypeName);
    const parsedSchema = (0, parse_1.parseSchema)(details, settings, false, undefined, rootSchema);
    if (parsedSchema) {
        const customTypes = (0, parse_1.getAllCustomTypes)(parsedSchema);
        const content = (0, parse_1.typeContentToTs)(settings, parsedSchema, true);
        return {
            interfaceOrTypeName,
            customTypes,
            content
        };
    }
    // The only type that could return this is alternatives
    // see parseAlternatives for why this is ignored
    /* istanbul ignore next */
    return undefined;
}
exports.convertSchemaInternal = convertSchemaInternal;
/**
 * Analyse a schema file
 *
 * @param settings - Settings
 * @param schemaFileName - Schema File Name
 * @returns Schema analysis results
 */
async function analyseSchemaFile(settings, schemaFileName) {
    const allConvertedTypes = [];
    const fullFilePath = path_1.default.resolve(path_1.default.join(settings.schemaDirectory, schemaFileName));
    const schemaFile = await Promise.resolve().then(() => __importStar(require(fullFilePath)));
    // Create Type File Name
    const typeFileName = (0, write_1.getTypeFileNameFromSchema)(schemaFileName, settings);
    const fullOutputFilePath = path_1.default.join(settings.typeOutputDirectory, typeFileName);
    for (const exportedName in schemaFile) {
        const joiSchema = schemaFile[exportedName];
        if (!joi_1.default.isSchema(joiSchema)) {
            continue;
        }
        const convertedType = convertSchemaInternal(settings, joiSchema, exportedName, true);
        if (convertedType) {
            allConvertedTypes.push({ ...convertedType, location: fullOutputFilePath });
        }
    }
    if (allConvertedTypes.length === 0) {
        if (settings.debug) {
            // eslint-disable-next-line no-console
            console.debug(`${schemaFileName} - Skipped - no Joi Schemas found`);
        }
        return;
    }
    if (settings.debug) {
        // eslint-disable-next-line no-console
        console.debug(`${schemaFileName} - Processing`);
    }
    // Clean up type list
    // Sort Types
    const typesToBeWritten = allConvertedTypes.sort((interface1, interface2) => 0 - (interface1.interfaceOrTypeName > interface2.interfaceOrTypeName ? -1 : 1));
    // Write types
    const typeContent = typesToBeWritten.map(typeToBeWritten => typeToBeWritten.content);
    // Get imports for the current file
    const allExternalTypes = [];
    const allCurrentFileTypeNames = typesToBeWritten.map(typeToBeWritten => typeToBeWritten.interfaceOrTypeName);
    for (const typeToBeWritten of typesToBeWritten) {
        for (const customType of typeToBeWritten.customTypes) {
            if (!allCurrentFileTypeNames.includes(customType) && !allExternalTypes.includes(typeToBeWritten)) {
                allExternalTypes.push(typeToBeWritten);
            }
        }
    }
    const fileContent = `${typeContent.join('\n\n').concat('\n')}`;
    return {
        externalTypes: allExternalTypes,
        internalTypes: typesToBeWritten,
        fileContent,
        typeFileName,
        typeFileLocation: settings.typeOutputDirectory
    };
}
exports.analyseSchemaFile = analyseSchemaFile;
