import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityIndicator } from './ActivityIndicator'

describe('<ActivityIndicator />', () => {
  it('should only animate if the user does not prefer reduced motion', () => {
    const { container } = render(<ActivityIndicator animateEnter />)

    const classNames = [...container.querySelectorAll('[class]')].flatMap((it) => [...it.classList])

    expect(classNames).toContain('motion-safe:animate-ping')
    expect(classNames).toContain('motion-safe:animate-in')
    expect(classNames.filter((it) => it.startsWith('animate-'))).toEqual([])
  })
})
