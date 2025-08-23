import React from 'react';

const Sparkline = ({ data, width = 400, height = 50 }) => {
  if (!data || data.length === 0) {
    return (
      <svg width={width} height={height}>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#999">
          Pas de données
        </text>
      </svg>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const strokeColor = data.length > 1 && data[data.length - 1] > data[0] ? '#28a745' : '#dc3545';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={strokeColor} strokeWidth="2" points={points} />
      <polygon fill={strokeColor} fillOpacity="0.2" points={areaPoints} />
    </svg>
  );
};

export default Sparkline;