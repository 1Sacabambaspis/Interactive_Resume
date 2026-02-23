export const ProjectRegistry = {
  nutrisafe: {
    id: "nutrisafe",
    title: "NutriSafe AI",
    subtitle: "Privacy-Focused Food Calorie Checker",
    role: "AI & Cloud Security",
    architecture: "Cloud-based health application focusing on data protection and regulatory readiness.",
    impact: [
      "Enables safer AI-based food tracking by minimising exposure of sensitive user data.",
      "Improves user trust and regulatory readiness for cloud-based health applications.",
      "Demonstrates privacy-preserving cloud and authentication design."
    ],
    techStack: ["Python", "AI", "Cloud Security"],
    aiCredits: [
      { toolName: "Gemini API", provider: "Google", usagePurpose: "Core application feature for image/calorie analysis.", scopeLimitations: "Integrated via API; data sanitization logic written manually." },
      { toolName: "ChatGPT", provider: "OpenAI", usagePurpose: "Architecture planning and security edge-case brainstorming.", scopeLimitations: "All cloud security configurations and code were manually written and reviewed." }
    ]
  },
  laundry_ai: {
    id: "laundry_ai",
    title: "Laundry Prediction AI",
    subtitle: "Desktop Prediction System",
    role: "Python/PyQt5 Developer",
    architecture: "Data-driven desktop application for workload prediction and logistics automation.",
    impact: [
      "Improves operational planning through data-driven workload prediction.",
      "Reduces manual tracking and human error through automation.",
      "Supports small-scale service efficiency without complex infrastructure."
    ],
    techStack: ["Python", "PyQt5"],
    
    aiCredits: [
      { toolName: "ChatGPT", provider: "OpenAI", usagePurpose: "PyQt5 UI thread debugging and algorithm structuring.", scopeLimitations: "Prediction algorithms were manually validated against test datasets." }
    ]
  },
  database: {
    id: "database",
    title: "Data & Info Management",
    subtitle: "Enterprise Database Architecture",
    role: "Database Designer",
    architecture: "Relational database designed for operational analytics and long-term scalability.",
    impact: [
      "Improves data integrity, consistency and long-term scalability.",
      "Enables reliable reporting and analytics for operational systems."
    ],
    techStack: ["Oracle SQL", "Database Design"],
    
    aiCredits: [
      { toolName: "ChatGPT", provider: "OpenAI", usagePurpose: "SQL query optimization and ERD conceptualization.", scopeLimitations: "Schema normalization and final Oracle SQL implementation were executed manually." }
    ]
  }
};