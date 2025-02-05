import { Settings } from '.';
import { Describe } from './joiDescribeTypes';
/**
 * Fetch the metadata values for a given field. Note that it is possible to have
 * more than one metadata record for a given field hence it is possible to get
 * back a list of values.
 *
 * @param field - the name of the metadata field to fetch
 * @param details - the schema details
 * @returns the values for the given field
 */
export declare function getMetadataFromDetails(field: string, details: Describe): any[];
/**
 * Get the interface name from the Joi
 * @returns a string if it can find one
 */
export declare function getInterfaceOrTypeName(settings: Settings, details: Describe): string | undefined;
/**
 * Note: this is updating by reference
 */
export declare function ensureInterfaceorTypeName(settings: Settings, details: Describe, interfaceOrTypeName: string): void;
/**
 * Ensure values is an array and remove any junk
 */
export declare function getAllowValues(allow: unknown[] | undefined): any[];
//# sourceMappingURL=joiUtils.d.ts.map