const standardVersion = require('standard-version')

if (process.argv.length < 3 && !['patch', 'minor', 'major'].includes(process.argv[2])) {
  throw new Error("requires command line argument: 'patch' | 'minor' | 'major'")
}

const releaseType = process.argv[2]

const header = `\
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
`

const types = [
  { type: 'feat', section: 'Added' },
  { type: 'update', section: 'Changed' },
  { type: 'remove', section: 'Removed' },
  { type: 'fix', section: 'Fixed' },
  { type: 'security', section: 'Security' },
  { type: 'chore', hidden: true },
  { type: 'docs', hidden: true },
  { type: 'style', hidden: true },
  { type: 'refactor', hidden: true },
  { type: 'perf', hidden: true },
  { type: 'test', hidden: true },
]

standardVersion({
  dryRun: false,
  header: header,
  types: types,
  noVerify: true,
  infile: 'CHANGELOG.md',
  silent: false,
  releaseAs: releaseType,
  tagPrefix: 'v',
  sign: true,
  skip: {
    bump: false, // bump the version in package.josn and package.lock.json
    changelog: false, // update the changelog
    commit: true, // don't commit the changes yet so we can manualy tweak the changelog
    tag: true, // don't tag the release yet
  },
  scripts: {
    postchangelog: 'node scripts/postchangelog.js',
  },
}).catch((err) => {
  console.error(`standard-version failed with message: ${err.message}`)
})
