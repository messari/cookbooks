import { Citation } from "../types";

interface CitationCardProps {
  citation: Citation;
  compact?: boolean;
}

const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  compact = false,
}) => {
  const containerClass = compact
    ? "bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-lg max-w-xs inline-block"
    : "bg-gray-800 rounded-lg p-3 border border-gray-700";

  return (
    <div className={containerClass}>
      <div className="mb-2 flex items-start">
        <div className="mr-2 w-5 h-5 bg-purple-800 text-purple-300 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-bold">{citation.citationId}</span>
        </div>
        {citation.url ? (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-medium hover:text-blue-300 transition-colors flex items-center"
          >
            <h3 className="pr-1">
              {citation.title || citation.domain || "Citation"}
            </h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-1 text-blue-400"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        ) : (
          <h3 className="text-white font-medium">
            {citation.title || citation.domain || "Citation"}
          </h3>
        )}
      </div>

      <div className="ml-7">
        <p className="text-gray-400 text-sm">{citation.domain}</p>
      </div>
    </div>
  );
};

export default CitationCard;
