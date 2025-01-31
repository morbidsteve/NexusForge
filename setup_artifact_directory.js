import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactTypes = {
    'pre-build-scan': [
        'container-spec.txt',
        'hadolint.txt',
        'semgrep.txt',
        'trufflehog.txt'
    ],
    'build': [
        'build-container.txt',
        'build-container-report.txt'
    ],
    'post-build-scan': [
        'clamav.txt',
        'stig-check.txt',
        'syft-grype.txt',
        'threat-assessment.txt',
        'web-scan.txt'
    ],
    'clean': [
        'clean-container.txt'
    ],
    'review': [
        'review.txt'
    ]
};

async function setupArtifactDirectory(projectName) {
    try {
        // Create base directory
        const baseDir = path.join(__dirname, projectName);
        await fs.mkdir(baseDir, { recursive: true });
        console.log(`Created directory: ${baseDir}`);

        // Create all artifact files
        for (const [phase, artifacts] of Object.entries(artifactTypes)) {
            console.log(`\nSetting up ${phase} artifacts:`);
            for (const artifact of artifacts) {
                const filePath = path.join(baseDir, artifact);
                try {
                    // Check if file exists
                    await fs.access(filePath);
                    console.log(`  ⚠️  ${artifact} already exists, skipping`);
                } catch {
                    // File doesn't exist, create it
                    await fs.writeFile(filePath, '');
                    console.log(`  ✅ Created ${artifact}`);
                }
            }
        }

        console.log('\n✨ Setup complete! Directory structure:');
        const files = await fs.readdir(baseDir);
        console.log('\n' + projectName + '/');
        for (const file of files.sort()) {
            console.log(`  └─ ${file}`);
        }

    } catch (error) {
        console.error('Error setting up artifact directory:', error);
        process.exit(1);
    }
}

// Get project name from command line argument
const projectName = process.argv[2];

if (!projectName) {
    console.error('Please provide a project name.');
    console.log('Usage: node setup_artifact_directory.js <project-name>');
    process.exit(1);
}

setupArtifactDirectory(projectName);