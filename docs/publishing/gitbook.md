# Publishing with GitBook

Two options

- Git Sync (recommended): Author content in this repo under docs/ and sync to GitBook
- GitBook editor: Write in GitBook UI (less versioned in your repo)

Setup Git Sync

1. Create a GitBook account and workspace
2. Create a new Space
3. Connect your GitHub repo to the Space (Git Sync)
4. Set docs/ as the content path
5. Choose main branch and automatic sync

Navigation

- GitBook infers navigation from README.md and folders
- Optionally add a SUMMARY.md at docs/SUMMARY.md to hard-control ordering

Public vs private

- Public spaces are typically free
- Private spaces, advanced roles, and extra features may require a paid plan

Custom domain

- Configure a custom domain in GitBook settings (requires DNS changes)

Tips

- Keep docs/ structure stable; use relative links
- Prefer small pages with cross-links
- Add code fences for commands and JSON tool payloads
