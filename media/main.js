// Access VS Code API
const vscode = acquireVsCodeApi();

// Component list and details DOM elements
const componentListElement = document.getElementById('component-list');
const componentDetailsElement = document.getElementById('component-details');

// Component data store
let components = [];

// Message event listener
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
        case 'updateComponents':
            // Update with new component data
            components = message.components;
            renderComponentList();
            break;
    }
});

/**
 * Render component list
 */
function renderComponentList() {
    // Initialize component list
    componentListElement.innerHTML = '';
    
    if (components.length === 0) {
        componentListElement.innerHTML = `
            <div class="placeholder">
                No components found. Please run component analysis.
            </div>
        `;
        return;
    }
    
    // Render each component
    components.forEach((component, index) => {
        const componentItem = document.createElement('div');
        componentItem.className = 'component-item';
        componentItem.dataset.index = index;
        componentItem.innerHTML = `
            <h3>${component.name}</h3>
            <div class="path">${component.filePath}</div>
        `;
        
        // Click event listener - display component details
        componentItem.addEventListener('click', () => {
            // Show currently selected item
            document.querySelectorAll('.component-item').forEach(item => {
                item.classList.remove('selected');
            });
            componentItem.classList.add('selected');
            
            // Display component details
            renderComponentDetails(component);
            
            // Save state
            vscode.setState({ selectedIndex: index });
        });
        
        componentListElement.appendChild(componentItem);
    });
    
    // Select first item
    const firstItem = componentListElement.querySelector('.component-item');
    if (firstItem) {
        firstItem.click();
    }
}

/**
 * Render component details
 */
function renderComponentDetails(component) {
    if (!component) {
        componentDetailsElement.innerHTML = '<div class="placeholder">Please select a component.</div>';
        return;
    }
    
    let detailsHtml = `
        <h2>${component.name}</h2>
        <div class="file-path">
            <a href="#" onclick="openComponentFile('${component.filePath}')">
                ${component.filePath}
            </a>
        </div>
    `;
    
    // Add component description
    if (component.description) {
        detailsHtml += `<div class="description">${component.description}</div>`;
    }
    
    // Hooks list
    if (component.hooks && component.hooks.length > 0) {
        detailsHtml += `
            <div class="hook-list">
                <div class="section-title">React Hooks (${component.hooks.length})</div>
                <div>
                    ${component.hooks.map(hook => `<div class="item">${hook}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    // States list
    if (component.states && component.states.length > 0) {
        detailsHtml += `
            <div class="state-list">
                <div class="section-title">States (${component.states.length})</div>
                <div>
                    ${component.states.map(state => `
                        <div class="item">
                            <strong>${state.name}</strong> 
                            ${state.initialValue ? `= <code>${state.initialValue}</code>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Contexts list
    if (component.contexts && component.contexts.length > 0) {
        detailsHtml += `
            <div class="context-list">
                <div class="section-title">Contexts (${component.contexts.length})</div>
                <div>
                    ${component.contexts.map(context => `<div class="item">${context}</div>`).join('')}
                </div>
            </div>
        `;
    }
    
    // Props list
    if (component.props && component.props.length > 0) {
        detailsHtml += `
            <div class="props-list">
                <div class="section-title">Props (${component.props.length})</div>
                <div>
                    ${component.props.map(prop => `
                        <div class="item">
                            <strong>${prop.name}</strong>
                            <span class="badge ${prop.required ? 'required' : ''}">${prop.type}</span>
                            ${prop.required ? '<span class="badge required">Required</span>' : ''}
                            ${prop.defaultValue ? `<span>Default: ${prop.defaultValue}</span>` : ''}
                            ${prop.description ? `<div class="description">${prop.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    componentDetailsElement.innerHTML = detailsHtml;
}

/**
 * Open component file
 */
function openComponentFile(filePath) {
    vscode.postMessage({
        command: 'openFile',
        filePath
    });
}