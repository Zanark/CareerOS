import { ExternalLink, Play } from 'lucide-react';
import thumbnail from '../assets/focus-study-cafe.webp';
import './focus-playlist.css';

export function FocusPlaylist() {
  return <a className="focus-playlist" href="https://www.youtube.com/playlist?list=PLYw_q6Wu9DTU"
    target="_blank" rel="noopener noreferrer" aria-label="Open cozy study cafe playlist on YouTube (new tab)">
    <span className="focus-playlist__art" aria-hidden="true">
      <img src={thumbnail} alt="" width={720} height={405} loading="lazy" decoding="async" />
      <span className="focus-playlist__play"><Play size={20} fill="currentColor" /></span>
    </span>
    <span className="focus-playlist__caption">
      <strong>Cozy autumn study cafe</strong>
      <span>Listen on YouTube <ExternalLink size={14} aria-hidden="true" /></span>
    </span>
  </a>;
}
