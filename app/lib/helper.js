"use client";

export function entriesToMarkdown(entries) {
  return entries
    .map(
      (entry) => `
### ${entry.title} @ ${entry.organization}
${entry.current ? `${entry.startDate} - Present` : `${entry.startDate} - ${entry.endDate}`}

${entry.description}
`
    )
    .join("\n");
}

export function generateMarkdown({ contactInfo, summary, skills, experience, education, projects }, preview = false) {
  const lines = [];

  // Contact Information with centered name and right-aligned photo
  const photoSection = contactInfo.photo 
    ? `<div style="position: relative; width: 100%; margin: 30px 0;">
<div style="text-align: center; padding-top: 20px;">
<h1 style="font-size: 2.5rem; font-weight: bold; margin: 0;">${contactInfo.email}</h1>
</div>
<div style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); padding: 10px 20px 0 0;">
<img src="${contactInfo.photo}" alt="Profile Photo" width="80" height="80" style="border-radius: 50%; object-fit: cover;" />
</div>
</div>`
    : `<h1 style="font-size: 2.5rem; font-weight: bold; text-align: center; margin: 30px 0; padding-top: 30px;">${contactInfo.email}</h1>`;

  lines.push(photoSection);

  const contactLines = [];
  if (contactInfo.mobile) contactLines.push(`📱 ${contactInfo.mobile}`);
  if (contactInfo.linkedin) contactLines.push(`💼 [LinkedIn](${contactInfo.linkedin})`);
  if (contactInfo.twitter) contactLines.push(`🐦 [Twitter](${contactInfo.twitter})`);
  
  if (contactLines.length > 0) {
    lines.push(`<div align="center">${contactLines.join(" | ")}</div>`);
  }

  lines.push("\n## Professional Summary");
  lines.push(summary);

  lines.push("\n## Skills");
  lines.push(skills);

  if (experience?.length > 0) {
    lines.push("\n## Experience");
    lines.push(entriesToMarkdown(experience));
  }

  if (education?.length > 0) {
    lines.push("\n## Education");
    lines.push(entriesToMarkdown(education));
  }

  if (projects?.length > 0) {
    lines.push("\n## Projects");
    lines.push(entriesToMarkdown(projects));
  }

  return lines.join("\n");
}