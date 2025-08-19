import React, { useState } from 'react';

interface TOCSubsection {
  id: string;
  title: string;
  page: number;
  endPage?: number;
  estimatedReadTime?: number;
}

interface TOCSection {
  id: string;
  title: string;
  page: number;
  endPage?: number;
  subsections?: TOCSubsection[];
  estimatedReadTime?: number;
}

// Table of Contents data based on your PDF
const tableOfContents: TOCSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    page: 5,
    endPage: 8,
    estimatedReadTime: 8,
    subsections: [
      { id: 'note-from-meta', title: 'A Note from Meta', page: 6, estimatedReadTime: 2 },
      { id: 'your-role', title: 'Your role as a Community Forum participant', page: 7, estimatedReadTime: 3 },
      { id: 'topic-forum', title: 'The topic of the Forum', page: 8, estimatedReadTime: 3 }
    ]
  },
  {
    id: 'ai-overview',
    title: 'An Overview of Artificial Intelligence',
    page: 9,
    endPage: 18,
    estimatedReadTime: 15,
    subsections: [
      { id: 'what-is-ai', title: 'What is "AI"?', page: 10, estimatedReadTime: 3 },
      { id: 'generative-ai', title: 'Generative AI', page: 10, estimatedReadTime: 3 },
      { id: 'building-ai-model', title: 'Building an AI Model', page: 10, estimatedReadTime: 5 },
      { id: 'training-step', title: 'Step 1: Training', page: 11, estimatedReadTime: 2 },
      { id: 'fine-tuning-step', title: 'Step 2: Fine-tuning', page: 12, estimatedReadTime: 2 },
      { id: 'ai-agents-vs-chatbots', title: 'How AI agents differ from chatbots', page: 15, estimatedReadTime: 3 },
      { id: 'generative-ai-tech', title: 'Generative AI Technologies', page: 17, estimatedReadTime: 2 }
    ]
  },
  {
    id: 'limitations',
    title: 'The Limitations of Generative AI',
    page: 19,
    endPage: 22,
    estimatedReadTime: 10,
    subsections: [
      { id: 'data-dependency', title: 'Data Dependency', page: 20, estimatedReadTime: 2 },
      { id: 'data-privacy', title: 'Data Privacy', page: 21, estimatedReadTime: 2 },
      { id: 'model-limitations', title: 'Model Limitations', page: 22, estimatedReadTime: 3 },
      { id: 'user-behavior', title: 'User Behavior', page: 22, estimatedReadTime: 3 }
    ]
  },
  {
    id: 'responsible-ai',
    title: 'Building Generative AI Responsibly',
    page: 23,
    endPage: 25,
    estimatedReadTime: 5,
    subsections: [
      { id: 'what-is-responsible-ai', title: 'What is "Responsible AI"?', page: 24, estimatedReadTime: 3 }
    ]
  },
  {
    id: 'proposals',
    title: 'Proposals',
    page: 26,
    endPage: 49,
    estimatedReadTime: 20,
    subsections: [
      { id: 'session-1', title: 'Session 1: How should AI agents provide proactive, personalized experiences?', page: 29, endPage: 38, estimatedReadTime: 10 },
      { id: 'session-2', title: 'Session 2: How should AI agents and users interact?', page: 39, endPage: 49, estimatedReadTime: 10 }
    ]
  },
  {
    id: 'guiding-principles',
    title: 'Guiding Principles for Participation',
    page: 50,
    estimatedReadTime: 5
  },
  {
    id: 'glossary',
    title: 'Glossary of Terms',
    page: 51,
    endPage: 53,
    estimatedReadTime: 3
  },
  {
    id: 'endnotes',
    title: 'Endnotes',
    page: 54,
    estimatedReadTime: 2
  }
];

interface TableOfContentsProps {
  onSectionClick: (sectionId: string, page: number) => void;
  chatInteractions?: string[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  onSectionClick,
  chatInteractions = []
}) => {
  const [currentSection, setCurrentSection] = useState<string>('');

  // Handle section click
  const handleSectionClick = (section: TOCSection | TOCSubsection) => {
    setCurrentSection(section.id);
    onSectionClick(section.id, section.page);
  };

  return (
    <div className="w-full bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          Contents
        </h3>
      </div>

      {/* Table of Contents */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tableOfContents.map((section) => (
          <div key={section.id} className="space-y-1">
            {/* Main Section */}
            <button
              onClick={() => handleSectionClick(section)}
              className={`w-full text-left p-2 rounded transition-colors group text-sm ${
                currentSection === section.id
                  ? 'bg-red-100 border border-red-200'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">p.{section.page}</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Subsections */}
            {section.subsections && (
              <div className="ml-3 space-y-1">
                {section.subsections.map((subsection) => (
                  <button
                    key={subsection.id}
                    onClick={() => handleSectionClick(subsection)}
                    className={`w-full text-left p-1.5 rounded transition-colors text-xs ${
                      currentSection === subsection.id
                        ? 'bg-red-50 border border-red-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <span className="text-gray-700 truncate">
                          {subsection.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>p.{subsection.page}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableOfContents;
