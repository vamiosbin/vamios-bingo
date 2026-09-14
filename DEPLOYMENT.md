# VAMIOS Bingo — fully corrected deployment package

## Deployment
- Frontend: GitHub Pages, base path `/vamios-bingo/`
- API: `https://vamios-api.onrender.com`
- CI: Node 22
- GitHub Actions does not depend on an npm cache lockfile.
- The web frontend contains its board generator locally, avoiding TypeScript workspace-export resolution problems during Pages builds.

## Important
This is a demo/virtual-credit application. Do not enable real-money wagering until applicable licensing, age/geo controls, KYC/AML, payments, security, privacy, tax/reporting, and responsible-gaming requirements have been implemented and reviewed.
