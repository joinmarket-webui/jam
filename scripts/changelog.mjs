import conventionalChangelog from 'conventional-changelog'
import fs from 'fs'

const START_OF_LAST_RELEASE_PATTERN = /(^#+ \[?[0-9]+\.[0-9]+\.[0-9]+|<a name=)/m

const file = 'CHANGELOG.md'

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

const generateChangelog = (newVersion) => {
  return new Promise((resolve, reject) => {
    let oldContent = fs.readFileSync(file, 'utf-8')
    const oldContentStart = oldContent.search(START_OF_LAST_RELEASE_PATTERN)

    if (oldContentStart !== -1) {
      oldContent = oldContent.substring(oldContentStart)
    }

    let changelog = ''

    const changelogStream = conventionalChangelog(
      {
        preset: {
          name: 'conventionalcommits',
          header: header,
          types: types,
        },
        tagPrefix: 'v',
      },
      { version: newVersion }
    ).on('error', function (err) {
      return reject(err)
    })

    changelogStream.on('data', (buffer) => {
      changelog += buffer.toString()
    })

    changelogStream.on('end', () => {
      changelog = changelog.replace(/###\s(\w+)/g, '#### $1').replace(/\n\n\n/g, '\n\n')
      const finalChangelog = header + '\n' + (changelog + oldContent).replace(/\n+$/, '\n')
      fs.writeFileSync(file, finalChangelog, 'utf8')
      return resolve()
    })
  })
}

await generateChangelog(process.env.npm_package_version)
