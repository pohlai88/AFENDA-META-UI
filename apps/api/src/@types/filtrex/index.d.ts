/**
 * Type declarations for filtrex
 * Safe expression evaluation library
 */
declare module "filtrex" {
  export interface CompileOptions {
    /**
     * Additional functions to make available in expressions
     */
    extraFunctions?: Record<string, (...args: any[]) => any>;
    
    /**
     * Custom property accessor for objects
     */
    customProp?: (name: string, get: (name: string) => any, obj: any) => any;
  }

  /**
   * Compile a safe expression that can be evaluated with context
   * 
   * @param expression Expression string to compile
   * @param options Compilation options
   * @returns Function that evaluates the expression with provided context
   */
  export function compileExpression(
    expression: string,
    options?: CompileOptions
  ): (context: Record<string, any>) => any;
}
