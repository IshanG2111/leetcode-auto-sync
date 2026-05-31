import React from 'react';

interface TooltipProps {
  platform: 'linkedin' | 'github';
  url: string;
  name: string;
  username: string;
  avatarText: string;
  iconPath: string;
  viewBox?: string;
  colorTheme?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  platform,
  url,
  name,
  username,
  avatarText,
  iconPath,
  viewBox = "0 0 448 512",
  colorTheme = "#0a84ff"
}) => {
  return (
    <div className={`tooltip-container tooltip-${platform}`}>
      <div className="tooltip">
        <div className="profile">
          <div className="user">
            <div className="img" style={{ borderColor: colorTheme }}>{avatarText}</div>
            <div className="details">
              <div className="name" style={{ color: colorTheme }}>{name}</div>
              <div className="username">{username}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="text-container">
        <a className="icon" href={url} target="_blank" rel="noopener noreferrer">
          <div className="layer">
            <span style={{ borderColor: colorTheme }} />
            <span style={{ borderColor: colorTheme }} />
            <span style={{ borderColor: colorTheme }} />
            <span style={{ borderColor: colorTheme }} />
            <span className="fab" style={{ backgroundColor: '#161618', fill: colorTheme, borderColor: colorTheme }}>
              <svg viewBox={viewBox} height="1.1em">
                <path d={iconPath} />
              </svg>
            </span>
          </div>
          <div className="text" style={{ color: colorTheme }}>{platform === 'linkedin' ? 'LinkedIn' : 'GitHub'}</div>
        </a>
      </div>
    </div>
  );
}

export default Tooltip;
