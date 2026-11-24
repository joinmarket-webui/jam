import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

test('regtest publishes host ports only on IPv4 loopback', () => {
  // Config rendering needs directory addresses but does not start services.
  const config = JSON.parse(
    execFileSync('docker', ['compose', '-f', 'docker-compose.yml', 'config', '--format', 'json'], {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      env: {
        ...process.env,
        JM_REF_DIRECTORY_NODES: 'example.onion:5222',
        JM_ALL_DIRECTORY_NODES: 'example.onion:5222',
      },
      encoding: 'utf8',
      timeout: 30_000,
    }),
  )
  const ports = Object.values(config.services).flatMap((service) => service.ports ?? [])
  assert.ok(ports.length > 0, 'must check actual host publications')
  for (const port of ports) {
    assert.equal(port.host_ip, '127.0.0.1', JSON.stringify(port))
  }
})
