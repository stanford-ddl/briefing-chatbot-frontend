// Access codes mapping - in production, this would be in a database
// One access code per deliberation event - all participants share the same code
export const ACCESS_CODES = {
  // DDL Deliberation - All participants use this code
  'DDL': {
    documentId: 'new-school-briefing',
    deliberationTitle: 'New School Policy Deliberation',
    eventDate: '2024-02-15'
  }
};

export const DOCUMENTS = {
  'new-school-briefing': {
    title: 'New School Policy Deliberation',
    description: 'Participants will deliberate on proposals to improve school choice, admissions, and governance in NYC public high schools. This briefing offers background, perspectives, and trade-offs to guide the conversation.',
    fileName: 'new-school-briefing-materials.pdf'
  },
  'climate-policy': {
    title: 'Climate Policy Framework 2024',
    description: 'A comprehensive briefing on proposed climate change policies and their economic implications.',
    fileName: 'climate-policy-brief.pdf'
  },
  'healthcare-reform': {
    title: 'Healthcare System Reform Proposal',
    description: 'Analysis of proposed healthcare reforms and their impact on accessibility and costs.',
    fileName: 'healthcare-reform-brief.pdf'
  },
  'education-funding': {
    title: 'Education Funding Initiative',
    description: 'Overview of new education funding proposals and distribution mechanisms.',
    fileName: 'education-funding-brief.pdf'
  }
};

export function validateAccessCode(code: string) {
  const accessData = ACCESS_CODES[code as keyof typeof ACCESS_CODES];
  if (!accessData) {
    return { valid: false, error: 'Invalid access code' };
  }
  
  const document = DOCUMENTS[accessData.documentId as keyof typeof DOCUMENTS];
  if (!document) {
    return { valid: false, error: 'Document not found' };
  }
  
  return {
    valid: true,
    documentId: accessData.documentId,
    document,
    deliberationTitle: accessData.deliberationTitle
  };
}
