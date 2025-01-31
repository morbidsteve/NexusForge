import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class AnsiParser {
    constructor() {
        this.buffer = []
        this.currentLine = ""
        this.currentStyle = ""
    }

    parse(text) {
        const lines = text.split("\n")
        for (const line of lines) {
            this.parseLine(line)
        }
        if (this.currentLine) {
            this.buffer.push(this.wrapWithStyle(this.currentLine))
        }
        return this.buffer.join("\n")
    }

    parseLine(line) {
        let result = ""
        let i = 0
        while (i < line.length) {
            if (line[i] === "\u001b" && line[i + 1] === "[") {
                let j = i + 2
                while (j < line.length && !"ABCDEFGHJKSTfmnsulh".includes(line[j])) j++
                const code = line.substring(i + 2, j + 1)
                i = j + 1
                this.handleEscapeCode(code)
            } else {
                result += line[i]
                i++
            }
        }
        if (result) {
            this.currentLine += result
        }
        if (this.currentLine) {
            this.buffer.push(this.wrapWithStyle(this.currentLine))
            this.currentLine = ""
        } else {
            this.buffer.push("")
        }
    }

    handleEscapeCode(code) {
        if (code === "0m") {
            this.currentStyle = ""
        } else if (code === "1m") {
            this.currentStyle += "font-weight:bold;"
        } else if (code.endsWith("m")) {
            const colorCode = Number.parseInt(code)
            if (colorCode >= 30 && colorCode <= 37) {
                const colors = ["#000000", "#dc2626", "#15803d", "#854d0e", "#1e40af", "#86198f", "#0e7490", "#525252"]
                this.currentStyle += `color:${colors[colorCode - 30]};`
            } else if (colorCode >= 40 && colorCode <= 47) {
                const colors = ["#d4d4d4", "#fecaca", "#bbf7d0", "#fef08a", "#bfdbfe", "#f5d0fe", "#cffafe", "#f5f5f5"]
                this.currentStyle += `background-color:${colors[colorCode - 40]};`
            }
        } else if (["0K", "1K", "2K"].includes(code)) {
            this.currentLine = ""
        }
    }

    wrapWithStyle(text) {
        return this.currentStyle ? `<span style="${this.currentStyle}">${text}</span>` : text
    }
}

async function processArtifacts(artifactsDir) {
    const outputDir = path.join(__dirname, "processed_artifacts")
    await fs.mkdir(outputDir, { recursive: true })

    const folderName = path.basename(artifactsDir)

    const artifactGroups = {
        "pre-build-scan": ["container-spec", "hadolint", "semgrep", "trufflehog"],
        build: ["build-container", "build-container-report"],
        "post-build-scan": ["clamav", "stig-check", "syft-grype", "threat-assessment", "web-scan"],
        clean: ["clean-container"],
        review: ["review"],
    }

    const files = await fs.readdir(artifactsDir)

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${folderName} - GitLab Artifacts Report</title>
      <style>
        :root {
          --background: #ffffff;
          --foreground: #000000;
          --card: #ffffff;
          --card-foreground: #000000;
          --popover: #ffffff;
          --popover-foreground: #000000;
          --primary: #000000;
          --primary-foreground: #ffffff;
          --secondary: #f1f5f9;
          --secondary-foreground: #000000;
          --muted: #f1f5f9;
          --muted-foreground: #64748b;
          --accent: #f1f5f9;
          --accent-foreground: #000000;
          --destructive: #ff0000;
          --destructive-foreground: #ffffff;
          --border: #e2e8f0;
          --input: #e2e8f0;
          --ring: #000000;
          --radius: 0.5rem;
        }
        .dark {
          --background: #000000;
          --foreground: #ffffff;
          --card: #000000;
          --card-foreground: #ffffff;
          --popover: #000000;
          --popover-foreground: #ffffff;
          --primary: #ffffff;
          --primary-foreground: #000000;
          --secondary: #1e293b;
          --secondary-foreground: #ffffff;
          --muted: #1e293b;
          --muted-foreground: #94a3b8;
          --accent: #1e293b;
          --accent-foreground: #ffffff;
          --destructive: #7f1d1d;
          --destructive-foreground: #ffffff;
          --border: #1e293b;
          --input: #1e293b;
          --ring: #cbd5e1;
        }
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: var(--background);
          color: var(--foreground);
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        header {
          background-color: var(--card);
          padding: 20px;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        h1 {
          margin: 0;
          font-size: 24px;
        }
        .controls {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .group {
          background-color: var(--card);
          border-radius: var(--radius);
          margin-bottom: 20px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .group-header {
          background-color: var(--muted);
          padding: 15px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .group-header h2 {
          margin: 0;
          font-size: 20px;
        }
        .group-content {
          padding: 20px;
          display: none;
        }
        .artifact {
          background-color: var(--background);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          margin-bottom: 15px;
          overflow: hidden;
        }
        .artifact-header {
          background-color: var(--secondary);
          padding: 10px 15px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .artifact-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .artifact-content {
          padding: 15px;
          display: none;
        }
        .artifact-info {
          font-size: 14px;
          color: var(--muted-foreground);
          margin-bottom: 10px;
        }
        .artifact-data {
          background-color: var(--muted);
          padding: 10px;
          border-radius: var(--radius);
          max-height: 300px;
          overflow-y: auto;
          font-family: monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background-color: var(--input);
          color: var(--foreground);
          resize: vertical;
          min-height: 100px;
          margin-top: 10px;
        }
        button {
          background-color: var(--primary);
          color: var(--primary-foreground);
          border: none;
          padding: 10px 15px;
          border-radius: var(--radius);
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s ease;
        }
        button:hover {
          opacity: 0.9;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--muted);
          transition: .4s;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: var(--background);
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: var(--primary);
        }
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        .icon {
          width: 24px;
          height: 24px;
          fill: currentColor;
        }
        .status-buttons {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        .status-button {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          border: 2px solid var(--border);
          border-radius: var(--radius);
          background-color: var(--background);
          color: var(--foreground);
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 150px;
          justify-content: center;
        }
        .status-button:hover {
          background-color: var(--accent);
        }
        .status-button.active {
          border-color: currentColor;
          background-color: var(--accent);
        }
        .status-button svg {
          width: 20px;
          height: 20px;
          margin-right: 8px;
        }
        .status-button-check {
          color: #22c55e;
        }
        .status-button-error {
          color: #ef4444;
        }
        .status-none {
          border-left: 5px solid var(--muted-foreground);
        }
        .status-check {
          border-left: 5px solid #22c55e;
        }
        .status-error {
          border-left: 5px solid #ef4444;
        }
        .comments-list {
          list-style-type: none;
          padding-left: 0;
        }
        .comments-list li {
          margin-bottom: 10px;
          padding-left: 20px;
          position: relative;
        }
        .comments-list li::before {
          content: '•';
          position: absolute;
          left: 0;
          color: var(--muted-foreground);
        }
        .comments-summary {
          margin-top: 10px;
          padding: 10px;
          background-color: var(--secondary);
          border-radius: var(--radius);
        }
        .comments-summary h4 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        .comments-summary ul {
          list-style-type: none;
          padding-left: 0;
        }
        .comments-summary li {
          margin-bottom: 5px;
        }
        .comments-summary .artifact-name {
          font-weight: bold;
        }
        .comments-summary .artifact-status {
          margin-left: 5px;
          padding: 2px 5px;
          border-radius: 3px;
          font-size: 0.8em;
        }
        .comments-summary .status-none {
          background-color: var(--muted-foreground);
          color: var(--background);
        }
        .comments-summary .status-check {
          background-color: #22c55e;
          color: var(--background);
        }
        .comments-summary .status-error {
          background-color: #ef4444;
          color: var(--background);
        }
      </style>
    </head>
    <body>
      <header>
        <h1>${folderName} - GitLab Artifacts Report</h1>
        <div class="controls">
          <label class="switch">
            <input type="checkbox" id="darkModeToggle">
            <span class="slider"></span>
          </label>
          <button id="saveAllComments">
            <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save All Comments
          </button>
        </div>
      </header>
      <div class="container">
  `

    for (const [group, artifacts] of Object.entries(artifactGroups)) {
        htmlContent += `
      <div class="group">
        <div id="${group}-header" class="group-header status-none" data-group="${group}">
          <h2>${group}</h2>
          <svg class="icon chevron" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div id="${group}-content" class="group-content">
          <div id="${group}-summary" class="comments-summary">
            <h4>Summary</h4>
            <ul></ul>
          </div>
    `

        for (const artifact of artifacts) {
            const filePattern = new RegExp(`^${artifact.replace("-", "[-]?")}.*\\.txt$`, "i")
            const matchingFile = files.find((file) => filePattern.test(file))
            const exists = !!matchingFile
            const artifactPath = exists ? path.join(artifactsDir, matchingFile) : null

            htmlContent += `
        <div class="artifact">
          <div id="${artifact}-header" class="artifact-header status-none" data-artifact="${artifact}">
            <h3>${artifact}</h3>
            <svg class="icon chevron" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div id="${artifact}-content" class="artifact-content">
      `

            if (exists) {
                const stats = await fs.stat(artifactPath)
                const content = await fs.readFile(artifactPath, "utf8")
                const parser = new AnsiParser()
                const interpretedContent = parser.parse(content)

                htmlContent += `
          <div class="artifact-info">
            <p><strong>Size:</strong> ${(stats.size / 1024).toFixed(2)} KB</p>
            <p><strong>Last Modified:</strong> ${stats.mtime}</p>
          </div>
          <div class="artifact-data">${interpretedContent}</div>
        `
            } else {
                htmlContent += '<p class="missing">File not present</p>'
            }

            htmlContent += `
            <textarea id="${artifact}-comment" placeholder="Add a comment for ${artifact}..."></textarea>
            <button class="save-comment" data-id="${artifact}">Save Comment</button>
            <div class="status-buttons">
              <button class="status-button status-button-none" data-status="none" data-id="${artifact}" title="No status set">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Not Reviewed
              </button>
              <button class="status-button status-button-check" data-status="check" data-id="${artifact}" title="Mark as OK">
                <svg xmlns="http://www.w3.org/2000/20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                OK
              </button>
              <button class="status-button status-button-error" data-status="error" data-id="${artifact}" title="Mark as Needs Attention">
                <svg xmlns="http://www.w3.org/2000/20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                Needs Attention
              </button>
            </div>
          </div>
        </div>
      `
        }

        htmlContent += `
        </div>
      </div>
    `
    }

    htmlContent += `
      </div>
      <script>
        function toggleGroup(groupId) {
          const content = document.getElementById(groupId + '-content');
          const header = content.previousElementSibling;
          const chevron = header.querySelector('.chevron');
          if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
          } else {
            content.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
          }
        }

        function toggleArtifact(artifactId) {
          const content = document.getElementById(artifactId + '-content');
          const header = content.previousElementSibling;
          const chevron = header.querySelector('.chevron');
          if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
          } else {
            content.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
          }
        }

        function setStatus(id, status) {
          const buttons = document.querySelectorAll(\`[data-id="\${id}"]\`);
          buttons.forEach(button => button.classList.remove('active'));
          const activeButton = document.querySelector(\`[data-id="\${id}"][data-status="\${status}"]\`);
          if (activeButton) {
            activeButton.classList.add('active');
          }
          const header = document.getElementById(\`\${id}-header\`);
          if (header) {
            header.className = header.className.replace(/status-\\w+/, \`status-\${status}\`);
          }
          updateGroupStatus(id);
          updateSummary(id);
        }

        function updateGroupStatus(artifactId) {
          const group = document.getElementById(artifactId + '-header').closest('.group');
          const groupId = group.querySelector('.group-header').getAttribute('data-group');
          const artifacts = group.querySelectorAll('.artifact-header');
          let lowestStatus = 'check';
          
          artifacts.forEach(artifact => {
            const status = artifact.className.match(/status-(\\w+)/)[1];
            if (status === 'error' || (status === 'none' && lowestStatus !== 'error')) {
              lowestStatus = status;
            }
          });

          const groupHeader = document.getElementById(groupId + '-header');
          groupHeader.className = groupHeader.className.replace(/status-\\w+/, \`status-\${lowestStatus}\`);
        }

        function saveComment(id) {
          const textarea = document.getElementById(\`\${id}-comment\`);
          const comment = textarea.value;
          localStorage.setItem(\`\${id}-comment\`, comment);
          updateSummary(id);
        }

        function updateSummary(artifactId) {
          const group = document.getElementById(artifactId + '-header').closest('.group');
          const groupId = group.querySelector('.group-header').getAttribute('data-group');
          const summaryList = document.querySelector(\`#\${groupId}-summary ul\`);
          summaryList.innerHTML = '';

          group.querySelectorAll('.artifact').forEach(artifact => {
            const id = artifact.querySelector('.artifact-header').getAttribute('data-artifact');
            const status = artifact.querySelector('.artifact-header').className.match(/status-(\\w+)/)[1];
            const comment = localStorage.getItem(\`\${id}-comment\`) || '';
            const listItem = document.createElement('li');
            listItem.innerHTML = \`
              <span class="artifact-name">\${id}:</span>
              <span class="artifact-status status-\${status}">\${status}</span>
              \${comment ? \`<br><span class="artifact-comment">\${comment}</span>\` : ''}
            \`;
            summaryList.appendChild(listItem);
          });
        }

        function saveAllComments() {
          document.querySelectorAll('textarea').forEach(textarea => {
            const id = textarea.id.replace('-comment', '');
            saveComment(id);
          });
          alert('All comments saved successfully!');
        }

        function loadCommentsAndStatuses() {
          document.querySelectorAll('.artifact').forEach(artifact => {
            const id = artifact.querySelector('.artifact-header').getAttribute('data-artifact');
            const savedComment = localStorage.getItem(\`\${id}-comment\`);
            const savedStatus = localStorage.getItem(\`\${id}-status\`);
            
            if (savedComment) {
              const textarea = document.getElementById(\`\${id}-comment\`);
              textarea.value = savedComment;
            }
            
            if (savedStatus) {
              setStatus(id, savedStatus);
            }
            
            updateSummary(id);
          });
        }

        document.getElementById('darkModeToggle').addEventListener('change', function() {
          document.body.classList.toggle('dark', this.checked);
        });

        document.getElementById('saveAllComments').addEventListener('click', saveAllComments);

        document.querySelectorAll('.group-header').forEach(header => {
          header.addEventListener('click', () => toggleGroup(header.getAttribute('data-group')));
        });

        document.querySelectorAll('.artifact-header').forEach(header => {
          header.addEventListener('click', () => toggleArtifact(header.getAttribute('data-artifact')));
        });

        document.querySelectorAll('.status-button').forEach(button => {
          button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            const status = button.getAttribute('data-status');
            setStatus(id, status);
            localStorage.setItem(\`\${id}-status\`, status);
          });
        });

        document.querySelectorAll('.save-comment').forEach(button => {
          button.addEventListener('click', () => saveComment(button.getAttribute('data-id')));
        });

        // Load saved comments and statuses when the page loads
        window.onload = loadCommentsAndStatuses;
      </script>
    </body>
    </html>
  `

    const outputFileName = `${folderName}_artifact_report.html`
    await fs.writeFile(path.join(outputDir, outputFileName), htmlContent)
    console.log(`Report generated at ${path.join(outputDir, outputFileName)}`)
}

// Example usage
const artifactsDir = process.argv[2] || path.join(__dirname, "artifacts")
processArtifacts(artifactsDir)

console.log("Local artifact processing script executed")

