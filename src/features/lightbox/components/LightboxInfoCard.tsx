import { useState } from 'react';
import type { LightboxImage } from '@/store/useLightboxStore';
import { Icon } from '@/components/ui/Icon';

export function LightboxInfoCard({ 
  image, 
  onEdit, 
  onDelete, 
  onSetCover 
}: { 
  image: LightboxImage,
  onEdit?: (id: string) => void,
  onDelete?: (id: string) => void,
  onSetCover?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false);

  if (!image) return null;

  return (
    <div className="relative z-10 px-4 pb-4 mb-[96px] md:mb-[112px] max-w-2xl mx-auto w-full">
      <div
        className="bg-black/60 backdrop-blur-md rounded-xl p-4 text-white hover:bg-black/70 transition-colors"
      >
        <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1 min-w-0">
            {image.title && (
              <h3 className="text-lg font-semibold truncate">{image.title}</h3>
            )}
            {image.category && (
              <p className="text-sm text-white/70 truncate">{image.category}</p>
            )}
          </div>
          <button className="flex-shrink-0 text-white/50 hover:text-white transition-transform duration-200">
            <span className={`inline-block transition-transform ${expanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        {expanded && (
          <>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-sm text-white/60">
              {image.metadata?.date && <p>📅 {image.metadata.date}</p>}
              {image.metadata?.resolution && <p>📐 {image.metadata.resolution}</p>}
              {image.metadata?.size && <p>📦 {image.metadata.size}</p>}
              {image.metadata?.tags && image.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {image.metadata.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions for Admins */}
            {(onEdit || onSetCover || onDelete) && (
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/10 justify-end">
                {onEdit && (
                  <button onClick={() => onEdit(image.id)} className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                    <Icon name="pencil" className="w-4 h-4" />
                  </button>
                )}
                {onSetCover && (
                  <button onClick={() => onSetCover(image.id)} className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400">
                    <Icon name="check-circle" className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => onDelete(image.id)} className="p-1.5 rounded-lg bg-red-600/20 text-red-400">
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
