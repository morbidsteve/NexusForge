# NexusForge

NexusForge is a powerful tool for managing and visualizing GitLab CI/CD artifacts. It provides an intuitive way to set up artifact directories, process artifact data, and generate interactive HTML reports for easy review and analysis.

## Features

- 🏗️ Artifact directory setup script
- 🔍 Artifact processing and visualization
- 📊 Interactive HTML report generation
- 🌓 Dark mode support
- 💾 Local comment saving

## Prerequisites

- Node.js (v14 or later)
- Git

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/nexusforge.git
   cd nexusforge
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Setting up an Artifact Directory

To create a new artifact directory structure:

```bash
node setup_artifact_directory.js <project-name>
```

This will create a new directory with the given project name and populate it with blank artifact files.

### Processing Artifacts and Generating a Report

To process existing artifacts and generate an HTML report:

```bash
node process_local_artifacts.js <path-to-artifact-directory>
```

This will create an HTML report in the `processed_artifacts` directory.

## Report Structure

The generated HTML report includes:

- Collapsible sections for each artifact group
- Individual artifact viewers with syntax highlighting
- Dark mode toggle
- Comment sections for each artifact and group
- Local storage for saving comments

## Reviewing Artifacts

1. Open the generated HTML file in a web browser.
2. Use the collapsible sections to navigate through different artifact groups.
3. Click on individual artifacts to view their contents.
4. Toggle dark mode for comfortable viewing in different lighting conditions.
5. Add comments to artifacts or groups as needed.
6. Use the "Save All Comments" button to persist your notes locally.

## Customization

You can customize the artifact types and structure by modifying the `artifactTypes` object in `setup_artifact_directory.js`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
