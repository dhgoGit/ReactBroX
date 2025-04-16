import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';
import * as reactDocgenTypescript from 'react-docgen-typescript';

export interface ComponentInfo {
    name: string;
    filePath: string;
    hooks: HookInfo[];
    states: StateInfo[];
    contexts: ContextInfo[];
    props: PropInfo[];
    description?: string;
    storeUsage?: StoreInfo[];
}

export interface StateInfo {
    name: string;
    initialValue?: string;
    setter: string;
    usageCount?: number;
}

export interface PropInfo {
    name: string;
    type: string;
    required: boolean;
    defaultValue?: string;
    description?: string;
    usageCount?: number;
}

export interface HookInfo {
    name: string;
    dependencies?: string[];
    callLocation: {
        line: number;
        column: number;
    };
    description?: string;
    value?: string;
}

export interface ContextInfo {
    name: string;
    type?: string;
    usageLocations: {
        line: number;
        column: number;
    }[];
    value?: string;
}

export interface StoreInfo {
    type: 'redux' | 'mobx' | 'recoil' | 'zustand' | 'jotai' | 'other';
    actions: string[];
    selectors: string[];
}

export class ReactComponentAnalyzer {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Finds React component files at the given path.
     */
    public async findReactComponents(projectPath: string): Promise<string[]> {
        const componentFiles: string[] = [];
        const fullPath = path.join(this.workspaceRoot, projectPath);
        
        try {
            await this.findComponentFilesRecursively(fullPath, componentFiles);
            return componentFiles;
        } catch (error) {
            console.error('Error searching component files:', error);
            return [];
        }
    }

    /**
     * Recursively traverses directories to find React component files.
     */
    private async findComponentFilesRecursively(dirPath: string, results: string[]): Promise<void> {
        if (!fs.existsSync(dirPath)) {
            return;
        }

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                // Skip node_modules and other excluded directories
                if (entry.name !== 'node_modules' && entry.name !== 'dist' && !entry.name.startsWith('.')) {
                    await this.findComponentFilesRecursively(fullPath, results);
                }
            } else if (this.isReactComponentFile(entry.name)) {
                results.push(fullPath);
            }
        }
    }

    /**
     * Checks if a file is a React component.
     */
    private isReactComponentFile(fileName: string): boolean {
        const reactExtensions = ['.jsx', '.tsx', '.js', '.ts'];
        const ext = path.extname(fileName);
        
        if (!reactExtensions.includes(ext)) {
            return false;
        }
        
        // Check specific naming conventions (optional)
        // const baseName = path.basename(fileName, ext);
        // if (baseName.startsWith('use')) {
        //     return false; // Exclude hook files
        // }
        
        return true;
    }

    /**
     * Analyzes a component file to extract information.
     */
    public async analyzeComponent(filePath: string): Promise<ComponentInfo | null> {
        try {
            const relativePath = path.relative(this.workspaceRoot, filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Create AST from file content
            const ast = babelParser.parse(content, {
                sourceType: 'module',
                plugins: ['jsx', 'typescript', 'decorators-legacy'],
            });
            
            // Initialize basic component info
            const componentName = this.extractComponentName(filePath, ast);
            
            if (!componentName) {
                return null; // If component name cannot be found
            }
            
            const componentInfo: ComponentInfo = {
                name: componentName,
                filePath: relativePath,
                hooks: [],
                states: [],
                contexts: [],
                props: []
            };
            
            // Traverse AST to extract hooks, states, contexts, etc.
            this.extractComponentDetails(ast, componentInfo);
            
            // Extract Props information using react-docgen-typescript
            try {
                const parser = reactDocgenTypescript.withDefaultConfig();
                const propInfo = parser.parse(filePath);
                if (propInfo.length > 0) {
                    const props = propInfo[0].props;
                    for (const propName in props) {
                        const prop = props[propName];
                        componentInfo.props.push({
                            name: propName,
                            type: prop.type?.name || 'unknown',
                            required: prop.required || false,
                            defaultValue: prop.defaultValue?.value,
                            description: prop.description
                        });
                    }
                    
                    componentInfo.description = propInfo[0].description;
                }
            } catch (docgenError) {
                console.log(`Failed to analyze props for ${componentName}:`, docgenError);
            }
            
            return componentInfo;
        } catch (error) {
            console.error('Component analysis error:', error);
            return null;
        }
    }

    /**
     * Extracts component name from AST.
     */
    private extractComponentName(filePath: string, ast: any): string | null {
        let componentName: string | null = null;
        let foundInAST = false;
        
        // Extract component name from filename
        const pathParts = filePath.split(/[\/\\]/);
        const fileName = pathParts[pathParts.length - 1];
        const fileNameWithoutExt = fileName.split('.')[0];
        
        traverse(ast, {
            FunctionDeclaration: (path) => {
                // Function declaration style component (function MyComponent(){})
                if (path.node.id && this.isPascalCase(path.node.id.name)) {
                    componentName = path.node.id.name;
                    foundInAST = true;
                }
            },
            VariableDeclarator: (path) => {
                // Variable declaration style component (const MyComponent = () => {})
                if (path.node.id.type === 'Identifier' && 
                    this.isPascalCase(path.node.id.name) &&
                    (path.node.init?.type === 'ArrowFunctionExpression' || 
                     path.node.init?.type === 'FunctionExpression')) {
                    componentName = path.node.id.name;
                    foundInAST = true;
                }
            },
            ExportDefaultDeclaration: (path) => {
                // Use filename for anonymous function default exports
                if (!foundInAST && path.node.declaration && (
                    path.node.declaration.type === 'ArrowFunctionExpression' || 
                    path.node.declaration.type === 'FunctionExpression' ||
                    (path.node.declaration.type === 'FunctionDeclaration' && !path.node.declaration.id)
                )) {
                    if (this.isPascalCase(fileNameWithoutExt)) {
                        componentName = fileNameWithoutExt;
                        foundInAST = true;
                    }
                }
            }
        });
        
        // Add filename info if component name not found or different from filename
        if (!componentName) {
            if (this.isPascalCase(fileNameWithoutExt)) {
                return fileNameWithoutExt;
            }
            return null;
        } else if (componentName !== fileNameWithoutExt && this.isPascalCase(fileNameWithoutExt)) {
            // Show both component name and filename when they differ
            return `${componentName} (${fileNameWithoutExt})`;
        }
        
        return componentName;
    }

    /**
     * Checks if a string is in PascalCase.
     */
    private isPascalCase(str: string): boolean {
        return /^[A-Z][A-Za-z0-9]*$/.test(str);
    }

    /**
     * Analyzes AST to extract component details.
     */
    private extractComponentDetails(ast: any, componentInfo: ComponentInfo): void {
        // Initialize
        componentInfo.hooks = [];
        componentInfo.states = [];
        componentInfo.contexts = [];
        componentInfo.storeUsage = [];

        traverse(ast, {
            CallExpression: (path) => {
                const callee = path.node.callee;
                
                // Detect React hook usage (useState, useEffect, etc.)
                if (callee.type === 'Identifier' && 
                    callee.name.startsWith('use')) {
                    const hookName = callee.name;
                    
                    // Check if hook is already registered
                    if (!componentInfo.hooks.some(h => h.name === hookName)) {
                        // Extract hook information
                        const hookInfo = this.extractHookInfo(path);
                        componentInfo.hooks.push(hookInfo);
                        
                        // Extract state info when useState hook is detected
                        if (hookName === 'useState') {
                            const stateInfo = this.extractStateFromUseState(path);
                            if (stateInfo) {
                                componentInfo.states.push(stateInfo);
                            }
                        }
                        
                        // Extract context info when useContext hook is detected
                        if (hookName === 'useContext') {
                            const contextInfo = this.extractContextInfo(path);
                            if (contextInfo && !componentInfo.contexts.some(c => c.name === contextInfo.name)) {
                                componentInfo.contexts.push(contextInfo);
                            }
                        }
                    }
                }
                
                // Detect state management library usage
                this.detectStoreUsage(path, componentInfo);
            }
        });
    }

    /**
     * Extracts state information from useState hook.
     */
    private extractStateFromUseState(path: any): StateInfo | null {
        // Analyze useState call structure
        const args = path.node.arguments;
        
        // Extract state variable name (destructuring assignment form)
        let stateName: string | null = null;
        let setterName: string | null = null;
        const parent = path.parent;
        
        if (parent.type === 'VariableDeclarator' && 
            parent.id.type === 'ArrayPattern' && 
            parent.id.elements.length >= 2) {
            const stateElement = parent.id.elements[0];
            const setterElement = parent.id.elements[1];
            
            if (stateElement && stateElement.type === 'Identifier') {
                stateName = stateElement.name;
            }
            
            if (setterElement && setterElement.type === 'Identifier') {
                setterName = setterElement.name;
            }
        }
        
        if (!stateName || !setterName) {
            return null;
        }
        
        // Extract initial value (if present)
        let initialValue: string | undefined;
        if (args.length > 0) {
            const initArg = args[0];
            
            // Handle basic JavaScript values
            if (initArg.type === 'StringLiteral') {
                initialValue = `"${initArg.value}"`;
            } else if (initArg.type === 'NumericLiteral') {
                initialValue = initArg.value.toString();
            } else if (initArg.type === 'BooleanLiteral') {
                initialValue = initArg.value.toString();
            } else if (initArg.type === 'NullLiteral') {
                initialValue = 'null';
            } else if (initArg.type === 'ArrayExpression') {
                initialValue = '[]';
            } else if (initArg.type === 'ObjectExpression') {
                initialValue = '{}';
            }
        }
        
        return {
            name: stateName,
            initialValue,
            setter: setterName,
            usageCount: this.countVariableUsage(path, stateName)
        };
    }

    /**
     * Counts variable usage occurrences.
     */
    private countVariableUsage(path: any, variableName: string): number {
        let count = 0;
        
        // Variable usage counting logic
        traverse(path.scope.block, {
            Identifier: (innerPath) => {
                if (innerPath.node.name === variableName && 
                    innerPath.parent.type !== 'VariableDeclarator') {
                    count++;
                }
            }
        });
        
        return count;
    }

    /**
     * Extracts hook information.
     */
    private extractHookInfo(path: any): HookInfo {
        const callee = path.node.callee;
        const hookInfo: HookInfo = {
            name: callee.name,
            callLocation: {
                line: path.node.loc ? path.node.loc.start.line : 0,
                column: path.node.loc ? path.node.loc.start.column : 0
            }
        };

        // Extract dependency array
        if (callee.name === 'useEffect' || callee.name === 'useMemo' || callee.name === 'useCallback') {
            const args = path.node.arguments;
            if (args.length > 1 && args[1].type === 'ArrayExpression') {
                const deps = args[1].elements;
                hookInfo.dependencies = deps.map((dep: any) => {
                    if (dep && dep.type === 'Identifier') {
                        return dep.name;
                    } else if (dep && dep.type === 'CallExpression' && dep.callee) {
                        return dep.callee.name || 'Anonymous function call';
                    }
                    return 'Unknown dependency';
                }).filter(Boolean);
            }
        }

        // Try to extract hook value
        hookInfo.value = this.extractHookValue(path);

        return hookInfo;
    }

    /**
     * Extracts value returned by a hook.
     */
    private extractHookValue(path: any): string | undefined {
        const hookName = path.node.callee.name;
        const parent = path.parent;
        
        // 변수 선언에서 훅 반환값 추출
        if (parent.type === 'VariableDeclarator') {
            // 단일 변수에 할당된 경우 (ex: const result = useHook())
            if (parent.id.type === 'Identifier') {
                return parent.id.name;
            }
            
            // 배열 구조 분해 할당 (ex: const [state, setState] = useState())
            if (parent.id.type === 'ArrayPattern' && parent.id.elements.length >= 1) {
                const elements = parent.id.elements
                    .filter((el: any) => el && el.type === 'Identifier')
                    .map((el: any) => el.name);
                
                if (elements.length > 0) {
                    return `[${elements.join(', ')}]`;
                }
            }
            
            // 객체 구조 분해 할당 (ex: const { data, loading } = useQuery())
            if (parent.id.type === 'ObjectPattern') {
                const properties = parent.id.properties
                    .filter((prop: any) => prop.key && prop.key.type === 'Identifier')
                    .map((prop: any) => prop.key.name);
                
                if (properties.length > 0) {
                    return `{ ${properties.join(', ')} }`;
                }
            }
        }
        
        return undefined;
    }

    /**
     * Extracts Context information.
     */
    private extractContextInfo(path: any): ContextInfo | null {
        const args = path.node.arguments;
        if (args.length === 0 || !args[0]) {
            return null;
        }
        
        const contextArg = args[0];
        if (!contextArg.type || contextArg.type !== 'Identifier') {
            return null;
        }
        
        const contextInfo: ContextInfo = {
            name: contextArg.name,
            usageLocations: [{
                line: path.node.loc ? path.node.loc.start.line : 0,
                column: path.node.loc ? path.node.loc.start.column : 0
            }]
        };
        
        // Extract context value
        contextInfo.value = this.extractContextValue(path);

        return contextInfo;
    }

    /**
     * Extracts Context value.
     */
    private extractContextValue(path: any): string | undefined {
        const parent = path.parent;
        const contextArg = path.node.arguments[0];
        const contextName = contextArg && contextArg.type === 'Identifier' ? contextArg.name : 'unknown';
        
        // 변수 선언에서 컨텍스트 값 추출
        if (parent.type === 'VariableDeclarator') {
            // 단일 변수에 할당된 경우 (ex: const context = useContext(MyContext))
            if (parent.id.type === 'Identifier') {
                return `${parent.id.name} (from ${contextName})`;
            }
            
            // 객체 구조 분해 할당 (ex: const { user, settings } = useContext(AppContext))
            if (parent.id.type === 'ObjectPattern') {
                const properties = parent.id.properties
                    .filter((prop: any) => prop.key && prop.key.type === 'Identifier')
                    .map((prop: any) => prop.key.name);
                
                if (properties.length > 0) {
                    return `{ ${properties.join(', ')} } (from ${contextName})`;
                }
            }
        }
        
        return `from ${contextName}`;
    }

    /**
     * Detects state management library usage.
     */
    private detectStoreUsage(path: any, componentInfo: ComponentInfo): void {
        if (!componentInfo.storeUsage) {
            componentInfo.storeUsage = [];
        }
        
        const callee = path.node.callee;
        const parent = path.parent;
        
        // Redux 감지
        if (callee.type === 'Identifier' && callee.name === 'useSelector') {
            let selectorProps: string[] = [];
            
            // 구조 분해 할당 추출 (ex: const { user, settings } = useSelector(state => state))
            if (parent.type === 'VariableDeclarator' && parent.id.type === 'ObjectPattern') {
                selectorProps = parent.id.properties
                    .filter((prop: any) => prop.key && prop.key.type === 'Identifier')
                    .map((prop: any) => prop.key.name);
            }
            
            const selectorName = this.getCalleeArgumentName(path);
            const selectorInfo = selectorProps.length > 0 
                ? `${selectorName} -> { ${selectorProps.join(', ')} }`
                : selectorName;
                
            this.addStoreInfo(componentInfo, 'redux', 'selectors', selectorInfo);
        } else if (callee.type === 'Identifier' && callee.name === 'useDispatch') {
            this.addStoreInfo(componentInfo, 'redux', 'actions', '디스패치');
        }
        
        // Recoil 감지
        else if (callee.type === 'Identifier' && callee.name === 'useRecoilState') {
            this.addStoreInfo(componentInfo, 'recoil', 'selectors', this.getCalleeArgumentName(path));
        } else if (callee.type === 'Identifier' && callee.name === 'useRecoilValue') {
            this.addStoreInfo(componentInfo, 'recoil', 'selectors', this.getCalleeArgumentName(path));
        }
        
        // Zustand 감지
        else if (callee.type === 'Identifier' && callee.name === 'useStore') {
            let storeProps: string[] = [];
            
            // 구조 분해 할당 추출
            if (parent.type === 'VariableDeclarator' && parent.id.type === 'ObjectPattern') {
                storeProps = parent.id.properties
                    .filter((prop: any) => prop.key && prop.key.type === 'Identifier')
                    .map((prop: any) => prop.key.name);
            }
            
            const storeName = this.getCalleeArgumentName(path);
            const storeInfo = storeProps.length > 0 
                ? `${storeName} -> { ${storeProps.join(', ')} }`
                : storeName;
                
            this.addStoreInfo(componentInfo, 'zustand', 'selectors', storeInfo);
        }
        
        // Jotai 감지
        else if (callee.type === 'Identifier' && callee.name === 'useAtom') {
            this.addStoreInfo(componentInfo, 'jotai', 'selectors', this.getCalleeArgumentName(path));
        }
    }

    /**
     * Adds state management library information.
     */
    private addStoreInfo(componentInfo: ComponentInfo, type: 'redux' | 'mobx' | 'recoil' | 'zustand' | 'jotai' | 'other', category: 'actions' | 'selectors', name: string): void {
        if (!componentInfo.storeUsage) {
            componentInfo.storeUsage = [];
        }
        
        // Check if store info of the same type already exists
        let storeInfo = componentInfo.storeUsage.find(store => store.type === type);
        
        if (!storeInfo) {
            storeInfo = {
                type,
                actions: [],
                selectors: []
            };
            componentInfo.storeUsage.push(storeInfo);
        }
        
        // Check if item is already added
        if (!storeInfo[category].includes(name)) {
            storeInfo[category].push(name);
        }
    }

    /**
     * Gets the argument name of a function call.
     */
    private getCalleeArgumentName(path: any): string {
        if (path.node.arguments.length > 0) {
            const arg = path.node.arguments[0];
            if (arg.type === 'Identifier') {
                return arg.name;
            }
        }
        return 'Anonymous argument';
    }
}