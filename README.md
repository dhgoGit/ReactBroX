# ReactBroX - React & NX Project Analyzer

ReactBroX is a VS Code extension designed to analyze and visualize React components within NX projects. It helps developers better understand project structure and component relationships by extracting and presenting information about hooks, state, context, and props used in React components.

## Key Features

### NX Project Analysis
- Detection and analysis of NX project structure
- Visualization of project dependencies as an interactive graph
- Analysis of inter-module relationships

### React Component Analysis
- Detection and analysis of React Hooks usage in components
- Extraction and visualization of state information
- Context API usage detection
- Props interface analysis
- Store usage detection (Redux, Recoil, MobX, etc.)

### Multiple Viewing Options
- Integrated VS Code panel view
- Interactive web browser view through local server
- Export options to HTML, JSON, and Markdown formats

## Getting Started

### Installation
1. Search for "ReactBroX" in the VS Code Marketplace
2. Click the "Install" button

### Usage
1. **Analyze NX Project Dependencies**
   - Open the command palette (Ctrl+Shift+P or Cmd+Shift+P) and run "ReactBroX: Detect NX Project"
   - Or click the ReactBroX icon in the activity bar and select the "NX Dependency Graph" tab

2. **Analyze React Components**
   - Run "ReactBroX: Analyze React Components" from the command palette
   - Select your preferred viewing option:
     - View in VS Code panel
     - View in web browser (starts local server)
     - Export as HTML/JSON/Markdown

3. **View Results in Browser**
   - After analysis, select "View in Web Browser" to open an interactive visualization
   - Use the search function to find specific components
   - Click on any component to view its detailed structure

4. **Export Analysis Results**
   - Use the export commands to save analysis results in different formats
   - HTML format provides interactive visualization
   - JSON format can be used with other tools
   - Markdown format is ideal for documentation

## Requirements
- VS Code 1.99.0 or higher
- NX project (optional, component analysis works with any React project)

## Known Issues
- Props analysis works most accurately with TypeScript components
- Detection of dynamically created contexts may be limited
- Some complex component structures might not be fully analyzed

## Release Notes

### 1.0.0
- Initial release
- NX project analysis
- React component analysis
- Component visualization in VS Code and browser
- Export functionality (HTML, JSON, Markdown)

## Contributing
Please report bugs or feature requests through the VS Code Marketplace listing.

## License
MIT

## Developer Information
- Name: dhgo

## Acknowledgements
This extension uses the following open-source libraries:
- @babel/parser for React component analysis
- vis-network for dependency visualization
- react-docgen-typescript for props extraction
