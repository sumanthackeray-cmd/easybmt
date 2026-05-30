import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = "EasyBMT - GST Billing & POS Software", 
  description = "EasyBMT is the premier POS and GST billing management solution for modern businesses. Fast, secure, and easy to use.", 
  name = "EasyBMT", 
  type = "website",
  url = "https://easybmt.com",
  image = "https://easybmt.com/favicon.png",
  withSchema = false,
  noindex = false
}) => {
  // Schema for Organization and WebSite to enable Sitelinks Search Box and brand indexing
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EasyBMT",
    "url": "https://easybmt.com",
    "logo": "https://easybmt.com/site_logo.png",
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

  // SoftwareApplication Schema to prompt Google search to render Rating tables and rich SaaS indexing snippets
  const schemaApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "EasyBMT",
    "operatingSystem": "All (Cloud-Based)",
    "applicationCategory": "BusinessApplication, AccountingApplication, POSApplication",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "10420"
    },
    "offers": {
      "@type": "Offer",
      "price": "299",
      "priceCurrency": "INR",
      "description": "Premium GST billing, ERP, dual-mode POS and automated GSTR calculations for modern Indian shops.",
      "priceSpecification": {
        "@type": "UnitPriceSpecification",
        "priceType": "Subscription",
        "price": "299",
        "priceCurrency": "INR",
        "referenceQuantity": {
          "@type": "QuantitativeValue",
          "value": "1",
          "unitCode": "MON"
        }
      }
    }
  };

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{title}</title>
      <meta name='description' content={description} />
      <link rel="canonical" href={url} />

      {/* Crawler control: keep private dashboard pages secure & focus crawl budget on public ones */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

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

      {/* Structured Data (JSON-LD) for Sitelinks & SaaS Rating Tables */}
      {withSchema && (
        <script type="application/ld+json">
          {JSON.stringify([schemaOrg, schemaWebSite, schemaApp])}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
