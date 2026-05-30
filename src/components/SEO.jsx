import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = "EasyBMT - GST Billing & POS Software", 
  description = "EasyBMT is the premier POS and GST billing management solution for modern businesses. Fast, secure, and easy to use.", 
  name = "EasyBMT", 
  type = "website",
  url = "https://easybmt.com",
  image = "https://easybmt.com/assets/logo.png",
  withSchema = false
}) => {
  // Schema for Organization and WebSite to enable Sitelinks Search Box and brand indexing
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EasyBMT",
    "url": "https://easybmt.com",
    "logo": "https://easybmt.com/assets/logo.png",
    "description": "EasyBMT is a comprehensive business management, ERP, and GST billing software.",
    "sameAs": [
      "https://facebook.com/easybmt",
      "https://twitter.com/easybmt"
    ]
  };

  const schemaWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://easybmt.com",
    "name": "EasyBMT",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://easybmt.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{title}</title>
      <meta name='description' content={description} />
      <link rel="canonical" href={url} />

      {/* OpenGraph tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={name} />

      {/* Twitter tags */}
      <meta name="twitter:creator" content="@easybmt" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) for Sitelinks */}
      {withSchema && (
        <script type="application/ld+json">
          {JSON.stringify([schemaOrg, schemaWebSite])}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
