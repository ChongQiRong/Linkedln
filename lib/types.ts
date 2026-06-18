export type ResumeLength = '1 page' | '2 pages' | 'No limit';
export type Tone = 'Concise and technical' | 'Narrative and story-driven' | 'Leadership and strategy-focused' | 'Balanced';

export interface WorkExperience { jobTitle: string; companyName: string; startEndDate: string; stillWorkingHere: boolean; keyResponsibilities: string; achievements: string; toolsTechnologies: string; }
export interface Education { degreeQualification: string; institution: string; graduationYear: string; relevantCoursework?: string; }
export interface Project { projectName: string; description: string; roleContribution: string; techStack: string; outcomeImpact: string; }

export interface CandidateProfile {
  personalInfo: { fullName: string; email: string; phone: string; linkedInUrl?: string; portfolioUrl?: string; location: string; };
  workExperience: WorkExperience[];
  education: Education[];
  skills: { technicalSkills: string; certifications: string; languagesSpoken?: string; };
  projects: Project[];
  careerIntent: { careerSummary: string; resumeEmphasis: string; excludedOrDownplayed?: string; };
  targetJob: { jobPostingUrl?: string; jobDescriptionText?: string; companyName: string; roleTitle: string; teamRoleContext?: string; };
  formatPreferences: { resumeLength: ResumeLength; tone: Tone; };
}

export interface CompanyResearchSummary {
  companyPriorities: string[];
  keywordsAndPhrases: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  culturalSignals: string[];
  recentNews: string[];
  sources: string[];
  warnings: string[];
}

export interface RelevanceMap {
  priorityMatches: Array<{ priority: string; strongestMatch: string; evidenceType: 'experience' | 'skill' | 'project' | 'education' | 'none' }>;
  minimizedItems: string[];
  missingRequiredSkills: string[];
  strongestAngle: string;
}

export interface GenerateResponse {
  resume: string;
  coverLetter: string;
  rationale: string;
  profile: CandidateProfile;
  companyResearch: CompanyResearchSummary;
  relevanceMap: RelevanceMap;
}
