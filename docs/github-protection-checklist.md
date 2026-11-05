# Owner checklist: private repository protections

These are manual settings; this task does not change remote repository settings.

- [ ] Keep repository visibility private; restrict collaborator access and require MFA.
- [ ] Protect `main`: require a pull request and at least one independent approval.
- [ ] Require the `check` job from `Project checks` after confirming its exact displayed
      status-context name on the current PR. Require the branch to be up to date.
- [ ] Dismiss stale approvals; require approval of the latest reviewable push;
      require all review conversations to be resolved.
- [ ] Block force pushes and branch deletion; apply rules to administrators and
      disable bypass lists except a documented emergency owner procedure.
- [ ] Restrict direct pushes to main. Do not enable auto-merge for this review.
- [ ] Keep Actions token permissions read-only by default; restrict allowed actions,
      retain pinned action SHAs, and never run untrusted PR code with production secrets.
- [ ] Enable Dependabot alerts/security updates and review weekly version PRs.
      Check plan availability for private repositories; retain local audit regardless.
- [ ] Enable private vulnerability reporting/secret scanning if available. Set the
      private contact in SECURITY.md before granting preview access.
- [ ] Keep preview Deployment Protection on; store credentials only in protected
      environment settings, never GitHub issue/PR text or committed files.

No rule replaces manual review. Never weaken lint, tests, build, dependency audit,
secret checks or install-script policy to make an update green.
