# Release Process

This documents our release process.

## Update the Code

Checkout `master` and make sure to pull all the latest changes that sould be included in the release.

## Bump the Version

Use [`npm version`](https://docs.npmjs.com/cli/v6/commands/npm-version) to bump the version and update the changelog.
Most of the time you will want to run:

```
npm version <patch|minor|major>
```

For more details and other possible release types see [the npm docs](https://docs.npmjs.com/cli/v6/commands/npm-version).

This will:

1. Create and checkout a branch for the release preparation: `prepare-v<new-version>-<timestamp>`
1. Bump the version in `package.json` and `package.lock.json`
1. Update the changelog
1. Commit the changes and push the branch
1. Open a _draft_ pull request to `master`

## Merge the Release Pull Request

This is a good point to clean up the changelog if needed and get feedback on the release.
When everyone is happy with the release, merge the pull request to `master`.

## Tag the Release

Back on `master`, tag the release and based on the new tag crate a release on GitHub.
This is a step we might automate completely via GitHub Actions in the future.
