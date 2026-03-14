# Push CampusKart to GitHub

Your project is committed locally. Follow these steps to put it on GitHub.

## 1. Create a new repository on GitHub

1. Open **https://github.com/new**
2. **Repository name:** e.g. `campuskart` or `beingsalmanbutt.app`
3. **Public**
4. **Do not** check "Add a README" (you already have one)
5. Click **Create repository**

## 2. Connect and push from your computer

In a terminal, from the project folder (`c:\campuskart`), run (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Example if your username is `salmanbutt` and repo is `campuskart`:

```bash
git remote add origin https://github.com/salmanbutt/campuskart.git
git push -u origin main
```

If GitHub asks for login, use a **Personal Access Token** (not your password):  
GitHub → Settings → Developer settings → Personal access tokens → Generate new token (with `repo` scope).

---

After this, your code will be on GitHub. Next step is deploying to **beingsalmanbutt.app** (e.g. Vercel, Netlify, or GitHub Pages).
