import os
from github import Github, GithubException

# --- CONFIGURATION ---
# Replace with your actual token or set it as an environment variable
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "YOUR_TOKEN_HERE")
REPO_NAME = "freemoneyaungthitsar-cyber/kalau-prompt-wizard"
LOCAL_PROJECT_PATH = "." # Current directory
COMMIT_MESSAGE = "Initial upload of Ka-Laung Prompt Wizard via Automation Script"

def upload_to_github():
    try:
        # Connect to GitHub
        g = Github(GITHUB_TOKEN)
        try:
            repo = g.get_repo(REPO_NAME)
        except GithubException:
            # If repo doesn't exist, create it
            user = g.get_user()
            repo = user.create_repo(REPO_NAME.split('/')[-1])
            
        print(f"✅ Connected to repo: {REPO_NAME}")

        # Files/folders to ignore
        ignore_list = [
            'node_modules', '.git', 'dist', '.DS_Store', 
            '__pycache__', '.env', 'build', '.next', '.vercel'
        ]

        for root, dirs, files in os.walk(LOCAL_PROJECT_PATH):
            # Ignore folders
            dirs[:] = [d for d in dirs if d not in ignore_list]
            
            for file in files:
                if file in ignore_list:
                    continue
                    
                local_path = os.path.join(root, file)
                
                # Get relative path for GitHub
                relative_path = os.path.relpath(local_path, LOCAL_PROJECT_PATH)
                github_path = relative_path.replace("\\", "/") # Windows compatibility

                if github_path.startswith("."): continue

                with open(local_path, "rb") as f:
                    content = f.read()

                try:
                    # Check if file exists
                    contents = repo.get_contents(github_path)
                    # Update if exists
                    repo.update_file(github_path, f"update {github_path}", content, contents.sha)
                    print(f"📝 Updated: {github_path}")
                except GithubException:
                    # Create if doesn't exist
                    repo.create_file(github_path, f"create {github_path}", content)
                    print(f"🚀 Created: {github_path}")

        print("\n✨ အစ်ကို MinThitSarAung ရှင့်... Project တစ်ခုလုံးကို GitHub ပေါ် တင်ပေးပြီးပါပြီရှင်!")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    if GITHUB_TOKEN == "YOUR_TOKEN_HERE":
        print("❌ Please set your GITHUB_TOKEN in the script or as an environment variable.")
    else:
        upload_to_github()
