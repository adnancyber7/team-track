import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { agents, csSheetData, analysisType } = await req.json();

    if (!agents || !csSheetData) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Prepare performance data for AI analysis
    const performanceData = {
      agents: agents.map(agent => ({
        username: agent.username,
        metrics: agent.metrics,
        rejectionReasons: agent.rejectionReasons || {},
        avgHandlingTime: agent.avgHandlingTime || 0,
        rejectionRate: agent.rejectionRate || 0,
        completedToday: agent.todayCompleted || 0,
        completedWeek: agent.weekCompleted || 0,
        totalCompleted: agent.totalCompleted || 0,
        totalRejected: agent.totalRejected || 0
      })),
      overallStats: csSheetData.overallStats || {},
      timestamp: new Date().toISOString()
    };

    const analysisPrompts = {
      full: `You are a workforce performance analyst for DHL operations. Analyze this agent performance data and provide comprehensive insights.

Performance Data:
${JSON.stringify(performanceData, null, 2)}

Provide detailed analysis in the following areas:
1. **Common Rejection Patterns**: Identify the most frequent rejection reasons and which agents are affected
2. **Workflow Bottlenecks**: Detect inefficiencies, slow processing times, or workload imbalances
3. **Task Assignment Optimization**: Suggest how to better assign tasks based on each agent's strengths and performance history
4. **Training Needs**: Flag agents who need additional support or training based on rejection rates, processing speed, or error patterns
5. **Performance Trends**: Identify improving or declining performance patterns
6. **Risk Factors**: Highlight any concerning metrics that could impact operations

Be specific with agent names and metrics. Provide actionable recommendations.`,

      rejections: `Analyze rejection patterns in this DHL agent performance data:

${JSON.stringify(performanceData, null, 2)}

Focus on:
- Most common rejection reasons across all agents
- Which agents have the highest rejection rates
- Patterns in rejection types (are certain regions or reasons more problematic?)
- Root cause analysis
- Specific recommendations to reduce rejections`,

      assignments: `Analyze agent performance to optimize task assignments:

${JSON.stringify(performanceData, null, 2)}

Provide:
- Which agents excel at which types of tasks
- Optimal workload distribution suggestions
- Agents who are over/under-utilized
- Skills-based assignment recommendations`,

      training: `Identify agents needing support or training:

${JSON.stringify(performanceData, null, 2)}

Flag agents with:
- High rejection rates (>20%)
- Slow processing times compared to team average
- Declining performance trends
- Specific skill gaps
- Recommended training interventions for each agent`
    };

    const prompt = analysisPrompts[analysisType] || analysisPrompts.full;

    // --- Simple persistent cache using AppState (state_key: 'analysis_cache') ---
    const encoder = new TextEncoder();
    const cacheInput = JSON.stringify({ analysisType: analysisType || 'full', performanceData });
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(cacheInput));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    let cacheRec = null;
    try {
      const rows = await base44.entities.AppState.filter({ state_key: 'analysis_cache' });
      cacheRec = rows && rows[0] ? rows[0] : null;
    } catch {}

    const nowIso = new Date().toISOString();
    if (cacheRec && cacheRec.data && cacheRec.data[hash]) {
      const cached = cacheRec.data[hash];
      return Response.json({ success: true, analysis: cached.analysis, analyzedAt: cached.analyzedAt, cached: true });
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Executive summary of key findings"
          },
          rejectionAnalysis: {
            type: "object",
            properties: {
              topReasons: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    reason: { type: "string" },
                    count: { type: "number" },
                    affectedAgents: { type: "array", items: { type: "string" } },
                    recommendation: { type: "string" }
                  }
                }
              },
              systemicIssues: { type: "array", items: { type: "string" } }
            }
          },
          bottlenecks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                affectedAgents: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" }
              }
            }
          },
          assignmentOptimization: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    agent: { type: "string" },
                    recommendation: { type: "string" },
                    rationale: { type: "string" }
                  }
                }
              },
              workloadBalance: { type: "string" }
            }
          },
          trainingNeeds: {
            type: "array",
            items: {
              type: "object",
              properties: {
                agent: { type: "string" },
                priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                issues: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                metrics: { type: "string" }
              }
            }
          },
          actionableInsights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                insight: { type: "string" },
                impact: { type: "string", enum: ["low", "medium", "high"] },
                action: { type: "string" },
                timeline: { type: "string" }
              }
            }
          }
        }
      }
    });

    const resultPayload = {
      success: true,
      analysis: response,
      analyzedAt: new Date().toISOString()
    };

    // Upsert cache (keep max 20 entries)
    try {
      if (cacheRec) {
        const data = cacheRec.data || {};
        data[hash] = { analysis: response, analyzedAt: resultPayload.analyzedAt, createdAt: nowIso };
        // prune oldest if > 20
        const keys = Object.keys(data);
        if (keys.length > 20) {
          keys
            .sort((a, b) => new Date(data[a].createdAt) - new Date(data[b].createdAt))
            .slice(0, keys.length - 20)
            .forEach(k => delete data[k]);
        }
        await base44.entities.AppState.update(cacheRec.id, { data });
      } else {
        const data = {};
        data[hash] = { analysis: response, analyzedAt: resultPayload.analyzedAt, createdAt: nowIso };
        await base44.entities.AppState.create({ state_key: 'analysis_cache', data });
      }
    } catch {}

    return Response.json(resultPayload);
  } catch (error) {
    console.error('Performance analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});