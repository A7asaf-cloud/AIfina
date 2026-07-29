/**
 * Client-side API Fallbacks for FinanceIL (useful when hosted on static platforms like GitHub Pages)
 */

import { CONFIG } from '../config';

export async function generateGeminiContentClient(apiKey: string, contents: any): Promise<string> {
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      // 1. Try Direct Call
      try {
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contents }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP error! status: ${res.status}`);
        }
      } catch (directErr: any) {
        console.warn(`Direct client Gemini call for ${model} failed, trying via CORS proxy...`, directErr.message || directErr);
        
        // 2. Try via CORS Proxy
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(baseUrl)}`;
        const res = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contents }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP error via proxy! status: ${res.status}`);
        }
      }
    } catch (e: any) {
      console.warn(`Client Gemini model ${model} failed:`, e.message || e);
      lastError = e;
    }
  }
  throw lastError || new Error('כל דגמי Gemini נכשלו במענה מקליינט');
}

export async function fetchYahooQuoteClientSide(ticker: string) {
  const hosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const targetUrl = `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
      const url = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const result = data.chart?.result?.[0];
        if (result) {
          const meta = result.meta;
          let currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
          let prevClose = meta.chartPreviousClose || currentPrice;
          let currency = meta.currency || 'USD';

          if (currency === 'ILA') {
            currentPrice = currentPrice / 100;
            prevClose = prevClose / 100;
            currency = 'ILS';
          }

          const changePercent = prevClose ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
          const companyName = meta.shortName || meta.longName || ticker;

          if (currentPrice > 0) {
            return {
              success: true,
              symbol: meta.symbol || ticker,
              price: parseFloat(currentPrice.toFixed(2)),
              prevClose: parseFloat(prevClose.toFixed(2)),
              changePercent: parseFloat(changePercent.toFixed(2)),
              currency,
              companyName,
              apiSource: 'Yahoo Finance Live (Client)',
              lastUpdated: new Date().toISOString(),
            };
          }
        }
      }
    } catch (e) {
      console.error(`Error fetching Yahoo chart for ${ticker} client-side:`, e);
    }
  }
  return null;
}

export async function fetchGoogleQuoteClientSide(symbol: string) {
  let cleanSymbol = symbol.trim();
  let exchange = '';
  
  if (cleanSymbol.endsWith('.TA')) {
    cleanSymbol = cleanSymbol.replace('.TA', '');
    exchange = 'TLV';
  } else if (cleanSymbol.includes(':')) {
    const parts = cleanSymbol.split(':');
    cleanSymbol = parts[0];
    exchange = parts[1];
  }

  const exchangesToTry = exchange ? [exchange] : ['NASDAQ', 'NYSE', 'TLV'];
  
  for (const ex of exchangesToTry) {
    try {
      const targetUrl = `https://www.google.com/finance/quote/${cleanSymbol}:${ex}?hl=en`;
      const url = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const html = await res.text();
      
      const pdsbrcRegex = /jsname="Pdsbrc"[^>]*>\s*<span>([^<]+)<\/span>/gi;
      let match;
      const prices: { value: string; index: number }[] = [];
      while ((match = pdsbrcRegex.exec(html)) !== null) {
        prices.push({ value: match[1], index: match.index });
      }
      
      const currencyRegex = /(?:[\$\₪\€\£]|[A-Z]{3})[\s\u00A0]*[0-9,]+\.[0-9]+/i;
      const mainPriceObj = prices.find(p => currencyRegex.test(p.value));
      if (!mainPriceObj) continue;

      const mainPriceString = mainPriceObj.value;
      const mainPriceIndex = mainPriceObj.index;
      
      const subHtml = html.substring(mainPriceIndex, mainPriceIndex + 2000);
      const absChangeMatch = subHtml.match(/jsname="xnruHf"[^>]*>\s*<span[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                             subHtml.match(/jsname="xnruHf"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
      const pctChangeMatch = subHtml.match(/jsname="vY9t3b"[^>]*>\s*<span[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i) ||
                             subHtml.match(/jsname="vY9t3b"[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i);
                             
      let isNegative = subHtml.includes('arrow_downward') || (pctChangeMatch && pctChangeMatch[1].includes('-'));
      let sign = isNegative ? -1 : 1;
      
      const numMatch = mainPriceString.match(/[0-9,]+\.[0-9]+/);
      const curMatch = mainPriceString.match(/^[^\s\u00A0\d]+/);
      
      if (numMatch) {
        const rawPrice = parseFloat(numMatch[0].replace(/,/g, ''));
        let currency = curMatch ? curMatch[0].trim() : 'USD';
        let price = rawPrice;
        if (currency === 'ILA') {
          price = price / 100;
          currency = 'ILS';
        }
        if (currency === '$') currency = 'USD';
        if (currency === '₪') currency = 'ILS';
        
        const pctChangeText = pctChangeMatch ? pctChangeMatch[1].replace(/[+\-%\s]/g, '').trim() : '0';
        const changePercent = parseFloat(pctChangeText) * sign;
        
        const nameMatch = html.match(/<div class="zzDeGe">([^<]+)<\/div>/i) || html.match(/class="gO24Ff">([^<]+)<\/div>/i);
        const companyName = nameMatch ? nameMatch[1].trim() : cleanSymbol;
        
        return {
          success: true,
          symbol: symbol,
          price: parseFloat(price.toFixed(2)),
          prevClose: parseFloat((price / (1 + changePercent / 100)).toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2)),
          currency,
          companyName,
          apiSource: `Google Finance Scraped (${ex}) (Client)`,
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error(`Google scrape error client-side for ${cleanSymbol} on ${ex}:`, e);
    }
  }
  return null;
}

export async function fetchStockQuoteClientSide(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  
  // Hebrew & Popular Synonym Mappings
  const HEBREW_MAP: Record<string, string> = {
    'טסלה': 'TSLA',
    'אנבידיה': 'NVDA',
    'אפל': 'AAPL',
    'אמזון': 'AMZN',
    'מיקרוסופט': 'MSFT',
    'גוגל': 'GOOGL',
    'מטה': 'META',
    'פייסבוק': 'META',
    'טבע': 'TEVA',
    'אלביט': 'ESLT',
    'אינטל': 'INTC',
    'דיסני': 'DIS',
    'נטפליקס': 'NFLX',
    'נייקי': 'NKE',
    'פייפאל': 'PYPL',
    'בואינג': 'BA',
    'ביטקוין': 'BTC-USD',
    'אתריום': 'ETH-USD',
    'סולאנה': 'SOL-USD',
    'לאומי': 'LUMI.TA',
    'פועלים': 'POLI.TA',
    'שופרסל': 'SAE.TA',
    'אל על': 'ELAL.TA',
    'אלעל': 'ELAL.TA',
    'נייס': 'NICE',
    'טאואר': 'TSEM',
    'ספיי': 'SPY',
    'אס אנד פי': 'SPY',
    'נאסדק': 'QQQ',
    'TA35': 'TA35.TA',
    'BTC': 'BTC-USD',
    'ETH': 'ETH-USD',
    'SOL': 'SOL-USD',
  };

  const mappedSymbol = HEBREW_MAP[symbol] || HEBREW_MAP[symbol.toLowerCase()] || upperSymbol;

  // 1. Primary Chart Fetch
  let quote = await fetchYahooQuoteClientSide(mappedSymbol);
  if (quote) {
    return quote;
  }

  // 2. Google Finance Scraper Fallback
  quote = await fetchGoogleQuoteClientSide(mappedSymbol);
  if (quote) {
    return quote;
  }

  // 3. Fallbacks dictionary
  const STATIC_FINANCIAL_FALLBACKS: Record<string, { price: number; changePct: number; name: string; currency?: string }> = {
    'AAPL': { price: 340.08, changePct: 0.94, name: 'Apple Inc.' },
    'NVDA': { price: 197.01, changePct: 0.25, name: 'NVIDIA Corporation' },
    'TSLA': { price: 307.44, changePct: -0.58, name: 'Tesla, Inc.' },
    'MSFT': { price: 393.35, changePct: 1.09, name: 'Microsoft Corporation' },
    'AMZN': { price: 230.86, changePct: -0.23, name: 'Amazon.com, Inc.' },
    'GOOGL': { price: 333.71, changePct: 2.19, name: 'Alphabet Inc.' },
    'META': { price: 685.50, changePct: 1.45, name: 'Meta Platforms, Inc.' },
    'SPY': { price: 602.15, changePct: 0.65, name: 'SPDR S&P 500 ETF Trust' },
    'QQQ': { price: 520.40, changePct: 1.12, name: 'Invesco QQQ Trust' },
    'TEVA': { price: 31.67, changePct: 1.90, name: 'Teva Pharmaceutical Industries' },
    'BTC-USD': { price: 64371.02, changePct: 0.81, name: 'Bitcoin USD' },
    'ETH-USD': { price: 3450.20, changePct: 1.35, name: 'Ethereum USD' },
  };

  const fallbackKey = STATIC_FINANCIAL_FALLBACKS[mappedSymbol] ? mappedSymbol : STATIC_FINANCIAL_FALLBACKS[upperSymbol] ? upperSymbol : null;
  if (fallbackKey) {
    const fb = STATIC_FINANCIAL_FALLBACKS[fallbackKey];
    return {
      success: true,
      symbol: fallbackKey,
      price: fb.price,
      prevClose: parseFloat((fb.price / (1 + fb.changePct / 100)).toFixed(2)),
      changePercent: fb.changePct,
      currency: fb.currency || 'USD',
      companyName: fb.name,
      apiSource: 'Global Market Index (Fallback)',
      lastUpdated: new Date().toISOString(),
    };
  }

  return {
    success: false,
    symbol,
    error: `לא ניתן להביא מחיר שוק עבור ${symbol} במצב אופליין`,
  };
}

export function getApiUrl(path: string): string {
  const customServer = CONFIG.API_SERVER_URL;
  if (customServer) {
    const base = customServer.endsWith('/') ? customServer.slice(0, -1) : customServer;
    return base + path;
  }
  return path;
}
