// Fetches company data from orginfo.uz and enriches with Perplexity if available

export interface OrgInfoResult {
  inn: string;
  name: string;
  director?: string;
  founders?: string[];
  authorized_capital?: number;
  registration_date?: string;
  status?: string;
  address?: string;
  main_activity?: string;
  source: 'orginfo' | 'perplexity';
}

export async function searchOrgInfo(query: string): Promise<OrgInfoResult[]> {
  try {
    // Try orginfo.uz search page
    const response = await fetch(
      `https://orginfo.uz/ru/search/?query=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CORVUS/3.0)' }, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return [];
    const html = await response.text();

    // Parse basic results from HTML (simple regex extraction)
    const results: OrgInfoResult[] = [];

    // Extract INN patterns (9 digits for Uzbekistan)
    const innMatches = html.matchAll(/(\d{9})/g);
    const names = html.matchAll(/class="[^"]*org[^"]*"[^>]*>([^<]{5,80})</gi);

    const innSet = new Set<string>();
    for (const m of innMatches) {
      if (!innSet.has(m[1])) {
        innSet.add(m[1]);
        if (results.length < 5) {
          results.push({ inn: m[1], name: query, source: 'orginfo' });
        }
      }
    }

    return results.slice(0, 5);
  } catch {
    return [];
  }
}

export async function getCompanyByInn(inn: string): Promise<OrgInfoResult | null> {
  try {
    const response = await fetch(
      `https://orginfo.uz/ru/organization/${inn}/`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CORVUS/3.0)' }, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return null;
    const html = await response.text();

    // Extract company name
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^|<]+)/i);
    const name = nameMatch ? nameMatch[1].trim() : `Компания ИНН ${inn}`;

    // Extract address
    const addrMatch = html.match(/(?:Адрес|address)[^:]*:\s*([^\n<]{10,100})/i);

    // Extract director
    const dirMatch = html.match(/(?:Директор|Руководитель)[^:]*:\s*([^\n<]{5,60})/i);

    // Extract registration date
    const regMatch = html.match(/(?:Дата регистрации|registration)[^:]*:\s*([^\n<]{5,30})/i);

    return {
      inn,
      name: name.replace(/\s+/g, ' '),
      director: dirMatch?.[1]?.trim(),
      address: addrMatch?.[1]?.trim(),
      registration_date: regMatch?.[1]?.trim(),
      source: 'orginfo',
    };
  } catch {
    return null;
  }
}
