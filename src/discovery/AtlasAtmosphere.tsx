const positions = [[39, 68], [79, 156], [112, 42], [143, 191], [191, 61], [224, 172], [267, 89], [292, 192]];
const climates = ['harbor', 'breeze', 'archive', 'depths', 'beacon', 'sky', 'astral'] as const;

export function AtlasAtmosphere({ level }: { level: number }) {
  const climate = climates[level - 1];
  if (!climate) throw new Error('Unknown Atlas atmosphere level.');
  return <svg className={`atlas-atmosphere atlas-weather-${climate}`} data-atmosphere={climate}
    viewBox="0 0 320 240" aria-hidden="true" focusable="false">
    <ellipse className="atlas-ambient atlas-world-haze" cx="160" cy="68" rx="143" ry="57" />
    {level === 1 && <g className="atlas-harbor-currents" fill="none">
      {[0, 1, 2].map(index => <path key={index} className="atlas-ambient atlas-current"
        style={{ animationDelay: `${index * -2.4}s` }}
        d={`M-20 ${166 + index * 22}q40-15 80 0t80 0t80 0t120 0`} />)}
    </g>}
    {(level === 2 || level === 6) && <g fill="none" className="atlas-wind-lines">
      {[0, 1, 2, 3].map(index => <path key={index} className="atlas-ambient atlas-wind-stroke"
        style={{ animationDelay: `${index * -1.7}s`, animationDuration: `${6 + index}s` }}
        d={`M${index % 2 ? 185 : 15} ${38 + index * 43}h36q16 0 16-9t-16-9`} />)}
    </g>}
    {level === 3 && <g className="atlas-archive-orbits" fill="none">
      <ellipse className="atlas-ambient atlas-archive-orbit" cx="160" cy="112" rx="129" ry="57" />
      <ellipse className="atlas-ambient atlas-archive-orbit atlas-orbit-reverse" cx="160" cy="112" rx="99" ry="79" />
    </g>}
    {level === 4 && <g className="atlas-depth-caustics" fill="none">
      <path className="atlas-ambient atlas-current" d="M-20 177q45-25 90 0t90 0t90 0t90 0" />
      <path className="atlas-ambient atlas-current" style={{ animationDelay: '-4s' }} d="M-20 207q45-25 90 0t90 0t90 0t90 0" />
    </g>}
    {level === 5 && <g className="atlas-ambient atlas-beacon-sweep">
      <path d="M253 49 1 4v86Z" />
      <path d="M253 49 0 36v9Z" />
    </g>}
    {level === 6 && <g className="atlas-cloud-banks">
      <path className="atlas-ambient atlas-cloud" d="M-30 78q10-15 27-9 5-27 31-20 17-11 30 10 22-4 35 19Z" />
      <path className="atlas-ambient atlas-cloud atlas-cloud-far" d="M208 137q11-16 30-10 5-20 27-16 19-9 28 9 22-2 38 17Z" />
    </g>}
    {level === 7 && <g className="atlas-ambient atlas-celestial-orbit" fill="none">
      <ellipse cx="160" cy="105" rx="132" ry="74" />
      <path d="m160 25 3 6-3 6-3-6Zm127 80 4 3-4 3-4-3Z" />
    </g>}
    <g className="atlas-world-motes">
      {positions.map(([x, y], index) => <g key={index} transform={`translate(${x} ${y})`}>
        <g className={`atlas-ambient atlas-world-mote${level === 4 ? ' atlas-bubble' : level === 7 ? ' atlas-astral-star' : level === 3 ? ' atlas-ink-page' : ''}`}
          style={{ animationDelay: `${index * -1.35}s`, animationDuration: `${7 + index % 4 * 1.7}s` }}>
          {level === 4 ? <circle r={2 + index % 3} /> : level === 7 ? <path d="M0-5 1.3-1.3 5 0 1.3 1.3 0 5-1.3 1.3-5 0-1.3-1.3Z" />
            : level === 3 ? <><path d="m-4-5 8 1-1 10-8-1Z" /><path d="m-2-2 4 .5M-2 1l3 .5" /></> : <rect x="-1" y="-1" width={index % 3 ? 2 : 3} height={index % 3 ? 2 : 3} /> }
        </g>
      </g>)}
    </g>
  </svg>;
}
