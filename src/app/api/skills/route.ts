// Cerberus AI v3.0 — Skills API
// GET /api/skills — List all skills, search, filter by category or agent

import { NextRequest, NextResponse } from 'next/server';
import {
  skills,
  searchSkills,
  getSkillsByCategory,
  getSkillsByAgent,
  getSkillStats,
  getSkillById,
  type SkillCategory,
} from '@/lib/skills';

// GET /api/skills — List/search/filter skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') as SkillCategory | null;
    const agentId = searchParams.get('agent') || '';
    const skillId = searchParams.get('id') || '';
    const stats = searchParams.get('stats') === 'true';

    // Single skill lookup
    if (skillId) {
      const skill = getSkillById(skillId);
      if (!skill) {
        return NextResponse.json({ error: 'Skill tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({ skill });
    }

    // Stats overview
    if (stats) {
      return NextResponse.json(getSkillStats());
    }

    // Filter by agent
    if (agentId) {
      const result = getSkillsByAgent(agentId);
      return NextResponse.json({
        skills: result,
        total: result.length,
        agentId,
      });
    }

    // Filter by category
    if (category) {
      const result = getSkillsByCategory(category);
      return NextResponse.json({
        skills: result,
        total: result.length,
        category,
      });
    }

    // Search
    const result = searchSkills(query, category || undefined);
    return NextResponse.json({
      skills: result,
      total: result.length,
      query: query || undefined,
    });
  } catch (error) {
    console.error('[Cerberus Skills API Error]:', error);
    return NextResponse.json(
      { error: 'Gagal memuat daftar skill.' },
      { status: 500 }
    );
  }
}
