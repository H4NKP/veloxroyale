# How to Update VeloxAI Panel

There are two ways to update your panel to the latest version.

## Option 1: Automatic Update (Recommended)

If you installed the panel using Git, you can update directly from the Admin Panel.

1.  Log in to your **Velox Panel**.
2.  Navigate to **Admin > System > Updates**.
3.  Click **Check Now**.
4.  If an update is available, click the green **Update Now** button.
    *   *The system will automatically pull the latest code and reload.*

---

## Option 2: Manual Update (Terminal)

If the automatic button doesn't work (or you get an error), you can update via the terminal.

1.  Open your terminal/console on the server/Mac.
2.  Navigate to your project folder:
    ```bash
    cd /path/to/velox-ai-panel
    ```
3.  Run the update commands:
    ```bash
    # 1. Download latest code
    git pull origin main

    # 2. Update dependencies (libraries)
    npm install

    # 3. Rebuild the application
    npm run build
    ```

---

## Troubleshooting: "Not a Git Repository"

If you downloaded the panel as a **ZIP file** instead of using Git, the automatic update technically won't work because your folder isn't connected to GitHub.

**To fix this (and enable easy updates in the future), run these commands once:**

```bash
# Initialize connection to GitHub
git init
git remote add origin https://github.com/H4NKP/veloxroyal.git
git fetch origin
git branch -M main

# Force your folder to match the GitHub version
# WARNING: This resets code changes, but keeps your database/config
git reset --hard origin/main
```

Once you do this, successful updates will be just one click away!
