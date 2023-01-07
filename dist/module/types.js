export class InputFileFilter {
}
/**
 * *.ts files
 */
InputFileFilter.Default = new RegExp(/\.(ts)$/);
/**
 * *.ts files excluding index.ts files
 */
InputFileFilter.ExcludeIndex = new RegExp(/(?<!index)\.(ts)$/);
/**
 * *.ts and *.js files
 */
InputFileFilter.IncludeJavaScript = new RegExp(/\.(ts|js)$/);
export function makeTypeContentChild({ content, customTypes, required, interfaceOrTypeName, jsDoc }) {
    return {
        __isRoot: false,
        content,
        customTypes,
        required,
        interfaceOrTypeName,
        jsDoc
    };
}
export function makeTypeContentRoot({ joinOperation, interfaceOrTypeName, children, required, jsDoc }) {
    return {
        __isRoot: true,
        joinOperation,
        interfaceOrTypeName,
        children,
        required,
        jsDoc
    };
}
