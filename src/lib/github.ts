import { GithubErrorDetail, analyzeGithubError } from "./github-diagnostics";

export class GithubApiError extends Error {
  diagnostic: GithubErrorDetail;
  data: any;

  constructor(status: number, data: any) {
    super(`GitHub API Error: ${status}`);
    this.diagnostic = analyzeGithubError(status, data);
    this.data = data;
  }
}

import { getGithubToken } from "./store";

export async function githubFetch(path: string, options: RequestInit = {}) {
  const token = getGithubToken();
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new GithubApiError(res.status, data);
  }

  return res.json();
}

export async function createRepo(name: string, description: string, isPrivate: boolean) {
  return githubFetch("/user/repos", {
    method: "POST",
    body: JSON.stringify({ name, description, private: isPrivate }),
  });
}

export async function createFile(owner: string, repo: string, path: string, content: string, message: string) {
  const contentEncoded = btoa(unescape(encodeURIComponent(content)));
  
  // Try to get existing file to get SHA if updating
  let sha: string | undefined;
  try {
    const existing = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`);
    sha = existing.sha;
  } catch (e) {
    // File doesn't exist, that's fine
  }

  return githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: contentEncoded,
      sha,
    }),
  });
}

export async function deleteFile(owner: string, repo: string, path: string, message: string) {
  const existing = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`);
  return githubFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    body: JSON.stringify({
      message,
      sha: existing.sha,
    }),
  });
}

export async function listFiles(owner: string, repo: string, path: string = "") {
  return githubFetch(`/repos/${owner}/${repo}/contents/${path}`);
}

export async function createGist(files: any, description: string, isPublic: boolean) {
  return githubFetch("/gists", {
    method: "POST",
    body: JSON.stringify({ files, description, public: isPublic }),
  });
}

export async function createProject(name: string, description: string, template: string, isPrivate: boolean, onStep: (step: any) => void) {
  onStep({ detail: "Creating repository...", status: "loading" });
  const repo = await createRepo(name, description, isPrivate);
  onStep({ detail: "Repository created.", status: "done" });

  const owner = repo.owner.login;
  const repoName = repo.name;

  if (template === "react-app") {
    onStep({ detail: "Adding package.json...", status: "loading" });
    await createFile(owner, repoName, "package.json", JSON.stringify({ 
      name, 
      version: "1.0.0", 
      private: true,
      dependencies: { 
        "react": "^18.2.0", 
        "react-dom": "^18.2.0" 
      },
      devDependencies: {
        "vite": "^5.0.0",
        "@vitejs/plugin-react": "^4.0.0"
      }
    }, null, 2), "Initial commit: React Scaffold");
    onStep({ detail: "Project scaffolded.", status: "done" });
  } else if (template === "node-api") {
    onStep({ detail: "Adding package.json...", status: "loading" });
    await createFile(owner, repoName, "package.json", JSON.stringify({ 
      name, 
      version: "1.0.0", 
      main: "index.js",
      dependencies: { 
        "express": "^4.18.0", 
        "dotenv": "^16.0.0",
        "cors": "^2.8.5"
      }
    }, null, 2), "Initial commit: Node API Scaffold");
    
    onStep({ detail: "Adding index.js...", status: "loading" });
    const indexJs = `const express = require('express');\nrequire('dotenv').config();\nconst cors = require('cors');\n\nconst app = express();\nconst port = process.env.PORT || 3000;\n\napp.use(cors());\napp.use(express.json());\n\napp.get('/', (req, res) => {\n  res.json({ message: 'API is running', status: 'ok' });\n});\n\napp.listen(port, () => {\n  console.log(\`Server listening on port \${port}\`);\n});`;
    await createFile(owner, repoName, "index.js", indexJs, "Initial commit: Basic Express Server");

    onStep({ detail: "Adding .gitignore...", status: "loading" });
    await createFile(owner, repoName, ".gitignore", "node_modules\n.env\n.DS_Store\ndist", "Initial commit: Gitignore");

    onStep({ detail: "Adding .env.example...", status: "loading" });
    await createFile(owner, repoName, ".env.example", "PORT=3000\nDATABASE_URL=", "Initial commit: Env Example");

    onStep({ detail: "Project scaffolded.", status: "done" });
  } else if (template === "python-web") {
    onStep({ detail: "Adding requirements.txt...", status: "loading" });
    await createFile(owner, repoName, "requirements.txt", "flask==2.3.2\ngunicorn==20.1.0\npython-dotenv==1.0.0", "Initial commit: Python Requirements");
    
    onStep({ detail: "Adding app.py...", status: "loading" });
    const appPy = `import os\nfrom flask import Flask, jsonify\nfrom dotenv import load_dotenv\n\nload_dotenv()\n\napp = Flask(__name__)\n\n@app.route('/')\ndef hello():\n    return jsonify({"message": "Hello from Flask!", "status": "ok"})\n\nif __name__ == '__main__':\n    port = int(os.environ.get('PORT', 5000))\n    app.run(host='0.0.0.0', port=port, debug=True)`;
    await createFile(owner, repoName, "app.py", appPy, "Initial commit: Basic Flask App");

    onStep({ detail: "Adding .gitignore...", status: "loading" });
    const pyGitignore = `__pycache__/\n*.py[cod]\n*$py.class\n.env\nvenv/\nenv/\n.DS_Store`;
    await createFile(owner, repoName, ".gitignore", pyGitignore, "Initial commit: Python Gitignore");

    onStep({ detail: "Adding .env.example...", status: "loading" });
    await createFile(owner, repoName, ".env.example", "PORT=5000\nSECRET_KEY=your-secret-key-here", "Initial commit: Env Example");

    onStep({ detail: "Project scaffolded.", status: "done" });
  }

  return { repoUrl: repo.html_url };
}
