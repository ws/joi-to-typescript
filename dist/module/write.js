// Functions for converting properties to strings and to file system
// TODO: Move all code here
import { writeFileSync } from "fs";
import Path from 'path';
/**
 * Write index.ts file
 *
 * @param settings - Settings Object
 * @param fileNamesToExport - List of file names that will be added to the index.ts file
 */
export function writeIndexFile(settings, fileNamesToExport) {
    if (fileNamesToExport.length === 0) {
        // Don't write an index file if its going to export nothing
        return;
    }
    const exportLines = fileNamesToExport.map(fileName => `export * from './${fileName.replace(/\\/g, '/')}';`);
    const fileContent = `${settings.fileHeader}\n\n${exportLines.join('\n').concat('\n')}`;
    writeFileSync(Path.join(settings.typeOutputDirectory, 'index.ts'), fileContent);
}
export function getTypeFileNameFromSchema(schemaFileName, settings) {
    return schemaFileName.endsWith(`${settings.schemaFileSuffix}.ts`)
        ? schemaFileName.substring(0, schemaFileName.length - `${settings.schemaFileSuffix}.ts`.length)
        : schemaFileName.replace('.ts', '');
}
/**
 * Get all indent characters for this indent level
 * @param settings includes what the indent characters are
 * @param indentLevel how many indent levels
 */
export function getIndentStr(settings, indentLevel) {
    return settings.indentationChacters.repeat(indentLevel);
}
/**
 * Get Interface jsDoc
 */
export function getJsDocString(settings, name, jsDoc, indentLevel = 0) {
    var _a;
    if (!settings.commentEverything && !(jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.description) && !(jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.example)) {
        return '';
    }
    const lines = ['/**'];
    if (settings.commentEverything || (jsDoc && jsDoc.description)) {
        lines.push(` * ${(_a = jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.description) !== null && _a !== void 0 ? _a : name}`);
    }
    if (jsDoc === null || jsDoc === void 0 ? void 0 : jsDoc.example) {
        lines.push(` * @example ${jsDoc.example}`);
    }
    lines.push(' */');
    return lines.map(line => `${getIndentStr(settings, indentLevel)}${line}`).join('\n') + '\n';
}
