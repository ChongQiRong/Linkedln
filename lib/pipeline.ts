import { candidateProfileSchema } from './validation';
import { researchCompany } from './research';
import type { CandidateProfile, CompanyResearchSummary, GenerateResponse, RelevanceMap } from './types';

const forbidden = ['passionate about', 'results-driven', 'team player', 'dynamic', 'synergy'];
const parts = (s: string) => s.split(/,|\n|;/).map(x => x.trim()).filter(Boolean);
const norm = (s: string) => s.toLowerCase();
const hasAny = (text: string, terms: string[]) => terms.some(t => t && norm(text).includes(norm(t)));
const first = (s: string) => s.split(/(?<=[.!?])\s+/)[0]?.trim() || s.trim();

function relevance(profile: CandidateProfile, research: CompanyResearchSummary): RelevanceMap {
  const skills = parts(`${profile.skills.technicalSkills}\n${profile.skills.certifications}\n${profile.skills.languagesSpoken ?? ''}`);
  const evidence = [
    ...profile.workExperience.map(w => ({ type: 'experience' as const, label: `${w.jobTitle} at ${w.companyName}`, text: `${w.keyResponsibilities} ${w.achievements} ${w.toolsTechnologies}` })),
    ...profile.projects.map(p => ({ type: 'project' as const, label: p.projectName, text: `${p.description} ${p.roleContribution} ${p.techStack} ${p.outcomeImpact}` })),
    ...skills.map(s => ({ type: 'skill' as const, label: s, text: s }))
  ];
  const priorityMatches = research.companyPriorities.map(priority => {
    const match = evidence.find(e => hasAny(e.text, [priority, ...research.keywordsAndPhrases]));
    return { priority, strongestMatch: match?.label ?? 'No direct evidence found in profile', evidenceType: match?.type ?? 'none' as const };
  });
  const skillText = norm(skills.join(' '));
  const missingRequiredSkills = research.requiredSkills.filter(skill => !skillText.includes(norm(skill)));
  const used = new Set(priorityMatches.map(m => m.strongestMatch));
  const minimizedItems = [...profile.workExperience.map(w => `${w.jobTitle} at ${w.companyName}`), ...profile.projects.map(p => p.projectName)].filter(x => !used.has(x));
  const best = priorityMatches.find(m => m.evidenceType !== 'none');
  return { priorityMatches, minimizedItems, missingRequiredSkills, strongestAngle: best ? `Lead with ${best.strongestMatch} because it maps most directly to ${best.priority}` : `Lead with the candidate's stated career summary and closest listed skills for ${profile.targetJob.roleTitle} at ${profile.targetJob.companyName}` };
}

function bullet(action: string, work: string, result: string, keywords: string[]) {
  return `- ${action} ${work.trim()}${result ? `, resulting in ${result.trim()}` : ', with result/scale not specified by the candidate'}${keywords.length ? `, aligning with ${keywords.join(', ')}` : ''}.`;
}

function generate(profile: CandidateProfile, research: CompanyResearchSummary, map: RelevanceMap) {
  const contact = [profile.personalInfo.email, profile.personalInfo.phone, profile.personalInfo.location, profile.personalInfo.linkedInUrl, profile.personalInfo.portfolioUrl].filter(Boolean).join(' | ');
  const skills = parts(profile.skills.technicalSkills).sort((a, b) => Number(hasAny(b, research.keywordsAndPhrases)) - Number(hasAny(a, research.keywordsAndPhrases)));
  const certs = parts(profile.skills.certifications);
  const strongest = map.priorityMatches.find(m => m.evidenceType !== 'none')?.strongestMatch ?? profile.targetJob.roleTitle;
  const achievement = profile.workExperience.map(w => w.achievements).find(Boolean) || profile.projects.map(p => p.outcomeImpact).find(Boolean) || 'impact described in the submitted profile';
  const summary = `${first(profile.careerIntent.careerSummary)} Their most relevant strength for this ${profile.targetJob.roleTitle} role is ${strongest}. Their profile includes ${first(achievement)}. They are seeking to apply this background to ${profile.targetJob.companyName}'s ${profile.targetJob.roleTitle} role.`;
  const max = profile.formatPreferences.resumeLength === '1 page' ? 3 : 5;
  const work = profile.workExperience.map(w => {
    const rel = map.priorityMatches.some(m => m.strongestMatch === `${w.jobTitle} at ${w.companyName}`);
    const resp = parts(w.keyResponsibilities).slice(0, rel ? max : 2);
    const ach = parts(w.achievements);
    const kws = research.keywordsAndPhrases.filter(k => hasAny(`${w.keyResponsibilities} ${w.achievements} ${w.toolsTechnologies}`, [k])).slice(0, 3);
    return `### ${w.jobTitle} — ${w.companyName}\n${w.startEndDate}${w.stillWorkingHere ? ' | Present' : ''}\n${(resp.length ? resp : [w.keyResponsibilities]).map((r, i) => bullet(['Led','Built','Managed','Delivered','Improved'][i] ?? 'Delivered', r, ach[i] ?? ach[0] ?? '', kws)).join('\n')}`;
  }).join('\n\n');
  const projects = profile.projects.filter(p => hasAny(`${p.description} ${p.roleContribution} ${p.techStack} ${p.outcomeImpact}`, research.keywordsAndPhrases.concat(research.companyPriorities)) || profile.projects.length <= 2).map(p => `### ${p.projectName}\n${first(p.description)}. ${first(p.roleContribution)}. ${p.outcomeImpact || p.techStack || 'Outcome or technology details were not specified by the candidate.'}`).join('\n\n');
  const education = profile.education.map(e => `### ${e.degreeQualification}\n${e.institution}, ${e.graduationYear}${e.relevantCoursework && hasAny(e.relevantCoursework, research.keywordsAndPhrases) ? `\nRelevant coursework/projects: ${e.relevantCoursework}` : ''}`).join('\n\n');
  let resume = `# ${profile.personalInfo.fullName}\n${contact}\n\n## Summary\n${summary}\n\n## Work Experience\n${work || 'No work experience provided.'}\n\n## Skills\n${[...skills, profile.skills.languagesSpoken].filter(Boolean).join(', ') || 'No skills listed.'}\n\n## Projects\n${projects || 'No directly relevant projects selected.'}\n\n## Education\n${education || 'No education provided.'}\n\n## Certifications\n${certs.join(', ') || 'No certifications listed.'}`;
  forbidden.forEach(f => { resume = resume.replace(new RegExp(f, 'ig'), ''); });
  const companySignal = research.culturalSignals[0] || research.recentNews[0] || research.companyPriorities[0];
  const evidence = map.priorityMatches.filter(m => m.evidenceType !== 'none').slice(0, 2).map(m => `${m.strongestMatch} is relevant because it maps to ${m.priority}. The submitted profile provides this evidence without adding unlisted skills or invented metrics.`).join(' ');
  const coverLetter = `${profile.personalInfo.fullName}\n${contact}\n\n${profile.targetJob.companyName}'s focus on ${companySignal} makes the ${profile.targetJob.roleTitle} role a strong fit now. My background points most clearly toward ${map.strongestAngle.replace(/^Lead with /, '')}.\n\n${evidence || 'The submitted profile has limited direct evidence for the researched priorities, so the application should lead honestly with the closest listed experience and clearly acknowledge gaps.'}\n\nThis fit is strongest where my submitted experience overlaps with ${profile.targetJob.companyName}'s stated priorities and role requirements. I would welcome the opportunity to discuss how I can contribute to the ${profile.targetJob.roleTitle} team and support the mission with the evidence shown in my profile.`;
  const rationale = `# Tailoring Rationale\n\n## What we led with and why\n${map.strongestAngle}. This was selected because it is the strongest traceable overlap between the profile and company/JD research.\n\n## What was emphasised\n${map.priorityMatches.filter(m => m.evidenceType !== 'none').slice(0, 5).map(m => `- ${m.strongestMatch}: maps to ${m.priority}`).join('\n') || '- No strong direct matches were found; the resume stays conservative.'}\n\n## What was cut or minimised\n${map.minimizedItems.map(i => `- ${i}: lower relevance to the researched company priorities or JD signals.`).join('\n') || '- Nothing significant was cut or minimised.'}\n\n## Keywords mirrored\n${research.keywordsAndPhrases.filter(k => norm(resume).includes(norm(k))).map(k => `- ${k}: appears in resume where supported by the profile`).join('\n') || '- No specific company/JD keywords could be safely mirrored.'}\n\n## Gaps flagged\n${map.missingRequiredSkills.map(g => `- ${g}`).join('\n') || '- No required skills from the extracted JD were absent from the listed skills.'}\n\n## Research warnings\n${research.warnings.map(w => `- ${w}`).join('\n') || '- None.'}`;
  return { resume, coverLetter, rationale };
}

export async function runGeneratePipeline(input: unknown): Promise<GenerateResponse> {
  const profile = candidateProfileSchema.parse(input) as CandidateProfile;
  const companyResearch = await researchCompany(profile);
  const relevanceMap = relevance(profile, companyResearch);
  return { ...generate(profile, companyResearch, relevanceMap), profile, companyResearch, relevanceMap };
}
