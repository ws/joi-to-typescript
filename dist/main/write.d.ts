import { Settings, JsDoc } from "./types";
/**
 * Write index.ts file
 *
 * @param settings - Settings Object
 * @param fileNamesToExport - List of file names that will be added to the index.ts file
 */
export declare function writeIndexFile(settings: Settings, fileNamesToExport: string[]): void;
export declare function getTypeFileNameFromSchema(schemaFileName: string, settings: Settings): string;
/**
 * Get all indent characters for this indent level
 * @param settings includes what the indent characters are
 * @param indentLevel how many indent levels
 */
export declare function getIndentStr(settings: Settings, indentLevel: number): string;
/**
 * Get Interface jsDoc
 */
export declare function getJsDocString(settings: Settings, name: string, jsDoc?: JsDoc, indentLevel?: number): string;
//# sourceMappingURL=write.d.ts.map