import { Helmet } from 'react-helmet-async'
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  absoluteUrl,
  truncateMeta,
  ogImageUrl,
} from '../../utils/seo'

/**
 * Per-route document title, description, canonical URL, and Open Graph / Twitter tags.
 */
export default function PageSeo({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  noIndex = false,
  children,
}) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
  const metaDescription = truncateMeta(description || DEFAULT_DESCRIPTION)
  const canonicalUrl = absoluteUrl(path)
  const shareImage = ogImageUrl(image)

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />
      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={shareImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={shareImage} />

      {children}
    </Helmet>
  )
}
