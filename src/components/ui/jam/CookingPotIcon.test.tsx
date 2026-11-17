import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CookingPotIcon } from './CookingPotIcon'

describe('CookingPotIcon', () => {
  it('renders steam and a rattling lid while animated', () => {
    const { container } = render(<CookingPotIcon animate={true} sourceJarIndex={0} destinationJarIndex={1} />)

    expect(container.querySelector('.animation-steam-1')).toBeInTheDocument()
    expect(container.querySelector('.animation-steam-2')).toBeInTheDocument()
    expect(container.querySelector('.animation-steam-3')).toBeInTheDocument()
    expect(container.querySelector('.animation-wave')).toBeInTheDocument()
    expect(container.querySelector('.animation-lid')).toBeInTheDocument()
    expect(container.querySelector('.lid-closed')).not.toBeInTheDocument()
  })

  it('renders a closed lid without steam when not animated', () => {
    const { container } = render(<CookingPotIcon animate={false} />)

    expect(container.querySelector('[class^="animation-steam"]')).not.toBeInTheDocument()
    expect(container.querySelector('.animation-wave')).not.toBeInTheDocument()
    expect(container.querySelector('.animation-lid')).not.toBeInTheDocument()
    expect(container.querySelector('.lid-closed')).toBeInTheDocument()
  })

  it('animates only if reduced motion is not preferred', () => {
    const { container } = render(<CookingPotIcon animate={true} />)

    const css = container.querySelector('style')?.textContent ?? ''
    const reducedMotionGuard = '@media (prefers-reduced-motion: no-preference)'
    expect(css).toContain(reducedMotionGuard)

    const [unguarded, guarded] = css.split(reducedMotionGuard)
    expect(unguarded).not.toMatch(/animation:/)
    expect(guarded.match(/animation:/g)).toHaveLength(5)
  })

  it('hides the decorative icon from assistive technologies', () => {
    const { container } = render(<CookingPotIcon animate={true} />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('colors the pot by source and destination jar', () => {
    const { container } = render(<CookingPotIcon animate={false} sourceJarIndex={0} destinationJarIndex={1} />)

    expect(container.querySelector('#potDiagonalHatch .stroke-jar0')).toBeInTheDocument()
    expect(container.querySelector('#potDiagonalHatch .stroke-jar1')).toBeInTheDocument()
  })

  it('falls back to the source jar color when there is no destination jar', () => {
    const { container } = render(<CookingPotIcon animate={false} sourceJarIndex={2} />)

    expect(container.querySelectorAll('#potDiagonalHatch .stroke-jar2')).toHaveLength(2)
  })

  it('uses a neutral color when no jar is known', () => {
    const { container } = render(<CookingPotIcon animate={false} />)

    expect(container.querySelectorAll('#potDiagonalHatch .stroke-jar-unknown')).toHaveLength(2)
  })
})
