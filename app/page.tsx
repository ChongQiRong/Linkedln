'use client';

import { useMemo, useState } from 'react';
import type { CandidateProfile, GenerateResponse } from '@/lib/types';

type Screen = 'form' | 'loading' | 'output';
type Tab = 'resume' | 'coverLetter' | 'rationale';

const initial: CandidateProfile = {
  personalInfo: { fullName: '', email: '', phone: '', linkedInUrl: '', portfolioUrl: '', location: '' },
  workExperience: [{ jobTitle: '', companyName: '', startEndDate: '', stillWorkingHere: false, keyResponsibilities: '', achievements: '', toolsTechnologies: '' }],
  education: [{ degreeQualification: '', institution: '', graduationYear: '', relevantCoursework: '' }],
  skills: { technicalSkills: '', certifications: '', languagesSpoken: '' },
  projects: [{ projectName: '', description: '', roleContribution: '', techStack: '', outcomeImpact: '' }],
  careerIntent: { careerSummary: '', resumeEmphasis: '', excludedOrDownplayed: '' },
  targetJob: { jobPostingUrl: '', jobDescriptionText: '', companyName: '', roleTitle: '', teamRoleContext: '' },
  formatPreferences: { resumeLength: '2 pages', tone: 'Balanced' }
};

function anyValue(obj: Record<string, unknown>) { return Object.values(obj).some(v => typeof v === 'boolean' ? v : String(v ?? '').trim()); }
const labels: Record<Tab, string> = { resume: 'Resume', coverLetter: 'Cover Letter', rationale: 'Tailoring Rationale' };

export default function Home() {
  const [screen, setScreen] = useState<Screen>('form');
  const [stage, setStage] = useState(0);
  const [profile, setProfile] = useState<CandidateProfile>(initial);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [tab, setTab] = useState<Tab>('resume');
  const [error, setError] = useState('');
  const active = useMemo(() => result ? result[tab] : '', [result, tab]);

  const setGroup = <K extends keyof CandidateProfile>(group: K, key: string, value: string) => setProfile(p => ({ ...p, [group]: { ...(p[group] as object), [key]: value } }));
  const setArray = (name: 'workExperience'|'education'|'projects', i: number, key: string, value: string | boolean) => setProfile(p => ({ ...p, [name]: (p[name] as any[]).map((x, idx) => idx === i ? { ...x, [key]: value } : x) }));
  const add = (name: 'workExperience'|'education'|'projects') => setProfile(p => ({ ...p, [name]: [...(p[name] as any[]), name === 'workExperience' ? { jobTitle: '', companyName: '', startEndDate: '', stillWorkingHere: false, keyResponsibilities: '', achievements: '', toolsTechnologies: '' } : name === 'education' ? { degreeQualification: '', institution: '', graduationYear: '', relevantCoursework: '' } : { projectName: '', description: '', roleContribution: '', techStack: '', outcomeImpact: '' }] }));
  const remove = (name: 'workExperience'|'education'|'projects', i: number) => setProfile(p => ({ ...p, [name]: (p[name] as any[]).filter((_, idx) => idx !== i) }));

  async function submit() {
    setError(''); setScreen('loading'); setStage(0);
    const timer = setInterval(() => setStage(s => Math.min(2, s + 1)), 900);
    const payload = { ...profile, workExperience: profile.workExperience.filter(w => anyValue(w as any)), education: profile.education.filter(e => anyValue(e as any)), projects: profile.projects.filter(p => anyValue(p as any)) };
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.issues?.map((i: any) => i.message).join('\n') || data.error || 'Generation failed');
      setResult(data); setStage(2); setScreen('output');
    } catch (e) { setError(e instanceof Error ? e.message : 'Generation failed'); setScreen('form'); }
    finally { clearInterval(timer); }
  }

  async function download(kind: 'pdf'|'docx') {
    const res = await fetch(`/api/export/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: labels[tab], content: active }) });
    const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${labels[tab].toLowerCase().replaceAll(' ', '-')}.${kind}`; a.click(); URL.revokeObjectURL(url);
  }

  if (screen === 'loading') return <main><h1>Generating your tailored application</h1><p>Please wait while the required steps run in order.</p>{['Collecting your profile', 'Researching company', 'Building your resume'].map((s, i) => <div key={s} className={`stage ${stage > i ? 'done' : ''}`}>{stage > i ? '✓' : '•'} {s}</div>)}</main>;

  if (screen === 'output' && result) return <main><h1>Your tailored documents</h1><p>Review each tab, copy the text, or download a formatted file.</p><div className="tabs">{(['resume','coverLetter','rationale'] as Tab[]).map(t => <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{labels[t]}</button>)}</div><div className="row"><button onClick={() => download('pdf')}>Download PDF</button><button onClick={() => download('docx')} className="secondary">Download DOCX</button><button onClick={() => setScreen('form')} className="secondary">Edit inputs</button></div><div className="document">{active}</div>{result.companyResearch.warnings.length > 0 && <section><h2>Research warnings</h2><pre>{result.companyResearch.warnings.join('\n')}</pre></section>}</main>;

  return <main><h1>Job Tailor</h1><p>Fill in one form. The app researches the target company, then creates a tailored resume, cover letter, and tailoring rationale.</p>{error && <div className="error">{error}</div>}
    <section><h2>Section A: Personal Information</h2><div className="grid">
      <label>Full name<input value={profile.personalInfo.fullName} onChange={e => setGroup('personalInfo','fullName',e.target.value)} /></label><label>Email address<input value={profile.personalInfo.email} onChange={e => setGroup('personalInfo','email',e.target.value)} /></label><label>Phone number<input value={profile.personalInfo.phone} onChange={e => setGroup('personalInfo','phone',e.target.value)} /></label><label>LinkedIn URL <span className="optional">optional</span><input value={profile.personalInfo.linkedInUrl} onChange={e => setGroup('personalInfo','linkedInUrl',e.target.value)} /></label><label>Portfolio / GitHub URL <span className="optional">optional</span><input value={profile.personalInfo.portfolioUrl} onChange={e => setGroup('personalInfo','portfolioUrl',e.target.value)} /></label><label>Location / city<input value={profile.personalInfo.location} onChange={e => setGroup('personalInfo','location',e.target.value)} /></label>
    </div></section>

    <section><h2>Section B: Work Experience</h2>{profile.workExperience.map((w,i)=><div className="repeat" key={i}><div className="row"><h3>Role {i+1}</h3><button className="ghost" onClick={()=>remove('workExperience',i)}>Remove</button></div><div className="grid"><label>Job title<input value={w.jobTitle} onChange={e=>setArray('workExperience',i,'jobTitle',e.target.value)} /></label><label>Company name<input value={w.companyName} onChange={e=>setArray('workExperience',i,'companyName',e.target.value)} /></label><label>Start date / End date<input placeholder="Jan 2022 – Mar 2024" value={w.startEndDate} onChange={e=>setArray('workExperience',i,'startEndDate',e.target.value)} /></label><label className="row"><input type="checkbox" checked={w.stillWorkingHere} onChange={e=>setArray('workExperience',i,'stillWorkingHere',e.target.checked)} /> Still working here?</label><label className="full">Key responsibilities — what you did day to day<textarea value={w.keyResponsibilities} onChange={e=>setArray('workExperience',i,'keyResponsibilities',e.target.value)} /></label><label className="full">Achievements — specific results, numbers, impact<span className="optional">e.g. reduced incident response time by 40%, led a team of 5</span><textarea value={w.achievements} onChange={e=>setArray('workExperience',i,'achievements',e.target.value)} /></label><label className="full">Tools / technologies used in this role<input value={w.toolsTechnologies} onChange={e=>setArray('workExperience',i,'toolsTechnologies',e.target.value)} /></label></div></div>)}<button className="secondary" onClick={()=>add('workExperience')}>Add work experience</button></section>

    <section><h2>Section C: Education</h2>{profile.education.map((ed,i)=><div className="repeat" key={i}><div className="row"><h3>Qualification {i+1}</h3><button className="ghost" onClick={()=>remove('education',i)}>Remove</button></div><div className="grid"><label>Degree / qualification name<input value={ed.degreeQualification} onChange={e=>setArray('education',i,'degreeQualification',e.target.value)} /></label><label>Institution<input value={ed.institution} onChange={e=>setArray('education',i,'institution',e.target.value)} /></label><label>Graduation year<input value={ed.graduationYear} onChange={e=>setArray('education',i,'graduationYear',e.target.value)} /></label><label className="full">Relevant coursework, projects, or thesis <span className="optional">optional</span><textarea value={ed.relevantCoursework} onChange={e=>setArray('education',i,'relevantCoursework',e.target.value)} /></label></div></div>)}<button className="secondary" onClick={()=>add('education')}>Add education</button></section>

    <section><h2>Section D: Skills</h2><div className="grid"><label className="full">Technical skills<textarea value={profile.skills.technicalSkills} onChange={e=>setGroup('skills','technicalSkills',e.target.value)} /></label><label className="full">Certifications<span className="optional">name, issuing body, year</span><textarea value={profile.skills.certifications} onChange={e=>setGroup('skills','certifications',e.target.value)} /></label><label>Languages spoken <span className="optional">optional</span><input value={profile.skills.languagesSpoken} onChange={e=>setGroup('skills','languagesSpoken',e.target.value)} /></label></div></section>

    <section><h2>Section E: Projects</h2>{profile.projects.map((p,i)=><div className="repeat" key={i}><div className="row"><h3>Project {i+1}</h3><button className="ghost" onClick={()=>remove('projects',i)}>Remove</button></div><div className="grid"><label>Project name<input value={p.projectName} onChange={e=>setArray('projects',i,'projectName',e.target.value)} /></label><label>Tech stack / tools used<input value={p.techStack} onChange={e=>setArray('projects',i,'techStack',e.target.value)} /></label><label className="full">Description — what it does and why it exists<textarea value={p.description} onChange={e=>setArray('projects',i,'description',e.target.value)} /></label><label className="full">Your role and contribution<textarea value={p.roleContribution} onChange={e=>setArray('projects',i,'roleContribution',e.target.value)} /></label><label className="full">Outcome or impact<input value={p.outcomeImpact} onChange={e=>setArray('projects',i,'outcomeImpact',e.target.value)} /></label></div></div>)}<button className="secondary" onClick={()=>add('projects')}>Add project</button></section>

    <section><h2>Section F: Career Intent</h2><div className="grid"><label className="full">Career summary — who you are professionally, in your own words<span className="optional">Write 3–5 sentences about your background, what you care about, and what you're looking for next</span><textarea value={profile.careerIntent.careerSummary} onChange={e=>setGroup('careerIntent','careerSummary',e.target.value)} /></label><label className="full">What do you want this resume to emphasise?<span className="optional">e.g. leadership over technical, offensive security over compliance</span><textarea value={profile.careerIntent.resumeEmphasis} onChange={e=>setGroup('careerIntent','resumeEmphasis',e.target.value)} /></label><label className="full">Anything you want excluded or downplayed? <span className="optional">optional</span><textarea value={profile.careerIntent.excludedOrDownplayed} onChange={e=>setGroup('careerIntent','excludedOrDownplayed',e.target.value)} /></label></div></section>

    <section><h2>Section G: Target Job</h2><div className="grid"><label>Job posting URL<span className="optional">Paste the URL of the job listing</span><input value={profile.targetJob.jobPostingUrl} onChange={e=>setGroup('targetJob','jobPostingUrl',e.target.value)} /></label><label>Company name<input value={profile.targetJob.companyName} onChange={e=>setGroup('targetJob','companyName',e.target.value)} /></label><label>Role title<input value={profile.targetJob.roleTitle} onChange={e=>setGroup('targetJob','roleTitle',e.target.value)} /></label><label className="full">Job description text<span className="optional">If no URL, paste the full job description here</span><textarea value={profile.targetJob.jobDescriptionText} onChange={e=>setGroup('targetJob','jobDescriptionText',e.target.value)} /></label><label className="full">Anything you know about this team or role not in the JD?<span className="optional">e.g. team uses Splunk, 5-person red team, manager prioritises communication skills</span><textarea value={profile.targetJob.teamRoleContext} onChange={e=>setGroup('targetJob','teamRoleContext',e.target.value)} /></label></div></section>

    <section><h2>Section H: Format Preferences</h2><div className="grid"><label>Resume length<select value={profile.formatPreferences.resumeLength} onChange={e=>setGroup('formatPreferences','resumeLength',e.target.value)}><option>1 page</option><option>2 pages</option><option>No limit</option></select></label><label>Tone<select value={profile.formatPreferences.tone} onChange={e=>setGroup('formatPreferences','tone',e.target.value)}><option>Concise and technical</option><option>Narrative and story-driven</option><option>Leadership and strategy-focused</option><option>Balanced</option></select></label></div></section>
    <button onClick={submit}>Generate</button>
  </main>;
}
