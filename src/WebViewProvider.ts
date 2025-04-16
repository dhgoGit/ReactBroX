import * as vscode from 'vscode';
import * as path from 'path';
import { ComponentInfo } from './ReactComponentAnalyzer';

export class ComponentDetailsWebViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'reactBro.componentDetails';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'openFile':
                    if (message.filePath) {
                        const uri = vscode.Uri.file(message.filePath);
                        vscode.window.showTextDocument(uri);
                    }
                    break;
            }
        });
    }

    /**
     * Updates webview content with component information.
     */
    public updateContent(components: ComponentInfo[]) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateComponents',
                components
            });
        }
    }

    /**
     * Generate HTML for webview
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        // Generate resource URIs for styles, scripts etc.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));

        // Generate HTML
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <title>React Component Analyzer</title>
            <style>
                .badge {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    margin-right: 5px;
                    margin-bottom: 5px;
                }
                .badge-hook {
                    background-color: #e3f2fd;
                    color: #0d47a1;
                    border: 1px solid #bbdefb;
                }
                .badge-state {
                    background-color: #e8f5e9;
                    color: #1b5e20;
                    border: 1px solid #c8e6c9;
                }
                .badge-context {
                    background-color: #fff3e0;
                    color: #e65100;
                    border: 1px solid #ffe0b2;
                }
                .badge-prop {
                    background-color: #f3e5f5;
                    color: #4a148c;
                    border: 1px solid #e1bee7;
                }
                .badge-redux {
                    background-color: #e8eaf6;
                    color: #1a237e;
                    border: 1px solid #c5cae9;
                }
                .badge-required {
                    background-color: #ffebee;
                    color: #b71c1c;
                    border: 1px solid #ffcdd2;
                }
                .badge-optional {
                    background-color: #e0e0e0;
                    color: #424242;
                    border: 1px solid #bdbdbd;
                }
                .component-card {
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    padding: 16px;
                    margin-bottom: 16px;
                    background-color: #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .component-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e0e0e0;
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }
                .section {
                    margin-bottom: 16px;
                }
                .section-title {
                    font-weight: 600;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                }
                .section-title:before {
                    content: '';
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    margin-right: 8px;
                }
                .hooks-title:before {
                    background-color: #0d47a1;
                }
                .states-title:before {
                    background-color: #1b5e20;
                }
                .contexts-title:before {
                    background-color: #e65100;
                }
                .props-title:before {
                    background-color: #4a148c;
                }
                .store-title:before {
                    background-color: #1a237e;
                }
                .state-item, .prop-item, .hook-item, .context-item {
                    padding: 8px;
                    border-radius: 4px;
                    background-color: #fafafa;
                    margin-bottom: 4px;
                }
                .usage-count {
                    font-size: 10px;
                    color: #757575;
                    margin-left: 4px;
                }
                .label {
                    font-weight: 600;
                    margin-right: 4px;
                }
                .value {
                    font-family: 'Courier New', monospace;
                    background-color: #f5f5f5;
                    padding: 1px 4px;
                    border-radius: 2px;
                }
                .clickable {
                    cursor: pointer;
                    text-decoration: underline;
                    color: #1976d2;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>ReactBroX</h1>
                <p class="info-text">Analyze and visualize React components in NX projects.</p>
                
                <div id="component-list" class="component-list">
                    <div class="placeholder">
                        To start analyzing components, run "ReactBroX: Analyze React Components" from the command palette.
                    </div>
                </div>
                
                <div id="component-details" class="component-details">
                    <!-- Component details will be displayed here -->
                </div>
            </div>
            <script src="${scriptUri}"></script>
            <script>
                // Function to visualize component information
                function renderComponentDetails(component) {
                    const detailsElement = document.getElementById('component-details');
                    
                    if (!component) {
                        detailsElement.innerHTML = '<div class="placeholder">Select a component.</div>';
                        return;
                    }
                    
                    let html = \`
                        <div class="component-card">
                            <div class="component-header">
                                <h2>\${component.name}</h2>
                                <small class="clickable" onclick="openFile('\${component.filePath}')">\${component.filePath}</small>
                            </div>
                            
                            \${component.description ? \`<p>\${component.description}</p>\` : ''}
                            
                            <!-- Props section -->
                            \${renderPropsSection(component.props)}
                            
                            <!-- States section -->
                            \${renderStatesSection(component.states)}
                            
                            <!-- Hooks section -->
                            \${renderHooksSection(component.hooks)}
                            
                            <!-- Contexts section -->
                            \${renderContextsSection(component.contexts)}
                            
                            <!-- Store usage section -->
                            \${renderStoreSection(component.storeUsage)}
                        </div>
                    \`;
                    
                    detailsElement.innerHTML = html;
                }
                
                // Render Props section
                function renderPropsSection(props) {
                    if (!props || props.length === 0) {
                        return '';
                    }
                    
                    return \`
                        <div class="section">
                            <div class="section-title props-title">Props (Total: \${props.length})</div>
                            \${props.map(prop => \`
                                <div class="prop-item">
                                    <div>
                                        <span class="label">\${prop.name}</span>
                                        <span class="badge \${prop.required ? 'badge-required' : 'badge-optional'}">
                                            \${prop.required ? 'Required' : 'Optional'}
                                        </span>
                                        \${prop.usageCount ? \`<span class="usage-count">Usage: \${prop.usageCount} times</span>\` : ''}
                                    </div>
                                    <div>
                                        <span class="label">Type:</span>
                                        <span class="value">\${prop.type || 'Unknown'}</span>
                                    </div>
                                    \${prop.defaultValue ? \`
                                        <div>
                                            <span class="label">Default Value:</span>
                                            <span class="value">\${prop.defaultValue}</span>
                                        </div>
                                    \` : ''}
                                    \${prop.description ? \`
                                        <div>
                                            <span class="label">Description:</span>
                                            <span>\${prop.description}</span>
                                        </div>
                                    \` : ''}
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }
                
                // Render States section
                function renderStatesSection(states) {
                    if (!states || states.length === 0) {
                        return '';
                    }
                    
                    return \`
                        <div class="section">
                            <div class="section-title states-title">State (Total: \${states.length})</div>
                            \${states.map(state => \`
                                <div class="state-item">
                                    <div>
                                        <span class="label">\${state.name}</span>
                                        <span class="badge badge-state">state</span>
                                        \${state.usageCount ? \`<span class="usage-count">Usage: \${state.usageCount} times</span>\` : ''}
                                    </div>
                                    <div>
                                        <span class="label">Setter:</span>
                                        <span class="value">\${state.setter}</span>
                                    </div>
                                    \${state.initialValue ? \`
                                        <div>
                                            <span class="label">Initial Value:</span>
                                            <span class="value">\${state.initialValue}</span>
                                        </div>
                                    \` : ''}
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }
                
                // Render Hooks section
                function renderHooksSection(hooks) {
                    if (!hooks || hooks.length === 0) {
                        return '';
                    }
                    
                    return \`
                        <div class="section">
                            <div class="section-title hooks-title">Hooks (Total: \${hooks.length})</div>
                            \${hooks.map(hook => \`
                                <div class="hook-item">
                                    <span class="label">\${hook.name}</span>
                                    <span class="badge badge-hook">hook</span>
                                    <div>
                                        <span class="label">Location:</span>
                                        <span>\${hook.callLocation.line}:\${hook.callLocation.column}</span>
                                    </div>
                                    \${hook.value ? \`
                                        <div>
                                            <span class="label">Value:</span>
                                            <span class="value">\${hook.value}</span>
                                        </div>
                                    \` : ''}
                                    \${hook.dependencies && hook.dependencies.length > 0 ? \`
                                        <div>
                                            <span class="label">Dependencies:</span>
                                            <span class="value">[\${hook.dependencies.join(', ')}]</span>
                                        </div>
                                    \` : ''}
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }
                
                // Render Contexts section
                function renderContextsSection(contexts) {
                    if (!contexts || contexts.length === 0) {
                        return '';
                    }
                    
                    return \`
                        <div class="section">
                            <div class="section-title contexts-title">Contexts (Total: \${contexts.length})</div>
                            \${contexts.map(context => \`
                                <div class="context-item">
                                    <span class="label">\${context.name}</span>
                                    <span class="badge badge-context">context</span>
                                    \${context.value ? \`
                                        <div>
                                            <span class="label">Value:</span>
                                            <span class="value">\${context.value}</span>
                                        </div>
                                    \` : ''}
                                    \${context.type ? \`
                                        <div>
                                            <span class="label">Type:</span>
                                            <span class="value">\${context.type}</span>
                                        </div>
                                    \` : ''}
                                    \${context.usageLocations && context.usageLocations.length > 0 ? \`
                                        <div>
                                            <span class="label">Usage Locations:</span>
                                            <span>\${context.usageLocations.map(loc => \`\${loc.line}:\${loc.column}\`).join(', ')}</span>
                                        </div>
                                    \` : ''}
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }
                
                // Render Store section
                function renderStoreSection(storeUsage) {
                    if (!storeUsage || storeUsage.length === 0) {
                        return '';
                    }
                    
                    return \`
                        <div class="section">
                            <div class="section-title store-title">State Management (Total: \${storeUsage.length})</div>
                            \${storeUsage.map(store => \`
                                <div class="state-item">
                                    <div>
                                        <span class="label">\${getStoreTypeName(store.type)}</span>
                                        <span class="badge badge-redux">\${store.type}</span>
                                    </div>
                                    \${store.selectors && store.selectors.length > 0 ? \`
                                        <div>
                                            <span class="label">Selectors:</span>
                                            <span class="value">[\${store.selectors.join(', ')}]</span>
                                        </div>
                                    \` : ''}
                                    \${store.actions && store.actions.length > 0 ? \`
                                        <div>
                                            <span class="label">Actions:</span>
                                            <span class="value">[\${store.actions.join(', ')}]</span>
                                        </div>
                                    \` : ''}
                                </div>
                            \`).join('')}
                        </div>
                    \`;
                }
                
                // Get display name for store type
                function getStoreTypeName(type) {
                    switch(type) {
                        case 'redux': return 'Redux';
                        case 'mobx': return 'MobX';
                        case 'recoil': return 'Recoil';
                        case 'zustand': return 'Zustand';
                        case 'jotai': return 'Jotai';
                        default: return 'Other';
                    }
                }
                
                // Function to open file
                function openFile(filePath) {
                    vscode.postMessage({
                        command: 'openFile',
                        filePath
                    });
                }
                
                // Handle messages from VS Code
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    if (message.command === 'updateComponents') {
                        // Update component list
                        const componentListElement = document.getElementById('component-list');
                        
                        if (message.components && message.components.length > 0) {
                            componentListElement.innerHTML = message.components.map((component, index) => \`
                                <div class="component-item \${index === 0 ? 'active' : ''}" onclick="selectComponent(\${index})">
                                    <div class="component-name">\${component.name}</div>
                                    <div class="component-path">\${component.filePath}</div>
                                    <div class="component-badges">
                                        \${component.props.length > 0 ? \`<span class="badge badge-prop">Props: \${component.props.length}</span>\` : ''}
                                        \${component.states.length > 0 ? \`<span class="badge badge-state">State: \${component.states.length}</span>\` : ''}
                                        \${component.hooks.length > 0 ? \`<span class="badge badge-hook">Hooks: \${component.hooks.length}</span>\` : ''}
                                        \${component.contexts.length > 0 ? \`<span class="badge badge-context">Context: \${component.contexts.length}</span>\` : ''}
                                    </div>
                                </div>
                            \`).join('');
                            
                            // Display first component details
                            renderComponentDetails(message.components[0]);
                            
                            // Define component selection function
                            window.selectComponent = function(index) {
                                // Update active class
                                document.querySelectorAll('.component-item').forEach(item => {
                                    item.classList.remove('active');
                                });
                                document.querySelectorAll('.component-item')[index].classList.add('active');
                                
                                // Display selected component information
                                renderComponentDetails(message.components[index]);
                            };
                        } else {
                            componentListElement.innerHTML = '<div class="placeholder">No React components found in analysis.</div>';
                            document.getElementById('component-details').innerHTML = '';
                        }
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

/**
 * Webview provider for displaying project dependency graph
 */
export class DependencyGraphWebViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'reactBro.dependencyGraph';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    public updateDependencyGraph(nodes: any[], edges: any[]) {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateGraph',
                data: { nodes, edges }
            });
        }
    }

    /**
     * Generate HTML for webview
     */
    private _getHtmlForWebview(webview: vscode.Webview) {
        // Generate resource URIs for styles, scripts etc.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'graph.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'style.css'));
        
        // Add chart library (vis-network)
        const visNetworkUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionUri, 'node_modules', 'vis-network', 'dist', 'vis-network.min.js'));
        const visNetworkCssUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this._extensionUri, 'node_modules', 'vis-network', 'dist', 'vis-network.min.css'));

        // Generate HTML
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${styleUri}" rel="stylesheet">
            <link href="${visNetworkCssUri}" rel="stylesheet">
            <title>NX Dependency Graph</title>
        </head>
        <body>
            <div class="container">
                <h1>NX Project Dependencies</h1>
                <p class="info-text">Module dependency graph for NX projects</p>
                
                <div id="dependency-graph" class="graph-container">
                    <div class="placeholder">
                        To load the dependency graph, run "ReactBroX: Detect NX Project" from the command palette.
                    </div>
                </div>
            </div>
            <script src="${visNetworkUri}"></script>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}