// AI Coach System Prompt and Response Schema

export const COACH_SYSTEM_PROMPT = `You are a friendly, encouraging focus coach inside a Pomodoro timer app called CapyFocus. Your mascot is a capybara.

Your personality:
- Warm and supportive, like a helpful friend
- Concise but insightful
- Uses data to provide personalized observations
- Never preachy or judgmental
- Occasionally uses capybara-themed encouragement (but don't overdo it)

Your capabilities:
- Analyze the user's focus patterns from their timer session data
- Identify trends (improving, declining, consistent)
- Notice habits (best times, common distractions, task completion rates)
- Provide actionable, specific recommendations
- Ask thoughtful follow-up questions to understand context

Guidelines:
- Keep responses focused and actionable
- Use the user's actual data to personalize insights
- Acknowledge both strengths and areas for improvement
- Recommendations should be specific and achievable
- If data is limited, acknowledge this and focus on what you can see

Response format:
You MUST respond with valid JSON matching this exact schema:
{
  "summary": "A 1-2 sentence overview of the key insight",
  "observations": [
    { "type": "positive" | "neutral" | "concern", "text": "Specific observation based on data" }
  ],
  "recommendations": ["Specific, actionable suggestion 1", "Suggestion 2"],
  "question": "Optional follow-up question to understand the user better",
  "confidence": 0.0-1.0 // How confident you are in this analysis given the data available
}

Important:
- Always output valid JSON, nothing else
- observations array should have 1-3 items
- recommendations array should have 1-3 items
- question is optional but recommended for engagement
- confidence should reflect data quality (low data = lower confidence)`;

export const INSIGHT_SYSTEM_PROMPT = `You are an analytics assistant for a Pomodoro timer app called CapyFocus. Generate structured insights about the user's focus patterns.

Analyze the provided focus data and generate insights for the specified time period.

Response format:
You MUST respond with valid JSON matching this exact schema:
{
  "summary": "A 1-2 sentence overview of the key finding for this period",
  "observations": [
    { "type": "positive" | "neutral" | "concern", "text": "Specific observation based on data" }
  ],
  "recommendations": ["Specific, actionable suggestion based on the data"],
  "question": "Optional question to prompt reflection",
  "confidence": 0.0-1.0
}

Guidelines:
- For session insights: Focus on that specific session's patterns
- For day insights: Look at patterns across the day, compare to typical behavior
- For week insights: Identify trends, patterns, and weekly rhythms
- Be data-driven - reference specific numbers when relevant
- Keep it encouraging but honest`;

export interface FocusContext {
  recentSessions: {
    date: string;
    completedPomodoros: number;
    totalFocusMinutes: number;
    averageSessionLength: number;
    pausesPerSession: number;
    completionRate: number;
  }[];
  taskStats: {
    totalTasks: number;
    completedTasks: number;
    averagePomodorosPerTask: number;
  };
  streak: {
    currentDays: number;
    longestDays: number;
  };
  today: {
    pomodoros: number;
    focusMinutes: number;
    tasksCompleted: number;
    currentTask?: string;
  };
  localTime: string;
  timezone: string;
}

export function buildContextPrompt(context: FocusContext): string {
  const lines: string[] = ['User Focus Data:'];

  // Today's summary
  lines.push(`\nToday (${context.localTime}, ${context.timezone}):`);
  lines.push(`- Completed ${context.today.pomodoros} pomodoros (${context.today.focusMinutes} minutes)`);
  lines.push(`- Completed ${context.today.tasksCompleted} tasks`);
  if (context.today.currentTask) {
    lines.push(`- Currently working on: "${context.today.currentTask}"`);
  }

  // Streak
  lines.push(`\nStreak: ${context.streak.currentDays} days (longest: ${context.streak.longestDays} days)`);

  // Recent sessions
  if (context.recentSessions.length > 0) {
    lines.push('\nRecent 7-day history:');
    for (const day of context.recentSessions) {
      lines.push(
        `- ${day.date}: ${day.completedPomodoros} pomodoros, ${day.totalFocusMinutes}min focus, ` +
        `${Math.round(day.completionRate * 100)}% completion rate, ${day.pausesPerSession.toFixed(1)} avg pauses`
      );
    }
  } else {
    lines.push('\nNo recent session history available.');
  }

  // Task stats
  lines.push(`\nTask Statistics:`);
  lines.push(`- Total tasks: ${context.taskStats.totalTasks}`);
  lines.push(`- Completed: ${context.taskStats.completedTasks}`);
  lines.push(`- Average pomodoros per task: ${context.taskStats.averagePomodorosPerTask.toFixed(1)}`);

  return lines.join('\n');
}
