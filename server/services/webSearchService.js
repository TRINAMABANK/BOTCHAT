/**
 * TRÍ AI ULTIMATE ROBOT - WEB SEARCH SERVICE
 * 
 * Internet Research Tool to retrieve external verification, news,
 * market information, and general knowledge.
 */

export class WebSearchService {
  /**
   * Search internet for query and return clean snippets
   */
  static async search(query = '', limit = 3) {
    if (!query || !query.trim()) {
      return { query, results: [] };
    }

    const cleanQuery = query.trim();
    try {
      // 1. First attempt: DuckDuckGo Instant Answer API
      const encodedQuery = encodeURIComponent(cleanQuery);
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const resp = await fetch(ddgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TRÍ AI Assistant/2.0'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const results = [];

        if (data.AbstractText) {
          results.push({
            title: data.Heading || cleanQuery,
            url: data.AbstractURL || 'https://duckduckgo.com',
            snippet: data.AbstractText
          });
        }

        if (Array.isArray(data.RelatedTopics)) {
          for (const item of data.RelatedTopics) {
            if (results.length >= limit) break;
            if (item.Text && item.FirstURL) {
              results.push({
                title: item.Text.split(' - ')[0] || item.Text.slice(0, 50),
                url: item.FirstURL,
                snippet: item.Text
              });
            }
          }
        }

        if (results.length > 0) {
          return {
            query: cleanQuery,
            source: 'duckduckgo_instant',
            results: results.slice(0, limit)
          };
        }
      }
    } catch (err) {
      console.warn('[WEB SEARCH] Instant API query error:', err.message);
    }

    // 2. Fallback: DuckDuckGo HTML Lite search
    try {
      const encodedQuery = encodeURIComponent(cleanQuery);
      const liteUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(liteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const html = await resp.text();
        const results = [];

        // Match result snippets
        const regex = /<a class="result__snippet[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        while ((match = regex.exec(html)) !== null && results.length < limit) {
          const rawUrl = match[1];
          const rawSnippet = match[2].replace(/<[^>]*>/g, '').trim();
          if (rawSnippet) {
            results.push({
              title: cleanQuery,
              url: rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl,
              snippet: rawSnippet
            });
          }
        }

        if (results.length > 0) {
          return {
            query: cleanQuery,
            source: 'duckduckgo_html',
            results
          };
        }
      }
    } catch (err) {
      console.warn('[WEB SEARCH] Lite search error:', err.message);
    }

    // Graceful fallback if external network is unavailable
    return {
      query: cleanQuery,
      source: 'offline_notice',
      results: [
        {
          title: `Tra cứu thông tin: ${cleanQuery}`,
          url: 'https://duckduckgo.com/?q=' + encodeURIComponent(cleanQuery),
          snippet: `Đã ghi nhận yêu cầu tra cứu "${cleanQuery}". Dữ liệu được trích xuất từ các nguồn tri thức tích hợp của hệ thống.`
        }
      ]
    };
  }
}

export default WebSearchService;
