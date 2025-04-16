import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import { ComponentInfo } from './ReactComponentAnalyzer';

/**
 * Server class that provides web access to React component analysis results
 */
export class ComponentServer {
    private server: http.Server;
    private port: number = 3000;
    private isRunning: boolean = false;
    private components: ComponentInfo[] = [];
    private extensionPath: string;
    private refreshCallback?: () => Promise<ComponentInfo[]>;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.server = http.createServer(this.requestHandler.bind(this));
    }

    /**
     * 서버를 시작합니다.
     */
    public async start(initialComponents: ComponentInfo[], refreshCallback?: () => Promise<ComponentInfo[]>): Promise<string> {
        if (this.isRunning) {
            return `서버가 이미 실행 중입니다: http://localhost:${this.port}`;
        }

        this.components = initialComponents;
        this.refreshCallback = refreshCallback;

        // 사용 가능한 포트 찾기
        this.port = await this.findAvailablePort(3000, 3100);

        return new Promise((resolve, reject) => {
            this.server.listen(this.port, () => {
                this.isRunning = true;
                console.log(`Component server is running on port ${this.port}`);
                resolve(`http://localhost:${this.port}`);
            }).on('error', (err) => {
                console.error('서버 시작 오류:', err);
                reject(`서버 시작 오류: ${err.message}`);
            });
        });
    }

    /**
     * 서버를 중지합니다.
     */
    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isRunning) {
                resolve();
                return;
            }

            this.server.close((err) => {
                if (err) {
                    console.error('Server shutdown error:', err);
                    reject(err);
                    return;
                }
                this.isRunning = false;
                console.log('Component server has been shut down.');
                resolve();
            });
        });
    }

    /**
     * 컴포넌트 데이터를 업데이트합니다.
     */
    public updateComponents(components: ComponentInfo[]): void {
        this.components = components;
    }

    /**
     * HTTP 요청 핸들러
     */
    private requestHandler(req: http.IncomingMessage, res: http.ServerResponse): void {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';

        // CORS 헤더 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // OPTIONS 요청 처리 (CORS 프리플라이트)
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // API 엔드포인트 처리
        if (pathname === '/api/components') {
            this.handleComponentsAPI(req, res);
            return;
        }

        // 컴포넌트 분석 요청
        if (pathname === '/api/analyze' && req.method === 'POST') {
            this.handleAnalyzeRequest(req, res);
            return;
        }

        // 정적 파일 제공
        if (pathname === '/' || pathname === '/index.html') {
            this.serveHtmlPage(res);
            return;
        }

        // CSS 및 JavaScript 파일 처리
        if (pathname.endsWith('.css')) {
            this.serveStaticFile(res, pathname, 'text/css');
            return;
        }

        if (pathname.endsWith('.js')) {
            this.serveStaticFile(res, pathname, 'text/javascript');
            return;
        }

        // 404 응답
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }

    /**
     * 컴포넌트 API 핸들러
     */
    private handleComponentsAPI(req: http.IncomingMessage, res: http.ServerResponse): void {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            components: this.components,
            timestamp: new Date().toISOString()
        }));
    }

    /**
     * 컴포넌트 분석 요청 핸들러
     */
    private async handleAnalyzeRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        if (!this.refreshCallback) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '분석 기능이 설정되지 않았습니다.' }));
            return;
        }

        try {
            // 분석 실행
            const updatedComponents = await this.refreshCallback();
            this.components = updatedComponents;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                count: updatedComponents.length,
                timestamp: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Analysis request processing error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Error occurred during analysis: ${error}` }));
        }
    }

    /**
     * HTML 페이지 제공
     */
    private serveHtmlPage(res: http.ServerResponse): void {
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>React Component Analyzer</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.5;
                    margin: 0;
                    padding: 0;
                    background-color: #f5f5f5;
                    color: #333;
                }
                .header {
                    background-color: #1976d2;
                    color: white;
                    padding: 1rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header h1 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                .controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid #e0e0e0;
                    background-color: white;
                }
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 1rem;
                }
                .component-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .component-item {
                    background-color: white;
                    border-radius: 4px;
                    padding: 1rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    width: calc(33.333% - 1rem);
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .component-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .component-item h3 {
                    margin-top: 0;
                    color: #1976d2;
                }
                .component-detail {
                    background-color: white;
                    border-radius: 4px;
                    padding: 1rem;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    margin-bottom: 1rem;
                }
                .analyze-btn {
                    background-color: #1976d2;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                .analyze-btn:hover {
                    background-color: #1565c0;
                }
                .analyze-btn:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
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
                .info-text {
                    font-style: italic;
                    color: #757575;
                }
                .timestamp {
                    font-size: 0.8rem;
                    color: #757575;
                    margin-bottom: 1rem;
                }
                .loading {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100px;
                }
                .loading::after {
                    content: '';
                    width: 30px;
                    height: 30px;
                    border: 3px solid #ddd;
                    border-top-color: #1976d2;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                /* Component detail styles */
                .section {
                    margin-bottom: 1rem;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 1rem;
                }
                .section-title {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #1976d2;
                }
                .item {
                    background-color: #f8f8f8;
                    padding: 0.5rem;
                    border-radius: 4px;
                    margin-bottom: 0.5rem;
                }
                .label {
                    font-weight: 600;
                    display: inline-block;
                    min-width: 80px;
                }
                .value {
                    font-family: monospace;
                    background-color: #eee;
                    padding: 2px 4px;
                    border-radius: 2px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>React Component Analyzer</h1>
            </div>
            <div class="controls">
                <div>
                    <button id="analyzeBtn" class="analyze-btn">Analyze Components</button>
                    <span id="statusText" class="info-text">Loading...</span>
                </div>
                <div>
                    <input type="text" id="searchInput" placeholder="Search components..." />
                </div>
            </div>
            <div class="container">
                <div id="timestamp" class="timestamp"></div>
                <div id="componentList" class="component-list">
                    <div class="loading"></div>
                </div>
                <div id="componentDetail" class="component-detail" style="display: none;"></div>
            </div>

            <script>
                // Global variables
                let components = [];
                let selectedComponent = null;
                
                // DOM elements
                const analyzeBtn = document.getElementById('analyzeBtn');
                const statusText = document.getElementById('statusText');
                const timestampEl = document.getElementById('timestamp');
                const componentListEl = document.getElementById('componentList');
                const componentDetailEl = document.getElementById('componentDetail');
                const searchInput = document.getElementById('searchInput');
                
                // Load initial data
                loadComponents();
                
                // Event listeners
                analyzeBtn.addEventListener('click', analyzeComponents);
                searchInput.addEventListener('input', filterComponents);
                
                // Load component data
                async function loadComponents() {
                    try {
                        const response = await fetch('/api/components');
                        const data = await response.json();
                        
                        components = data.components;
                        
                        timestampEl.textContent = \`Last updated: \${new Date(data.timestamp).toLocaleString()}\`;
                        renderComponentList();
                        
                        statusText.textContent = \`\${components.length} components loaded\`;
                    } catch (error) {
                        console.error('Error loading components:', error);
                        statusText.textContent = 'Failed to load components';
                        componentListEl.innerHTML = '<p>An error occurred while loading data.</p>';
                    }
                }
                
                // Execute component analysis
                async function analyzeComponents() {
                    try {
                        analyzeBtn.disabled = true;
                        statusText.textContent = 'Analyzing...';
                        componentListEl.innerHTML = '<div class="loading"></div>';
                        
                        const response = await fetch('/api/analyze', {
                            method: 'POST'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            statusText.textContent = \`Analysis complete: \${data.count} components found\`;
                            loadComponents(); // Reload updated component list
                        } else {
                            throw new Error(data.error || 'Unknown error');
                        }
                    } catch (error) {
                        console.error('Analysis error:', error);
                        statusText.textContent = \`Analysis failed: \${error.message}\`;
                    } finally {
                        analyzeBtn.disabled = false;
                    }
                }
                
                // Render component list
                function renderComponentList() {
                    if (components.length === 0) {
                        componentListEl.innerHTML = '<p>No components have been analyzed.</p>';
                        return;
                    }
                    
                    const searchTerm = searchInput.value.toLowerCase();
                    const filteredComponents = searchTerm 
                        ? components.filter(c => c.name.toLowerCase().includes(searchTerm) || c.filePath.toLowerCase().includes(searchTerm))
                        : components;
                    
                    componentListEl.innerHTML = filteredComponents.map(comp => \`
                        <div class="component-item" data-id="\${comp.filePath}" onclick="showComponentDetail('\${comp.filePath}')">
                            <h3>\${comp.name}</h3>
                            <div>\${comp.filePath}</div>
                            <div>
                                \${comp.props.length > 0 ? \`<span class="badge badge-prop">Props: \${comp.props.length}</span>\` : ''}
                                \${comp.states.length > 0 ? \`<span class="badge badge-state">State: \${comp.states.length}</span>\` : ''}
                                \${comp.hooks.length > 0 ? \`<span class="badge badge-hook">Hooks: \${comp.hooks.length}</span>\` : ''}
                                \${comp.contexts.length > 0 ? \`<span class="badge badge-context">Context: \${comp.contexts.length}</span>\` : ''}
                            </div>
                        </div>
                    \`).join('');
                    
                    if (filteredComponents.length === 0) {
                        componentListEl.innerHTML = '<p>No search results found.</p>';
                    }
                }
                
                // Show component detail
                function showComponentDetail(filePath) {
                    const component = components.find(c => c.filePath === filePath);
                    if (!component) return;
                    
                    selectedComponent = component;
                    
                    // Generate detail HTML
                    let html = \`
                        <h2>\${component.name}</h2>
                        <p>\${component.filePath}</p>
                        \${component.description ? \`<p>\${component.description}</p>\` : ''}
                    \`;
                    
                    // Props section
                    if (component.props.length > 0) {
                        html += \`
                            <div class="section">
                                <div class="section-title">Props (\${component.props.length})</div>
                                \${component.props.map(prop => \`
                                    <div class="item">
                                        <div>
                                            <span class="label">\${prop.name}</span>
                                            <span class="badge \${prop.required ? 'badge-required' : 'badge-optional'}">\${prop.required ? 'Required' : 'Optional'}</span>
                                        </div>
                                        <div>
                                            <span class="label">Type:</span>
                                            <span class="value">\${prop.type || 'Unknown'}</span>
                                        </div>
                                        \${prop.defaultValue ? \`
                                            <div>
                                                <span class="label">Default:</span>
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
                    
                    // States section
                    if (component.states.length > 0) {
                        html += \`
                            <div class="section">
                                <div class="section-title">States (\${component.states.length})</div>
                                \${component.states.map(state => \`
                                    <div class="item">
                                        <div>
                                            <span class="label">\${state.name}</span>
                                            <span class="badge badge-state">state</span>
                                        </div>
                                        <div>
                                            <span class="label">Setter:</span>
                                            <span class="value">\${state.setter}</span>
                                        </div>
                                        \${state.initialValue ? \`
                                            <div>
                                                <span class="label">Initial value:</span>
                                                <span class="value">\${state.initialValue}</span>
                                            </div>
                                        \` : ''}
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    }
                    
                    // Hooks section
                    if (component.hooks.length > 0) {
                        html += \`
                            <div class="section">
                                <div class="section-title">Hooks (\${component.hooks.length})</div>
                                \${component.hooks.map(hook => \`
                                    <div class="item">
                                        <div>
                                            <span class="label">\${hook.name}</span>
                                            <span class="badge badge-hook">hook</span>
                                        </div>
                                        <div>
                                            <span class="label">Location:</span>
                                            <span>\${hook.callLocation.line}:\${hook.callLocation.column}</span>
                                        </div>
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
                    
                    // Contexts section
                    if (component.contexts.length > 0) {
                        html += \`
                            <div class="section">
                                <div class="section-title">Contexts (\${component.contexts.length})</div>
                                \${component.contexts.map(context => \`
                                    <div class="item">
                                        <div>
                                            <span class="label">\${context.name}</span>
                                            <span class="badge badge-context">context</span>
                                        </div>
                                        \${context.type ? \`
                                            <div>
                                                <span class="label">Type:</span>
                                                <span class="value">\${context.type}</span>
                                            </div>
                                        \` : ''}
                                    </div>
                                \`).join('')}
                            </div>
                        \`;
                    }
                    
                    // State management section
                    if (component.storeUsage && component.storeUsage.length > 0) {
                        html += \`
                            <div class="section">
                                <div class="section-title">State Management (\${component.storeUsage.length})</div>
                                \${component.storeUsage.map(store => \`
                                    <div class="item">
                                        <div>
                                            <span class="label">\${getStoreTypeName(store.type)}</span>
                                            <span class="badge badge-prop">\${store.type}</span>
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
                    
                    componentDetailEl.innerHTML = html;
                    componentDetailEl.style.display = 'block';
                    
                    // Scroll to component detail
                    componentDetailEl.scrollIntoView({ behavior: 'smooth' });
                }
                
                // State management library name conversion
                function getStoreTypeName(type) {
                    const storeNames = {
                        'redux': 'Redux',
                        'mobx': 'MobX',
                        'recoil': 'Recoil',
                        'zustand': 'Zustand',
                        'jotai': 'Jotai'
                    };
                    return storeNames[type] || type;
                }
                
                // Component search/filtering
                function filterComponents() {
                    renderComponentList();
                }
                
                // Expose component detail function globally
                window.showComponentDetail = showComponentDetail;
            </script>
        </body>
        </html>
        `;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    /**
     * 정적 파일 제공
     */
    private serveStaticFile(res: http.ServerResponse, pathname: string, contentType: string): void {
        const filePath = path.join(this.extensionPath, 'media', pathname);
        
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        } else {
            res.writeHead(404);
            res.end();
        }
    }

    /**
     * 사용 가능한 포트를 찾습니다.
     */
    private async findAvailablePort(start: number, end: number): Promise<number> {
        for (let port = start; port <= end; port++) {
            try {
                await new Promise<void>((resolve, reject) => {
                    const server = http.createServer();
                    server.listen(port, () => {
                        server.close(() => resolve());
                    });
                    server.on('error', () => { 
                        reject(); 
                    });
                });
                return port;
            } catch (e) {
                continue;
            }
        }
        throw new Error(`No available ports found in range ${start}~${end}`);
    }
} 