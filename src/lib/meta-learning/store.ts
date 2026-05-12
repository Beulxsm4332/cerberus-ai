// Cerberus AI v4.0 — Meta-Learning Store
// In-memory store for learning experiences and self-evolution

import type { LearningExperience, MetaLearnedSkill } from '../tools/types';

// In-memory stores
const experiences: LearningExperience[] = [];
const learnedSkills: MetaLearnedSkill[] = [];

// ===== EXPERIENCE MANAGEMENT =====
export function recordExperience(experience: LearningExperience): void {
  experiences.push(experience);
  // Keep only last 1000 experiences to prevent memory bloat
  if (experiences.length > 1000) {
    experiences.splice(0, experiences.length - 1000);
  }
}

export function getRelevantExperiences(task: string): LearningExperience[] {
  if (experiences.length === 0) return [];

  const taskLower = task.toLowerCase();
  const taskWords = taskLower.split(/\s+/).filter(w => w.length > 3);

  return experiences
    .map(exp => {
      const expLower = `${exp.task} ${exp.approach} ${exp.outcome}`.toLowerCase();
      let score = 0;
      for (const word of taskWords) {
        if (expLower.includes(word)) score++;
      }
      return { exp, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ exp }) => exp);
}

export function getExperienceStats(): { total: number; avgRating: number; topTools: string[] } {
  const total = experiences.length;
  const avgRating = total > 0
    ? experiences.reduce((sum, e) => sum + e.rating, 0) / total
    : 0;

  const toolCounts = new Map<string, number>();
  for (const exp of experiences) {
    toolCounts.set(exp.toolName, (toolCounts.get(exp.toolName) || 0) + 1);
  }
  const topTools = Array.from(toolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return { total, avgRating: Math.round(avgRating * 10) / 10, topTools };
}

// ===== LEARNED SKILLS MANAGEMENT =====
export function createLearnedSkill(skill: MetaLearnedSkill): void {
  learnedSkills.push(skill);
}

export function getLearnedSkills(): MetaLearnedSkill[] {
  return [...learnedSkills];
}

export function improveSkill(skillId: string, feedback: string): void {
  const skill = learnedSkills.find(s => s.id === skillId);
  if (skill) {
    skill.learnedFrom.push(feedback);
    skill.updatedAt = Date.now();
    // Increase usage count to reflect engagement
    skill.usageCount++;
  }
}

// ===== SELF-EVOLUTION SUMMARY =====
export function getSelfEvolutionSummary(): string {
  const stats = getExperienceStats();
  const skillsCount = learnedSkills.length;

  if (stats.total === 0 && skillsCount === 0) {
    return '';
  }

  let summary = '\n## META-LEARNING DATA\n\n';
  summary += `- Total experiences recorded: ${stats.total}\n`;
  summary += `- Average success rating: ${stats.avgRating}/5\n`;
  if (stats.topTools.length > 0) {
    summary += `- Most used tools: ${stats.topTools.join(', ')}\n`;
  }
  if (skillsCount > 0) {
    summary += `- Learned skills: ${skillsCount}\n`;
    for (const skill of learnedSkills.slice(0, 3)) {
      summary += `  - ${skill.name}: ${skill.description} (success: ${Math.round(skill.successRate * 100)}%)\n`;
    }
  }

  // Add relevant past experiences if any
  return summary;
}

export function getContextForTask(task: string): string {
  const relevantExperiences = getRelevantExperiences(task);
  if (relevantExperiences.length === 0) return '';

  let context = '\n## RELEVANT PAST EXPERIENCES\n\n';
  for (const exp of relevantExperiences) {
    context += `- Task: ${exp.task}\n`;
    context += `  Approach: ${exp.approach}\n`;
    context += `  Outcome: ${exp.outcome} (Rating: ${exp.rating}/5)\n\n`;
  }
  return context;
}
