import { useEffect } from 'react';

const SITE_URL = 'https://campusoou.netlify.app';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

function setTag(selector, create, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(create);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

export default function Seo({ title, description, path = '/', noindex = false }) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    setTag('meta[name="description"]', 'meta', { name: 'description', content: description });
    setTag('link[rel="canonical"]', 'link', { rel: 'canonical', href: url });
    setTag('meta[name="robots"]', 'meta', {
      name: 'robots',
      content: noindex ? 'noindex, nofollow' : 'index, follow',
    });
    setTag('meta[property="og:title"]', 'meta', { property: 'og:title', content: title });
    setTag('meta[property="og:description"]', 'meta', { property: 'og:description', content: description });
    setTag('meta[property="og:url"]', 'meta', { property: 'og:url', content: url });
    setTag('meta[property="og:image"]', 'meta', { property: 'og:image', content: DEFAULT_IMAGE });
    setTag('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: title });
    setTag('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: description });
  }, [title, description, path, noindex]);

  return null;
}
