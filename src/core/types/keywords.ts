/**
 * Shape of the keywords extracted from a job offer by the LLM.
 */

export interface Keywords {
  company_name: string;
  hard_skills: string[];
  soft_skills: string[];
  technologies: string[];
  responsibilities: string[];
  company_culture: string[];
  synonyms: {
    Vue_to_React: string[];
    general: string[];
  };
}
