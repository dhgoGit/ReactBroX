import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface DependencyInfo {
    sourceProject: string;
    targetProject: string;
}

export interface ProjectInfo {
    name: string;
    root: string;
    sourceRoot: string;
    projectType: string;
}

export class NxProjectAnalyzer {
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    /**
     * Checks if the workspace is an NX project.
     */
    public async isNxWorkspace(): Promise<boolean> {
        try {
            const nxJsonPath = path.join(this.workspaceRoot, 'nx.json');
            return fs.existsSync(nxJsonPath);
        } catch (error) {
            console.error('Error checking NX workspace:', error);
            return false;
        }
    }

    /**
     * Retrieves project information from the workspace.
     */
    public async getProjects(): Promise<Map<string, ProjectInfo>> {
        try {
            const projectsMap = new Map<string, ProjectInfo>();
            
            // Check workspace.json or angular.json file
            let workspaceConfig: any = null;
            const workspaceJsonPath = path.join(this.workspaceRoot, 'workspace.json');
            const angularJsonPath = path.join(this.workspaceRoot, 'angular.json');
            
            if (fs.existsSync(workspaceJsonPath)) {
                const content = fs.readFileSync(workspaceJsonPath, 'utf8');
                workspaceConfig = JSON.parse(content);
            } else if (fs.existsSync(angularJsonPath)) {
                const content = fs.readFileSync(angularJsonPath, 'utf8');
                workspaceConfig = JSON.parse(content);
            }
            
            // Collect project information
            if (workspaceConfig && workspaceConfig.projects) {
                for (const [name, config] of Object.entries<any>(workspaceConfig.projects)) {
                    projectsMap.set(name, {
                        name,
                        root: config.root,
                        sourceRoot: config.sourceRoot || config.root,
                        projectType: config.projectType || 'application'
                    });
                }
            }
            
            return projectsMap;
        } catch (error) {
            console.error('Error retrieving project information:', error);
            return new Map();
        }
    }

    /**
     * Retrieves dependency information between projects.
     */
    public async getDependencies(): Promise<DependencyInfo[]> {
        try {
            const dependencies: DependencyInfo[] = [];
            const projects = await this.getProjects();
            
            // Analyze package.json of each project to extract dependencies
            for (const [projectName, projectInfo] of projects.entries()) {
                const packageJsonPath = path.join(this.workspaceRoot, projectInfo.root, 'package.json');
                
                if (fs.existsSync(packageJsonPath)) {
                    const content = fs.readFileSync(packageJsonPath, 'utf8');
                    const packageJson = JSON.parse(content);
                    
                    // Check dependencies
                    const allDependencies = {
                        ...packageJson.dependencies,
                        ...packageJson.devDependencies
                    };
                    
                    // Add inter-project dependencies
                    for (const [depName, depVersion] of Object.entries<string>(allDependencies)) {
                        if (projects.has(depName)) {
                            dependencies.push({
                                sourceProject: projectName,
                                targetProject: depName
                            });
                        }
                    }
                }
            }
            
            return dependencies;
        } catch (error) {
            console.error('Error retrieving dependency information:', error);
            return [];
        }
    }
} 