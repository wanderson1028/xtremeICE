// Difficulty multipliers
export const DIFF_MULT = {
  Beginner: 1.0,
  Intermediate: 1.3,
  Advanced: 1.6,
  Expert: 2.0,
};

// SOC simulation multipliers by mode
export const SOC_MODE_MULT = {
  training: 1.3,
  assessment: 1.6,
};

// Map lab titles to categories (partial match)
export const LAB_CATEGORY_MAP = {
  "Social Engineering": "Incident Response",
  "Digital Forensics": "Incident Response",
  "Cybersecurity Essentials": "Core Security",
  "Cryptography": "Exploitation",
  "Password Attacks": "Exploitation",
  "Web App Pentest": "Exploitation",
  "Vulnerability Assessment": "Exploitation",
  "Network Traffic Analysis": "SOC & Detection",
  "Network Security Monitoring": "SOC & Detection",
  "SIEM": "SOC & Detection",
  "Firewall Evasion": "SOC & Detection",
};

export const CATEGORIES = [
  "Overall",
  "SOC & Detection",
  "Exploitation",
  "Incident Response",
  "Core Security",
  "SOC Simulations",
];

// Normalize lab score → 0-100, then apply difficulty multiplier
export function labAdjustedScore(s) {
  if (!s.points_possible) return 0;
  return (s.points_earned / s.points_possible) * 100 * (DIFF_MULT[s.difficulty] || 1.0);
}

// SOC session adjusted score (already 0-100, apply mode multiplier)
export function socAdjustedScore(s) {
  return (s.score || 0) * (SOC_MODE_MULT[s.mode] || 1.3);
}

// Get category for a lab by title (partial match)
export function getLabCategory(labTitle) {
  if (!labTitle) return "Other";
  for (const [key, cat] of Object.entries(LAB_CATEGORY_MAP)) {
    if (labTitle.includes(key)) return cat;
  }
  return "Other";
}

function initUser(byUser, email, name) {
  byUser[email] = {
    user_email: email,
    user_name: name,
    total_adjusted: 0,
    category_scores: {},
    questions_correct: 0,
    questions_total: 0,
    expert_count: 0,
    advanced_count: 0,
    labs: [],
    soc_sessions: [],
  };
}

// Aggregate scores from LabScore records + SOCSession records into per-user data.
// Assessment attempts are AVERAGED (not best score).
export function aggregateUserScores(labScores, socSessions) {
  const byUser = {};

  // Group lab scores by user + lab_title → average all attempts
  const labGroups = {};
  for (const s of labScores) {
    if (!s.user_email) continue;
    const key = `${s.user_email}||${s.lab_title}`;
    if (!labGroups[key]) labGroups[key] = [];
    labGroups[key].push(s);
  }

  for (const attempts of Object.values(labGroups)) {
    const email = attempts[0].user_email;
    const n = attempts.length;
    const avgAdj = attempts.reduce((sum, s) => sum + labAdjustedScore(s), 0) / n;
    const avgQCorrect = attempts.reduce((sum, s) => sum + (s.questions_correct || 0), 0) / n;
    const avgQTotal = attempts.reduce((sum, s) => sum + (s.questions_total || 0), 0) / n;
    const category = getLabCategory(attempts[0].lab_title);
    const difficulty = attempts[0].difficulty;

    if (!byUser[email]) initUser(byUser, email, attempts[0].user_name || email);
    const u = byUser[email];
    u.total_adjusted += avgAdj;
    u.category_scores[category] = (u.category_scores[category] || 0) + avgAdj;
    u.questions_correct += avgQCorrect;
    u.questions_total += avgQTotal;
    if (difficulty === "Expert") u.expert_count++;
    if (difficulty === "Advanced") u.advanced_count++;
    u.labs.push({ lab_title: attempts[0].lab_title, attempts: n, adjusted: avgAdj, category, difficulty, accuracy: avgQTotal > 0 ? avgQCorrect / avgQTotal : null });
  }

  // Group SOC sessions by user + scenario_id → average all attempts
  const socGroups = {};
  for (const s of socSessions) {
    if (!s.user_email || s.status !== "completed") continue;
    const key = `${s.user_email}||${s.scenario_id}`;
    if (!socGroups[key]) socGroups[key] = [];
    socGroups[key].push(s);
  }

  for (const sessions of Object.values(socGroups)) {
    const email = sessions[0].user_email;
    const n = sessions.length;
    const avgAdj = sessions.reduce((sum, s) => sum + socAdjustedScore(s), 0) / n;

    if (!byUser[email]) initUser(byUser, email, sessions[0].user_name || email);
    const u = byUser[email];
    u.total_adjusted += avgAdj;
    u.category_scores["SOC Simulations"] = (u.category_scores["SOC Simulations"] || 0) + avgAdj;
    u.soc_sessions.push({ scenario_name: sessions[0].scenario_name, scenario_id: sessions[0].scenario_id, attempts: n, adjusted: avgAdj, mode: sessions[0].mode });
  }

  return byUser;
}

// Rank users for a category. Tiebreakers: Expert count → Advanced count → accuracy %
export function rankUsers(byUser, category) {
  return Object.values(byUser)
    .map(u => ({
      ...u,
      score: category === "Overall" ? u.total_adjusted : (u.category_scores[category] || 0),
    }))
    .filter(u => u.score > 0)
    .sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) return b.score - a.score;
      if (b.expert_count !== a.expert_count) return b.expert_count - a.expert_count;
      if (b.advanced_count !== a.advanced_count) return b.advanced_count - a.advanced_count;
      const accA = a.questions_total > 0 ? a.questions_correct / a.questions_total : 0;
      const accB = b.questions_total > 0 ? b.questions_correct / b.questions_total : 0;
      return accB - accA;
    });
}