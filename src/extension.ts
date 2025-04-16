// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { NxProjectAnalyzer, DependencyInfo, ProjectInfo } from './NxProjectAnalyzer';
import { ReactComponentAnalyzer, ComponentInfo } from './ReactComponentAnalyzer';
import { ComponentDetailsWebViewProvider, DependencyGraphWebViewProvider } from './WebViewProvider';
import { ComponentExporter } from './ComponentExporter';
import { ComponentServer } from './ComponentServer';

// Global variables for storing analyzed components and server instance
let analyzedComponents: ComponentInfo[] = [];
let componentServer: ComponentServer | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('ReactBroX extension has been activated!');

	// Get workspace root path
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
	if (!workspaceRoot) {
		vscode.window.showErrorMessage('Please open a workspace to use ReactBroX.');
		return;
	}

	// Create analyzer instances
	const nxAnalyzer = new NxProjectAnalyzer(workspaceRoot);
	const reactAnalyzer = new ReactComponentAnalyzer(workspaceRoot);

	// Register webview providers
	const componentDetailsProvider = new ComponentDetailsWebViewProvider(context.extensionUri);
	const dependencyGraphProvider = new DependencyGraphWebViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ComponentDetailsWebViewProvider.viewType,
			componentDetailsProvider
		)
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			DependencyGraphWebViewProvider.viewType,
			dependencyGraphProvider
		)
	);

	/**
	 * Executes React component analysis
	 */
	async function analyzeReactComponents(projectPath: string = ''): Promise<ComponentInfo[]> {
		return await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Analyzing React Components...",
			cancellable: false
		}, async (progress) => {
			try {
				// Find React component files
				progress.report({ message: "Searching for React component files..." });
				const componentFiles = await reactAnalyzer.findReactComponents(projectPath);
				
				if (componentFiles.length === 0) {
					vscode.window.showInformationMessage('No React component files found.');
					return [];
				}
				
				progress.report({ message: `Analyzing ${componentFiles.length} component files...` });
				
				// Analyze each component
				const components: ComponentInfo[] = [];
				
				for (let i = 0; i < componentFiles.length; i++) {
					progress.report({ 
						message: `Analyzing component (${i + 1}/${componentFiles.length})`,
						increment: (100 / componentFiles.length)
					});
					
					const componentInfo = await reactAnalyzer.analyzeComponent(componentFiles[i]);
					if (componentInfo) {
						components.push(componentInfo);
					}
				}
				
				vscode.window.showInformationMessage(`Analysis complete: Found ${components.length} React components.`);
				return components;
			} catch (error) {
				vscode.window.showErrorMessage(`Error analyzing React components: ${error}`);
				return [];
			}
		});
	}

	// Register NX project detection command
	const detectNxCmd = vscode.commands.registerCommand('ReactBroX.detectNxProject', async () => {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Analyzing NX Project...",
			cancellable: false
		}, async (progress) => {
			try {
				const isNx = await nxAnalyzer.isNxWorkspace();
				
				if (!isNx) {
					vscode.window.showInformationMessage('No NX project detected.');
					return;
				}
				
				progress.report({ message: "Analyzing project dependencies..." });
				
				// Get project list and dependencies
				const projects = await nxAnalyzer.getProjects();
				const dependencies = await nxAnalyzer.getDependencies();
				
				// Create dependency graph nodes and edges
				const nodes = Array.from(projects.values()).map(project => ({
					id: project.name,
					label: project.name,
					title: `${project.name}<br>${project.root}`,
					type: project.projectType,
					path: project.root
				}));
				
				const edges = dependencies.map(dep => ({
					from: dep.sourceProject,
					to: dep.targetProject,
					title: `${dep.sourceProject} → ${dep.targetProject}`
				}));
				
				// Update dependency graph in webview
				dependencyGraphProvider.updateDependencyGraph(nodes, edges);
				
				vscode.window.showInformationMessage(`NX project analysis complete: Found ${projects.size} projects.`);
			} catch (error) {
				vscode.window.showErrorMessage(`Error analyzing NX project: ${error}`);
			}
		});
	});

	// Register React component integrated analysis (main command)
	const analyzeComponentsCmd = vscode.commands.registerCommand('ReactBroX.analyzeComponents', async () => {
		// Select project (for multi-project NX workspaces)
		let projectPath = '';
		
		const isNx = await nxAnalyzer.isNxWorkspace();
		if (isNx) {
			const projects = await nxAnalyzer.getProjects();
			if (projects.size > 0) {
				const projectOptions = Array.from(projects.values()).map(p => ({
					label: p.name,
					description: p.root,
					path: p.sourceRoot
				}));
				
				const selected = await vscode.window.showQuickPick(projectOptions, {
					placeHolder: 'Select a project to analyze',
					ignoreFocusOut: true
				});
				
				if (!selected) {
					return; // Canceled
				}
				
				projectPath = selected.path;
			}
		}
		
		// Analyze components
		analyzedComponents = await analyzeReactComponents(projectPath);
		
		// Update component information in webview
		componentDetailsProvider.updateContent(analyzedComponents);
		
		// Select result utilization method
		if (analyzedComponents.length > 0) {
			const options = [
				{ label: 'View in Web Browser', description: 'Interact with results in a web browser', id: 'server' },
				{ label: 'Export as HTML', description: 'Export results as an HTML file', id: 'html' },
				{ label: 'Export as JSON', description: 'Export results as a JSON file for other tools', id: 'json' },
				{ label: 'Export as Markdown', description: 'Export results as a Markdown document', id: 'md' }
			];
			
			const selected = await vscode.window.showQuickPick(options, {
				placeHolder: 'How would you like to use the analysis results?',
				ignoreFocusOut: true
			});
			
			if (selected) {
				switch (selected.id) {
					case 'server':
						await startComponentServer(projectPath);
						break;
					case 'html':
						await exportToHtml();
						break;
					case 'json':
						await exportToJson();
						break;
					case 'md':
						await exportToMarkdown();
						break;
				}
			}
		}
	});

	/**
	 * Starts the component server
	 */
	async function startComponentServer(projectPath: string): Promise<void> {
		try {
			// Stop existing server if running
			if (componentServer) {
				await componentServer.stop();
			}
			
			// Create and start server instance
			componentServer = new ComponentServer(context.extensionUri.fsPath);
			
			// Define analysis callback function
			const refreshCallback = async () => {
				const components = await analyzeReactComponents(projectPath);
				analyzedComponents = components;
				return components;
			};
			
			const serverUrl = await componentServer.start(analyzedComponents, refreshCallback);
			
			// Open server URL in browser
			vscode.env.openExternal(vscode.Uri.parse(serverUrl));
			
			vscode.window.showInformationMessage(`Component server started: ${serverUrl}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Error starting component server: ${error}`);
		}
	}

	// Register component server start command
	const startServerCmd = vscode.commands.registerCommand('ReactBroX.startComponentServer', async () => {
		if (analyzedComponents.length === 0) {
			vscode.window.showWarningMessage('Please run component analysis before starting the server.');
			return;
		}
		
		// Check NX project and select project path
		let projectPath = '';
		const isNx = await nxAnalyzer.isNxWorkspace();
		if (isNx) {
			const projects = await nxAnalyzer.getProjects();
			if (projects.size > 0) {
				const projectOptions = Array.from(projects.values()).map(p => ({
					label: p.name,
					description: p.root,
					path: p.sourceRoot
				}));
				
				const selected = await vscode.window.showQuickPick(projectOptions, {
					placeHolder: 'Select a project to analyze in the server',
					ignoreFocusOut: true
				});
				
				if (!selected) {
					return; // Canceled
				}
				
				projectPath = selected.path;
			}
		}
		
		await startComponentServer(projectPath);
	});

	// Register component server stop command
	const stopServerCmd = vscode.commands.registerCommand('ReactBroX.stopComponentServer', async () => {
		if (!componentServer) {
			vscode.window.showInformationMessage('No component server is currently running.');
			return;
		}
		
		try {
			await componentServer.stop();
			componentServer = null;
			vscode.window.showInformationMessage('Component server has been stopped.');
		} catch (error) {
			vscode.window.showErrorMessage(`Error stopping component server: ${error}`);
		}
	});

	/**
	 * Exports analysis results as HTML
	 */
	async function exportToHtml(): Promise<void> {
		try {
			if (analyzedComponents.length === 0) {
				vscode.window.showWarningMessage('No component analysis results to export. Please run component analysis first.');
				return;
			}
			
			const result = await ComponentExporter.exportToHtml(analyzedComponents, workspaceRoot);
			vscode.window.showInformationMessage(result);
			
			// Confirm opening the file
			const openAction = await vscode.window.showInformationMessage('Would you like to open the HTML file in your browser?', 'Open', 'Cancel');
			if (openAction === 'Open') {
				// Extract file path from result
				const filePath = result.split('Component analysis results have been saved to ')[0];
				vscode.env.openExternal(vscode.Uri.file(filePath));
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error exporting to HTML: ${error}`);
		}
	}

	/**
	 * Exports analysis results as JSON
	 */
	async function exportToJson(): Promise<void> {
		try {
			if (analyzedComponents.length === 0) {
				vscode.window.showWarningMessage('No component analysis results to export. Please run component analysis first.');
				return;
			}
			
			const result = await ComponentExporter.exportToJson(analyzedComponents, workspaceRoot);
			vscode.window.showInformationMessage(result);
		} catch (error) {
			vscode.window.showErrorMessage(`Error exporting to JSON: ${error}`);
		}
	}

	/**
	 * Exports analysis results as Markdown
	 */
	async function exportToMarkdown(): Promise<void> {
		try {
			if (analyzedComponents.length === 0) {
				vscode.window.showWarningMessage('No component analysis results to export. Please run component analysis first.');
				return;
			}
			
			const result = await ComponentExporter.exportToMarkdown(analyzedComponents, workspaceRoot);
			vscode.window.showInformationMessage(result);
			
			// Confirm opening the file
			const openAction = await vscode.window.showInformationMessage('Would you like to open the Markdown file in VS Code?', 'Open', 'Cancel');
			if (openAction === 'Open') {
				// Extract file path from result
				const filePath = result.split('Component analysis results have been saved to ')[0];
				const uri = vscode.Uri.file(filePath);
				vscode.window.showTextDocument(uri);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Error exporting to Markdown: ${error}`);
		}
	}

	// Register HTML export command
	const exportHtmlCmd = vscode.commands.registerCommand('ReactBroX.exportToHtml', exportToHtml);

	// Register JSON export command
	const exportJsonCmd = vscode.commands.registerCommand('ReactBroX.exportToJson', exportToJson);

	// Register Markdown export command
	const exportMarkdownCmd = vscode.commands.registerCommand('ReactBroX.exportToMarkdown', exportToMarkdown);

	// Register Hello World command (template)
	const helloWorldCmd = vscode.commands.registerCommand('ReactBroX.helloWorld', () => {
		vscode.window.showInformationMessage('ReactBroX: NX and React Component Analyzer');
	});

	// Add all commands to context
	context.subscriptions.push(detectNxCmd);
	context.subscriptions.push(analyzeComponentsCmd);
	context.subscriptions.push(startServerCmd);
	context.subscriptions.push(stopServerCmd);
	context.subscriptions.push(exportHtmlCmd);
	context.subscriptions.push(exportJsonCmd);
	context.subscriptions.push(exportMarkdownCmd);
	context.subscriptions.push(helloWorldCmd);

	// Register deactivation event handler
	context.subscriptions.push({
		dispose: async () => {
			// Stop server
			if (componentServer) {
				try {
					await componentServer.stop();
					componentServer = null;
				} catch (error) {
					console.error('Error stopping server:', error);
				}
			}
		}
	});
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Stop server
	if (componentServer) {
		componentServer.stop().catch(error => {
			console.error('Error stopping server:', error);
		});
	}
}
