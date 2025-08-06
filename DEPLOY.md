# Deployment Guide

## GitHub Pages Deployment

This project is configured to automatically deploy to GitHub Pages when you push to the main branch.

### For Forks

When you fork this repository, follow these steps to deploy your own version:

1. **Enable GitHub Pages in your repository:**
   - Go to Settings → Pages
   - Under "Source", select "GitHub Actions"

2. **Update the base path configuration:**
   - Copy `example.env` to `.env`
   - Set `VITE_BASE_PATH` to match your repository name:
     ```
     VITE_BASE_PATH=/your-repository-name/
     ```
   - For custom domains or GitHub user/org pages (username.github.io), use:
     ```
     VITE_BASE_PATH=/
     ```

3. **Push to main branch:**
   - The GitHub Action will automatically build and deploy your site
   - Your site will be available at: `https://[username].github.io/[repository-name]/`

### Custom Domain

If using a custom domain:
1. Set `VITE_BASE_PATH=/` in your `.env` file
2. Add a CNAME file in the `public/` directory with your domain
3. Configure your domain's DNS as per [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

### Troubleshooting

**Blank page after deployment:**
- Check that `VITE_BASE_PATH` matches your repository name
- Ensure GitHub Pages is set to use "GitHub Actions" as the source
- Check the Actions tab for any build errors
- Open browser DevTools and check for 404 errors on assets

**404 errors on page refresh:**
- This is expected behavior for client-side routing
- The build script creates a `404.html` that redirects to the main app

**Build failures:**
- Check the Actions tab for error messages
- Ensure all required environment variables are set
- Run `npm test` locally to verify the build works