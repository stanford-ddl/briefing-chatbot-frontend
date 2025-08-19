import { apiClient } from './api-client';

// Access codes mapping - in production, this would be in a database
// One access code per deliberation event - all participants share the same code
export const ACCESS_CODES = {
  // DDL Deliberation - All participants use this code
  '12345678': {
    documentId: '2025-genai-community-forum',
    deliberationTitle: '2025 GenAI Community Forum',
    eventDate: '2024-02-15'
  }
};

export const DOCUMENTS = {
  '2025-genai-community-forum': {
    title: '2025 GenAI Community Forum',
    description: 'Participants will deliberate on proposals to improve school choice, admissions, and governance in NYC public high schools. This briefing offers background, perspectives, and trade-offs to guide the conversation.',
    fileName: 'EN-2024-FINAL-GenAI-Community-Forum-Info-Pack.pdf'
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

export async function validateAccessCode(code: string) {
  // First check if the code exists in our mapping
  const accessData = ACCESS_CODES[code as keyof typeof ACCESS_CODES];
  if (!accessData) {
    return { valid: false, error: 'Invalid access code' };
  }

  const document = DOCUMENTS[accessData.documentId as keyof typeof DOCUMENTS];
  if (!document) {
    return { valid: false, error: 'Document not found' };
  }

  // Check if we should skip backend authentication (for development or when explicitly configured)
  const skipBackendAuth = process.env.NEXT_PUBLIC_SKIP_BACKEND_AUTH === 'true';

  if (skipBackendAuth) {
    console.log('Access code validated locally (backend authentication skipped):', code);
  } else {
    // 向後端驗證 access code，後端會透過 Set-Cookie 回傳 session cookie
    const authOk = await apiClient.authenticate(code);
    if (!authOk) {
      return { valid: false, error: 'Invalid access code' };
    }
  }

  return {
    valid: true,
    documentId: accessData.documentId,
    document,
    deliberationTitle: accessData.deliberationTitle
  };
}
