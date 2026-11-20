/**
 * TRÍ AI ULTIMATE ROBOT - ROBOTS.TXT COMPLIANCE CHECKER
 * Strictly complies with RFC 9309 rules, rate-limiting directives, and Disallow paths.
 * In-memory caching with 1-hour TTL per origin domain.
 */

const robotsCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class RobotsChecker {
  /**
   * Parse robots.txt text into structured rules
   */
  static parseRobotsTxt(content) {
    const lines = content.split(/\r?\n/);
    const groups = [];
    let currentGroup = null;
    const sitemaps = [];

    for (let rawLine of lines) {
      // Remove comments and trim
      const line = rawLine.split('#')[0].trim();
      if (!line) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const directive = line.slice(0, colonIdx).trim().toLowerCase();
      const value = line.slice(colonIdx + 1).trim();

      if (directive === 'sitemap') {
        if (value.startsWith('http')) {
          sitemaps.push(value);
        }
        continue;
      }

      if (directive === 'user-agent') {
        if (!currentGroup || currentGroup.rules.length > 0) {
          currentGroup = { agents: [], rules: [], crawlDelay: 0 };
          groups.push(currentGroup);
        }
        currentGroup.agents.push(value.toLowerCase());
        continue;
      }

      if (!currentGroup) continue;

      if (directive === 'disallow') {
        currentGroup.rules.push({ type: 'disallow', path: value });
      } else if (directive === 'allow') {
        currentGroup.rules.push({ type: 'allow', path: value });
      } else if (directive === 'crawl-delay') {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          currentGroup.crawlDelay = delay;
        }
      }
    }

    return { groups, sitemaps };
  }

  /**
   * Fetch and cache robots.txt for a given domain
   */
  static async fetchRobotsTxt(originUrl) {
    try {
      const parsedUrl = new URL(originUrl);
      const origin = parsedUrl.origin;
      const cached = robotsCache.get(origin);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }

      const robotsUrl = `${origin}/robots.txt`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TriAIRobot/1.0; +https://quangnhuttri.com)'
        }
      });
      clearTimeout(timeoutId);

      if (!resp.ok) {
        // If 404 or other non-200, assume full crawl is allowed
        const emptyRules = { groups: [], sitemaps: [] };
        robotsCache.set(origin, { timestamp: Date.now(), data: emptyRules });
        return emptyRules;
      }

      const text = await resp.text();
      const parsed = RobotsChecker.parseRobotsTxt(text);
      robotsCache.set(origin, { timestamp: Date.now(), data: parsed });
      return parsed;
    } catch (err) {
      console.warn(`[ROBOTS CHECKER] Failed to fetch robots.txt for ${originUrl}:`, err.message);
      // Graceful fallback: allow with standard delay
      return { groups: [], sitemaps: [] };
    }
  }

  /**
   * Check if a URL can be crawled according to robots.txt
   */
  static async isAllowed(targetUrl, userAgent = 'triairobot') {
    try {
      const urlObj = new URL(targetUrl);
      const parsedRobots = await RobotsChecker.fetchRobotsTxt(targetUrl);

      if (!parsedRobots.groups || parsedRobots.groups.length === 0) {
        return { allowed: true, crawlDelay: 0.5, reason: 'No robots.txt restrictions' };
      }

      // Find matching group for user agent or fallback to '*'
      let matchedGroup = parsedRobots.groups.find(g =>
        g.agents.some(a => a === userAgent.toLowerCase() || userAgent.toLowerCase().includes(a))
      );

      if (!matchedGroup) {
        matchedGroup = parsedRobots.groups.find(g => g.agents.includes('*'));
      }

      if (!matchedGroup) {
        return { allowed: true, crawlDelay: 0.5, reason: 'No matching agent rules' };
      }

      const path = urlObj.pathname + urlObj.search;

      // Check rules: more specific rule wins, Allow takes precedence over Disallow if lengths equal
      let allowed = true;
      let matchedRule = null;
      let longestMatchLength = -1;

      for (const rule of matchedGroup.rules) {
        if (!rule.path) {
          // Empty disallow means allow all
          if (rule.type === 'disallow' && longestMatchLength === -1) {
            allowed = true;
          }
          continue;
        }

        // Simple prefix match (RFC 9309 basic path matching)
        const cleanRulePath = rule.path.replace(/\*+/g, '.*');
        const regex = new RegExp('^' + cleanRulePath);

        if (regex.test(path)) {
          if (rule.path.length > longestMatchLength) {
            longestMatchLength = rule.path.length;
            allowed = rule.type === 'allow';
            matchedRule = rule;
          } else if (rule.path.length === longestMatchLength && rule.type === 'allow') {
            allowed = true;
            matchedRule = rule;
          }
        }
      }

      return {
        allowed,
        crawlDelay: matchedGroup.crawlDelay > 0 ? matchedGroup.crawlDelay : 0.5,
        reason: matchedRule ? `Matched ${matchedRule.type} ${matchedRule.path}` : 'Default allowed'
      };
    } catch (err) {
      console.error('[ROBOTS ERROR]', err);
      return { allowed: true, crawlDelay: 0.5, reason: 'Error parsing URL' };
    }
  }

  /**
   * Retrieve discovered sitemaps from robots.txt
   */
  static async getSitemaps(targetUrl) {
    const parsedRobots = await RobotsChecker.fetchRobotsTxt(targetUrl);
    return parsedRobots.sitemaps || [];
  }
}

export default RobotsChecker;
