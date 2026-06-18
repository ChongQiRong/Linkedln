import type { CandidateProfile, CompanyResearchSummary } from './types';

const skillHints = ['JavaScript','TypeScript','React','Next.js','Node.js','Python','SQL','PostgreSQL','AWS','Azure','GCP','Docker','Kubernetes','Terraform','CI/CD','Linux','Splunk','Security','Incident response','Red team','Data analysis','Machine learning','Leadership','Stakeholder management','Communication','Agile'];
const unique = (xs: string[]) => Array.from(new Set(xs.map(x => x.trim()).filter(Boolean))).slice(0, 20);
const sentences = (t: string) => t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+|\n|;/).map(x => x.trim()).filter(Boolean);

function extractSkills(text: string) {
  const lower = text.toLowerCase();
  const all = skillHints.filter(k => lower.includes(k.toLowerCase()));
  const requiredText = text.match(/(?:required|requirements|must have|qualifications)([\s\S]{0,900})/i)?.[1] ?? text;
  const preferredText = text.match(/(?:preferred|nice to have|bonus|plus)([\s\S]{0,700})/i)?.[1] ?? '';
  return {
    all: unique(all),
    required: unique(all.filter(k => requiredText.toLowerCase().includes(k.toLowerCase()))),
    preferred: unique(all.filter(k => preferredText.toLowerCase().includes(k.toLowerCase())))
  };
}

async function fetchText(url: string) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 JobTailorBot/1.0' }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) return { text: '', warning: `Could not fetch job URL: HTTP ${res.status}.` };
    const html = await res.text();
    return { text: html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000) };
  } catch (e) {
    return { text: '', warning: `Could not fetch job URL. Use pasted JD fallback. (${e instanceof Error ? e.message : 'unknown error'})` };
  }
}

async function search(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { snippets: [] as string[], sources: [] as string[], warning: `Search skipped for "${query}" because TAVILY_API_KEY is not configured.` };
  try {
    const res = await fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: apiKey, query, max_results: 5, include_answer: true }), signal: AbortSignal.timeout(12000) });
    if (!res.ok) return { snippets: [], sources: [], warning: `Search failed for "${query}": HTTP ${res.status}.` };
    const data = await res.json();
    return { snippets: [data.answer, ...(data.results ?? []).map((r: any) => r.content)].filter(Boolean), sources: (data.results ?? []).map((r: any) => r.url).filter(Boolean) };
  } catch (e) {
    return { snippets: [], sources: [], warning: `Search failed for "${query}".` };
  }
}

export async function researchCompany(profile: CandidateProfile): Promise<CompanyResearchSummary> {
  const warnings: string[] = [], sources: string[] = [];
  let jd = profile.targetJob.jobDescriptionText ?? '';
  if (profile.targetJob.jobPostingUrl?.trim()) {
    const fetched = await fetchText(profile.targetJob.jobPostingUrl.trim());
    if (fetched.warning) warnings.push(fetched.warning);
    if (fetched.text) { jd = `${fetched.text}\n${jd}`; sources.push(profile.targetJob.jobPostingUrl.trim()); }
  }
  const queries = [`${profile.targetJob.companyName} mission values culture`, `${profile.targetJob.companyName} ${profile.targetJob.roleTitle} team`, `${profile.targetJob.companyName} recent news 2024 2025`];
  const results = await Promise.all(queries.map(search));
  results.forEach(r => { sources.push(...r.sources); if (r.warning) warnings.push(r.warning); });
  if (!process.env.TAVILY_API_KEY) warnings.push('Company web research requires TAVILY_API_KEY. Production should configure Tavily or another search API.');
  const allText = `${jd}\n${results.flatMap(r => r.snippets).join('\n')}\n${profile.targetJob.teamRoleContext ?? ''}`;
  const lines = sentences(allText);
  const skills = extractSkills(jd);
  const priorities = unique(lines.filter(x => /build|lead|manage|develop|design|own|partner|implement|support|deliver|mission|value|customer|culture|team|security|growth/i.test(x))).slice(0, 8);
  const cultural = unique(lines.filter(x => /mission|value|culture|principle|customer|trust|ownership|integrity|collabor|communication/i.test(x))).slice(0, 8);
  const news = unique(lines.filter(x => /2024|2025|launch|acquire|partnership|funding|growth|strategy|expansion|AI|security|platform/i.test(x))).slice(0, 5);
  return { companyPriorities: priorities.length ? priorities : [`Deliver effectively in the ${profile.targetJob.roleTitle} role at ${profile.targetJob.companyName}`], keywordsAndPhrases: unique([...skills.all, profile.targetJob.roleTitle, profile.targetJob.companyName]), requiredSkills: skills.required.length ? skills.required : skills.all, preferredSkills: skills.preferred, culturalSignals: cultural, recentNews: news, sources: unique(sources), warnings: unique(warnings) };
}
