# Enable GitHub Pages (required once)

The deploy workflow publishes built files to the **`gh-pages`** branch automatically.
GitHub will show a 404 until Pages is turned on for that branch.

## Steps

1. Open https://github.com/taahirsayid/marioggle/settings/pages
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**
3. Set **Branch** to **`gh-pages`** and folder **`/ (root)`**
4. Click **Save**
5. Wait 1–2 minutes, then open https://taahirsayid.github.io/marioggle/

## Verify deploy succeeded

- Actions tab → **Deploy GitHub Pages** workflow → latest run should be green
- Branch dropdown should list **`gh-pages`**

## Play solo (needs API)

GitHub Pages serves the frontend only. Set repository secret **`VITE_API_URL`** to your Render backend URL, then re-run **Deploy GitHub Pages**.

Example: `https://marioggle.onrender.com`
