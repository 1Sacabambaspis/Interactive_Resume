export const DungeonModule = {
  hub: {
    id: "hub", name: "Main Portfolio Hub", spawnPoint: { rx: 0.5, ry: 0.5 }, theme: "bg-slate-900",
    triggers: [
      { id: "t_proj", type: "DUNGEON_EXIT", targetDungeon: "projects_zone", rx: 0.5, ry: 0.2, radius: 50, label: "Enter Project Archives" },
      { id: "t_edu", type: "DUNGEON_EXIT", targetDungeon: "education_zone", rx: 0.2, ry: 0.8, radius: 50, label: "Enter Educations" },
      { id: "t_soc", type: "DUNGEON_EXIT", targetDungeon: "socials_zone", rx: 0.8, ry: 0.8, radius: 50, label: "Enter Comms & Socials" }
      
    ],
    decor: [
    { id: 'd1', type: 'PILLAR', rx: 0.2, ry: 0.2 },
    { id: 'd2', type: 'PILLAR', rx: 0.8, ry: 0.2 },
    { id: 'd3', type: 'FLOOR_SEAL', rx: 0.5, ry: 0.5 }, // A large geometric pattern under the player
    ]
  },
  projects_zone: {
    id: "projects_zone", name: "Project Archives", spawnPoint: { rx: 0.5, ry: 0.8 }, theme: "bg-cyan-950",
    triggers: [
      { id: "p1", type: "PROJECT_TERMINAL", projectId: "nutrisafe", rx: 0.2, ry: 0.4, radius: 50, label: "NutriSafe AI" },
      { id: "p2", type: "PROJECT_TERMINAL", projectId: "laundry_ai", rx: 0.5, ry: 0.3, radius: 50, label: "Laundry Prediction AI" },
      { id: "p3", type: "PROJECT_TERMINAL", projectId: "database", rx: 0.8, ry: 0.4, radius: 50, label: "Data & Info Management" },
      { id: "exit", type: "DUNGEON_EXIT", targetDungeon: "hub", rx: 0.5, ry: 0.85, radius: 50, label: "Return to Hub" }
    ]
  },
  education_zone: {
    id: "education_zone", name: "Education", spawnPoint: { rx: 0.5, ry: 0.8 }, theme: "bg-blue-950",
    triggers: [
      { id: "e1", type: "INFO_BOARD", infoId: "degree", rx: 0.35, ry: 0.4, radius: 50, label: "View Degree & CGPA" },
      { id: "e2", type: "INFO_BOARD", infoId: "experience", rx: 0.65, ry: 0.4, radius: 50, label: "View Volunteering" },
      { id: "exit", type: "DUNGEON_EXIT", targetDungeon: "hub", rx: 0.5, ry: 0.85, radius: 50, label: "Return to Hub" }
    ]
  },
  socials_zone: {
    id: "socials_zone", name: "Communications Network", spawnPoint: { rx: 0.5, ry: 0.8 }, theme: "bg-purple-950",
    triggers: [
      { id: "s1", type: "EXTERNAL_LINK", url: "https://linkedin.com/in/chongjiaze", rx: 0.3, ry: 0.4, radius: 50, label: "Connect on LinkedIn" },
      { id: "s2", type: "GITHUB_RACK", rx: 0.7, ry: 0.4, radius: 50, label: "Inspect Live GitHub Server" },
      { id: "s3", type: "CONTACT_INFO", rx: 0.5, ry: 0.3, radius: 50, label: "View Contact Details" },
      { id: "exit", type: "DUNGEON_EXIT", targetDungeon: "hub", rx: 0.5, ry: 0.85, radius: 50, label: "Return to Hub" }
    ]
  }
  
};