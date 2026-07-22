import PageSeo from './PageSeo'

/** noindex wrapper for account, checkout, and cart routes. */
export default function PrivatePageSeo({ title, path = '/' }) {
  return <PageSeo title={title} path={path} noIndex />
}
