// Access VS Code API
const vscode = acquireVsCodeApi();

// Graph container element
const graphContainer = document.getElementById('dependency-graph');

// Message event listener
window.addEventListener('message', event => {
    const message = event.data;
    
    switch (message.command) {
        case 'updateGraph':
            // Render chart with dependency graph data
            renderDependencyGraph(message.data.nodes, message.data.edges);
            break;
    }
});

function renderDependencyGraph(nodes, edges) {
    graphContainer.innerHTML = '';
    
    if (!nodes || nodes.length === 0) {
        graphContainer.innerHTML = `
            <div class="placeholder">
                No project dependencies found. Please run dependency analysis.
            </div>
        `;
        return;
    }
    
    // Create vis-network dataset
    const nodesDataset = new vis.DataSet(nodes.map(node => ({
        id: node.id,
        label: node.label,
        title: node.title || node.label,
        group: node.type || 'default'
    })));
    
    const edgesDataset = new vis.DataSet(edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        arrows: 'to',
        title: edge.title || `${edge.from} → ${edge.to}`,
    })));
    
    // Network options
    const options = {
        nodes: {
            shape: 'box',
            borderWidth: 1,
            shadow: true,
            font: {
                size: 12
            },
            margin: 10
        },
        edges: {
            width: 1,
            color: {
                color: '#848484',
                highlight: '#2B7CE9'
            },
            smooth: {
                type: 'continuous'
            }
        },
        groups: {
            application: {
                color: {
                    background: '#97C2FC',
                    border: '#2B7CE9'
                }
            },
            library: {
                color: {
                    background: '#FFA807',
                    border: '#FF6D00'
                }
            },
            default: {
                color: {
                    background: '#C5E1A5',
                    border: '#7CB342'
                }
            }
        },
        layout: {
            hierarchical: {
                direction: 'UD',
                sortMethod: 'directed',
                levelSeparation: 150,
                nodeSpacing: 120
            }
        },
        physics: {
            hierarchicalRepulsion: {
                nodeDistance: 120
            },
            solver: 'hierarchicalRepulsion'
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            navigationButtons: true,
            keyboard: true
        }
    };
    
    // Create network
    const network = new vis.Network(graphContainer, {
        nodes: nodesDataset,
        edges: edgesDataset
    }, options);
    
    // Node click event handler
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = nodes.find(n => n.id === nodeId);
            
            if (node && node.path) {
                vscode.postMessage({
                    command: 'openFile',
                    filePath: node.path
                });
            }
        }
    });
}