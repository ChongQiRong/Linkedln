import { z } from 'zod';

const s = z.string().trim();
const req = s.min(1, 'Required');
const opt = z.string().optional().default('');

export const candidateProfileSchema = z.object({
  personalInfo: z.object({ fullName: req, email: req, phone: req, linkedInUrl: opt, portfolioUrl: opt, location: req }),
  workExperience: z.array(z.object({ jobTitle: req, companyName: req, startEndDate: req, stillWorkingHere: z.boolean().default(false), keyResponsibilities: req, achievements: z.string().default(''), toolsTechnologies: z.string().default('') })).default([]),
  education: z.array(z.object({ degreeQualification: req, institution: req, graduationYear: req, relevantCoursework: opt })).default([]),
  skills: z.object({ technicalSkills: z.string().default(''), certifications: z.string().default(''), languagesSpoken: opt }),
  projects: z.array(z.object({ projectName: req, description: req, roleContribution: req, techStack: z.string().default(''), outcomeImpact: z.string().default('') })).default([]),
  careerIntent: z.object({ careerSummary: req, resumeEmphasis: z.string().default(''), excludedOrDownplayed: opt }),
  targetJob: z.object({ jobPostingUrl: opt, jobDescriptionText: opt, companyName: req, roleTitle: req, teamRoleContext: opt }),
  formatPreferences: z.object({ resumeLength: z.enum(['1 page', '2 pages', 'No limit']).default('2 pages'), tone: z.enum(['Concise and technical', 'Narrative and story-driven', 'Leadership and strategy-focused', 'Balanced']).default('Balanced') })
}).superRefine((data, ctx) => {
  if (!data.workExperience.length && !data.projects.length) ctx.addIssue({ code: 'custom', path: ['workExperience'], message: 'Add at least one work experience entry or one project.' });
  if (!data.targetJob.jobPostingUrl?.trim() && !data.targetJob.jobDescriptionText?.trim()) ctx.addIssue({ code: 'custom', path: ['targetJob', 'jobDescriptionText'], message: 'Provide either a job posting URL or the full job description text.' });
});
