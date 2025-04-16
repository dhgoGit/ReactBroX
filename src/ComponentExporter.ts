import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ComponentInfo } from './ReactComponentAnalyzer';

/**
 * Class for exporting React component analysis results in various formats
 */
export class ComponentExporter {
    /**
     * Exports component information to an HTML file.
     */
    public static async exportToHtml(components: ComponentInfo[], workspaceRoot: string): Promise<string> {
        try {
            // Select export directory
            const exportDir = await this.getExportDirectory(workspaceRoot);
            if (!exportDir) {
                return 'Export was canceled.';
            }

            // Generate filename (includes current date and time)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
            const fileName = `react-components-${timestamp}.html`;
            const filePath = path.join(exportDir, fileName);
            
            // Generate HTML content
            const htmlContent = this.generateHtmlContent(components);
            
            // Save file
            fs.writeFileSync(filePath, htmlContent, 'utf-8');
            
            return `${filePath}\nComponent analysis results have been saved to the file.`;
        } catch (error) {
            console.error('HTML export error:', error);
            throw new Error(`Error during HTML export: ${error}`);
        }
    }
    
    /**
     * Exports component information to a JSON file.
     */
    public static async exportToJson(components: ComponentInfo[], workspaceRoot: string): Promise<string> {
        try {
            // Select export directory
            const exportDir = await this.getExportDirectory(workspaceRoot);
            if (!exportDir) {
                return 'Export was canceled.';
            }

            // Generate filename (includes current date and time)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
            const fileName = `react-components-${timestamp}.json`;
            const filePath = path.join(exportDir, fileName);
            
            // Generate and save JSON data
            const jsonData = JSON.stringify(components, null, 2);
            fs.writeFileSync(filePath, jsonData, 'utf-8');
            
            return `${filePath}\nComponent analysis results have been saved to the file.`;
        } catch (error) {
            console.error('JSON export error:', error);
            throw new Error(`Error during JSON export: ${error}`);
        }
    }
    
    /**
     * Exports component information to a Markdown file.
     */
    public static async exportToMarkdown(components: ComponentInfo[], workspaceRoot: string): Promise<string> {
        try {
            // Select export directory
            const exportDir = await this.getExportDirectory(workspaceRoot);
            if (!exportDir) {
                return 'Export was canceled.';
            }

            // Generate filename (includes current date and time)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
            const fileName = `react-components-${timestamp}.md`;
            const filePath = path.join(exportDir, fileName);
            
            // Generate Markdown content
            const mdContent = this.generateMarkdownContent(components);
            
            // Save file
            fs.writeFileSync(filePath, mdContent, 'utf-8');
            
            return `${filePath}\nComponent analysis results have been saved to the file.`;
        } catch (error) {
            console.error('Markdown export error:', error);
            throw new Error(`Error during Markdown export: ${error}`);
        }
    }
    
    /**
     * Prompts the user to select an export directory.
     */
    private static async getExportDirectory(defaultDir: string): Promise<string | undefined> {
        // Set default folder options
        const options: vscode.OpenDialogOptions = {
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Export Folder',
            defaultUri: vscode.Uri.file(defaultDir)
        };
        
        // Show folder selection dialog
        const folderUri = await vscode.window.showOpenDialog(options);
        
        if (folderUri && folderUri.length > 0) {
            return folderUri[0].fsPath;
        }
        
        return undefined;
    }
    
    /**
     * Generates HTML content.
     */
    private static generateHtmlContent(components: ComponentInfo[]): string {
        const componentCards = components.map(component => {
            return `
                <div class="component-card">
                    <div class="component-header">
                        <h2>${component.name}</h2>
                        <small>${component.filePath}</small>
                    </div>
                    
                    ${component.description ? `<p>${component.description}</p>` : ''}
                    
                    ${this.renderHtmlPropsSection(component.props)}
                    ${this.renderHtmlStatesSection(component.states)}
                    ${this.renderHtmlHooksSection(component.hooks)}
                    ${this.renderHtmlContextsSection(component.contexts)}
                    ${this.renderHtmlStoreSection(component.storeUsage)}
                </div>
            `;
        }).join('');
        
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>React Component Analysis Results</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.5;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                    color: #333;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                h1 {
                    color: #1976d2;
                    margin-bottom: 20px;
                }
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
                .component-index {
                    margin-bottom: 20px;
                }
                .component-link {
                    display: block;
                    padding: 8px;
                    margin-bottom: 4px;
                    background-color: #f5f5f5;
                    border-radius: 4px;
                    text-decoration: none;
                    color: #1976d2;
                }
                .component-link:hover {
                    background-color: #e3f2fd;
                }
                .component-badges {
                    margin-top: 4px;
                }
                .info-text {
                    margin-bottom: 20px;
                    color: #757575;
                }
                .timestamp {
                    font-style: italic;
                    color: #9e9e9e;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>React Component Analysis Results</h1>
                <p class="info-text">Total of ${components.length} React components analyzed.</p>
                <p class="timestamp">Analysis time: ${new Date().toLocaleString()}</p>
                
                <div class="component-index">
                    <h2>Component List</h2>
                    ${components.map((component, index) => `
                        <a class="component-link" href="#component-${index}">
                            ${component.name}
                            <div class="component-badges">
                                ${component.props.length > 0 ? `<span class="badge badge-prop">Props: ${component.props.length}</span>` : ''}
                                ${component.states.length > 0 ? `<span class="badge badge-state">State: ${component.states.length}</span>` : ''}
                                ${component.hooks.length > 0 ? `<span class="badge badge-hook">Hooks: ${component.hooks.length}</span>` : ''}
                                ${component.contexts.length > 0 ? `<span class="badge badge-context">Context: ${component.contexts.length}</span>` : ''}
                            </div>
                        </a>
                    `).join('')}
                </div>
                
                ${componentCards}
            </div>
        </body>
        </html>
        `;
    }
    
    /**
     * Renders HTML Props section.
     */
    private static renderHtmlPropsSection(props: any[]): string {
        if (!props || props.length === 0) {
            return '';
        }
        
        return `
            <div class="section">
                <div class="section-title props-title">Props (${props.length} total)</div>
                ${props.map(prop => `
                    <div class="prop-item">
                        <div>
                            <span class="label">${prop.name}</span>
                            <span class="badge ${prop.required ? 'badge-required' : 'badge-optional'}">
                                ${prop.required ? 'Required' : 'Optional'}
                            </span>
                            ${prop.usageCount ? `<span class="usage-count">Usage: ${prop.usageCount} times</span>` : ''}
                        </div>
                        <div>
                            <span class="label">Type:</span>
                            <span class="value">${prop.type || 'Unknown'}</span>
                        </div>
                        ${prop.defaultValue ? `
                            <div>
                                <span class="label">Default:</span>
                                <span class="value">${prop.defaultValue}</span>
                            </div>
                        ` : ''}
                        ${prop.description ? `
                            <div>
                                <span class="label">Description:</span>
                                <span>${prop.description}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Renders HTML States section.
     */
    private static renderHtmlStatesSection(states: any[]): string {
        if (!states || states.length === 0) {
            return '';
        }
        
        return `
            <div class="section">
                <div class="section-title states-title">State (${states.length} total)</div>
                ${states.map(state => `
                    <div class="state-item">
                        <div>
                            <span class="label">${state.name}</span>
                            <span class="badge badge-state">state</span>
                            ${state.usageCount ? `<span class="usage-count">Usage: ${state.usageCount} times</span>` : ''}
                        </div>
                        <div>
                            <span class="label">Setter:</span>
                            <span class="value">${state.setter}</span>
                        </div>
                        ${state.initialValue ? `
                            <div>
                                <span class="label">Initial value:</span>
                                <span class="value">${state.initialValue}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Renders HTML Hooks section.
     */
    private static renderHtmlHooksSection(hooks: any[]): string {
        if (!hooks || hooks.length === 0) {
            return '';
        }
        
        return `
            <div class="section">
                <div class="section-title hooks-title">Hooks (${hooks.length} total)</div>
                ${hooks.map(hook => `
                    <div class="hook-item">
                        <span class="label">${hook.name}</span>
                        <span class="badge badge-hook">hook</span>
                        <div>
                            <span class="label">Location:</span>
                            <span>${hook.callLocation.line}:${hook.callLocation.column}</span>
                        </div>
                        ${hook.dependencies && hook.dependencies.length > 0 ? `
                            <div>
                                <span class="label">Dependencies:</span>
                                <span class="value">[${hook.dependencies.join(', ')}]</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Renders HTML Contexts section.
     */
    private static renderHtmlContextsSection(contexts: any[]): string {
        if (!contexts || contexts.length === 0) {
            return '';
        }
        
        return `
            <div class="section">
                <div class="section-title contexts-title">Contexts (${contexts.length} total)</div>
                ${contexts.map(context => `
                    <div class="context-item">
                        <span class="label">${context.name}</span>
                        <span class="badge badge-context">context</span>
                        ${context.type ? `
                            <div>
                                <span class="label">Type:</span>
                                <span class="value">${context.type}</span>
                            </div>
                        ` : ''}
                        ${context.usageLocations && context.usageLocations.length > 0 ? `
                            <div>
                                <span class="label">Usage locations:</span>
                                <span>${context.usageLocations.map((loc: any) => `${loc.line}:${loc.column}`).join(', ')}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Renders HTML Store section.
     */
    private static renderHtmlStoreSection(storeUsage: any[] | undefined): string {
        if (!storeUsage || storeUsage.length === 0) {
            return '';
        }
        
        return `
            <div class="section">
                <div class="section-title store-title">State Management (${storeUsage.length} total)</div>
                ${storeUsage.map(store => `
                    <div class="state-item">
                        <div>
                            <span class="label">${this.getStoreTypeName(store.type)}</span>
                            <span class="badge badge-redux">${store.type}</span>
                        </div>
                        ${store.selectors && store.selectors.length > 0 ? `
                            <div>
                                <span class="label">Selectors:</span>
                                <span class="value">[${store.selectors.join(', ')}]</span>
                            </div>
                        ` : ''}
                        ${store.actions && store.actions.length > 0 ? `
                            <div>
                                <span class="label">Actions:</span>
                                <span class="value">[${store.actions.join(', ')}]</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Generates Markdown content.
     */
    private static generateMarkdownContent(components: ComponentInfo[]): string {
        let mdContent = `# React Component Analysis Results\n\n`;
        mdContent += `> Total of ${components.length} React components analyzed.\n`;
        mdContent += `> Analysis time: ${new Date().toLocaleString()}\n\n`;
        
        mdContent += `## Table of Contents\n\n`;
        components.forEach((component, index) => {
            mdContent += `${index + 1}. [${component.name}](#${component.name.toLowerCase().replace(/[^\w-]+/g, '')})\n`;
        });
        
        mdContent += `\n---\n\n`;
        
        components.forEach(component => {
            mdContent += `## ${component.name}\n\n`;
            mdContent += `**File path:** \`${component.filePath}\`\n\n`;
            
            if (component.description) {
                mdContent += `${component.description}\n\n`;
            }
            
            // Props
            if (component.props && component.props.length > 0) {
                mdContent += `### Props (${component.props.length})\n\n`;
                component.props.forEach(prop => {
                    mdContent += `#### ${prop.name} ${prop.required ? '(Required)' : '(Optional)'}\n\n`;
                    mdContent += `- **Type:** \`${prop.type || 'Unknown'}\`\n`;
                    if (prop.defaultValue) {
                        mdContent += `- **Default value:** \`${prop.defaultValue}\`\n`;
                    }
                    if (prop.description) {
                        mdContent += `- **Description:** ${prop.description}\n`;
                    }
                    if (prop.usageCount) {
                        mdContent += `- **Usage frequency:** ${prop.usageCount} times\n`;
                    }
                    mdContent += `\n`;
                });
            }
            
            // States
            if (component.states && component.states.length > 0) {
                mdContent += `### State (${component.states.length})\n\n`;
                component.states.forEach(state => {
                    mdContent += `#### ${state.name}\n\n`;
                    mdContent += `- **Setter:** \`${state.setter}\`\n`;
                    if (state.initialValue) {
                        mdContent += `- **Initial value:** \`${state.initialValue}\`\n`;
                    }
                    if (state.usageCount) {
                        mdContent += `- **Usage frequency:** ${state.usageCount} times\n`;
                    }
                    mdContent += `\n`;
                });
            }
            
            // Hooks
            if (component.hooks && component.hooks.length > 0) {
                mdContent += `### Hooks (${component.hooks.length})\n\n`;
                component.hooks.forEach(hook => {
                    mdContent += `#### ${hook.name}\n\n`;
                    mdContent += `- **Location:** ${hook.callLocation.line}:${hook.callLocation.column}\n`;
                    if (hook.dependencies && hook.dependencies.length > 0) {
                        mdContent += `- **Dependencies:** \`[${hook.dependencies.join(', ')}]\`\n`;
                    }
                    mdContent += `\n`;
                });
            }
            
            // Contexts
            if (component.contexts && component.contexts.length > 0) {
                mdContent += `### Contexts (${component.contexts.length})\n\n`;
                component.contexts.forEach(context => {
                    mdContent += `#### ${context.name}\n\n`;
                    if (context.type) {
                        mdContent += `- **Type:** \`${context.type}\`\n`;
                    }
                    if (context.usageLocations && context.usageLocations.length > 0) {
                        mdContent += `- **Usage locations:** ${context.usageLocations.map((loc: any) => `${loc.line}:${loc.column}`).join(', ')}\n`;
                    }
                    mdContent += `\n`;
                });
            }
            
            // Store Usage
            if (component.storeUsage && component.storeUsage.length > 0) {
                mdContent += `### State Management (${component.storeUsage.length})\n\n`;
                component.storeUsage.forEach(store => {
                    mdContent += `#### ${this.getStoreTypeName(store.type)}\n\n`;
                    if (store.selectors && store.selectors.length > 0) {
                        mdContent += `- **Selectors:** \`[${store.selectors.join(', ')}]\`\n`;
                    }
                    if (store.actions && store.actions.length > 0) {
                        mdContent += `- **Actions:** \`[${store.actions.join(', ')}]\`\n`;
                    }
                    mdContent += `\n`;
                });
            }
            
            mdContent += `---\n\n`;
        });
        
        return mdContent;
    }
    
    /**
     * Returns the formatted name of a state management library.
     */
    private static getStoreTypeName(type: string): string {
        switch(type) {
            case 'redux': return 'Redux';
            case 'mobx': return 'MobX';
            case 'recoil': return 'Recoil';
            case 'zustand': return 'Zustand';
            case 'jotai': return 'Jotai';
            default: return 'Other';
        }
    }
} 