import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'

function BrokenChild() {
  throw new Error('render boom')
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('shows fallback UI when a child throws', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary title="Page error">
          <BrokenChild />
        </ErrorBoundary>
      </MemoryRouter>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Page error')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse products/i })).toBeInTheDocument()
  })

  it('recovers when Try again is clicked', () => {
    let shouldThrow = true

    function MaybeBroken() {
      if (shouldThrow) throw new Error('temporary')
      return <p>Recovered</p>
    }

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <MaybeBroken />
        </ErrorBoundary>
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })
})
