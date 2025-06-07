import { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import { GA4DeduplicationHelper } from '../utils/ga4Deduplication';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Initialize GTM
    const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
    if (gtmId) {
      // Add GTM script
      const script = document.createElement('script');
      script.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(script);

      // Add deduplication initialization
      const dedupScript = document.createElement('script');
      dedupScript.innerHTML = GA4DeduplicationHelper.generateGTMInitScript();
      document.head.appendChild(dedupScript);
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp; 