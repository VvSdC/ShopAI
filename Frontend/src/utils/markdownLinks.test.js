import { isSafeMarkdownHref } from '../utils/markdownLinks'

describe('isSafeMarkdownHref', () => {
  it('allows https and relative links', () => {
    expect(isSafeMarkdownHref('https://shopai.example.com')).toBe(true)
    expect(isSafeMarkdownHref('/products/1')).toBe(true)
    expect(isSafeMarkdownHref('mailto:support@example.com')).toBe(true)
  })

  it('blocks javascript and data URLs', () => {
    expect(isSafeMarkdownHref('javascript:alert(1)')).toBe(false)
    expect(isSafeMarkdownHref('data:text/html,<script>')).toBe(false)
  })
})
