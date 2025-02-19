// src/components/blog/MarkdownRenderer.js
import React from 'react';
import { LogoService } from '../../services/logoService';

const TeamLogo = ({ teamId }) => {
  const [imgSrc, setImgSrc] = React.useState('');
  
  React.useEffect(() => {
    const { localPath, apiPath } = LogoService.getTeamLogoPath(teamId);
    
    fetch(localPath)
      .then(response => {
        if (response.ok) {
          setImgSrc(localPath);
        } else {
          setImgSrc(apiPath);
        }
      })
      .catch(() => {
        setImgSrc(apiPath);
      });
  }, [teamId]);

  return (
    <img
      src={imgSrc || '/fallback-team-logo.png'}
      alt=""
      className="inline-block h-6 w-6 object-contain -mt-1 mx-1"
      onError={(e) => {
        e.target.src = '/fallback-team-logo.png';
      }}
    />
  );
};

export const renderMarkdown = (content, options = { preview: false }) => {
    if (!content) return null;
  
    // First, normalize line breaks
    let processedContent = content
      .replace(/<br \/>/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\n{2,}/g, '\n\n');
  
    // If preview mode, limit to first two paragraphs and add ellipsis
    if (options.preview) {
      const paragraphs = processedContent.split('\n\n');
      const previewParagraphs = paragraphs.slice(0, 2);
      processedContent = previewParagraphs.join('\n\n');
    }
  
    // Process team logos
    processedContent = processedContent.replace(
      /\[\[TEAM:(\d+)\]\]/g,
      (match, teamId) => {
        return `<span class="inline-team-logo" data-team-id="${teamId}"></span>`;
      }
    );
  
    // Process competition logos
    processedContent = processedContent.replace(
      /\[\[COMP:(\d+)\]\]/g,
      (match, compId) => {
        return `<span class="inline-comp-logo" data-comp-id="${compId}"></span>`;
      }
    );
  
    // Split into paragraphs
    const paragraphs = processedContent.split('\n\n');
  
    return (
      <div className={options.preview ? "space-y-2" : "space-y-4"}>
        {paragraphs.map((paragraph, index) => {
          // Split paragraph into parts that need to be rendered separately
          const parts = paragraph.split(/(<span class="inline-(?:team|comp)-logo" data-(?:team|comp)-id="\d+">\s*<\/span>)/);
  
          const renderedParts = parts.map((part, partIndex) => {
            if (part.startsWith('<span class="inline-team-logo"')) {
              const teamId = part.match(/data-team-id="(\d+)"/)[1];
              return <TeamLogo key={`team-${partIndex}`} teamId={teamId} />;
            }
            
            if (part.startsWith('<span class="inline-comp-logo"')) {
              const compId = part.match(/data-comp-id="(\d+)"/)[1];
              return (
                <img
                  key={`comp-${partIndex}`}
                  src={`/logos/competitions/${compId}.png`}
                  alt=""
                  className="inline-block h-6 w-6 object-contain -mt-1 mx-1"
                  onError={(e) => {
                    e.target.src = '/fallback-competition-logo.png';
                  }}
                />
              );
            }
  
            // Handle line breaks within text parts
            const lines = part.split('\n');
            return lines.map((line, lineIndex) => (
              <React.Fragment key={`line-${partIndex}-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ));
          });
  
          return (
            <p key={index} className={options.preview ? "text-gray-300" : "text-gray-200"}>
              {renderedParts}
            </p>
          );
        })}
        {options.preview && content.split('\n\n').length > 2 && (
          <p className="text-gray-400">...</p>
        )}
      </div>
    );
  };
  