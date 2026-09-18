import { motion } from 'framer-motion'
import { Image as ImageIcon } from 'lucide-react'

import Card from './Card.jsx'
import PageHeading from './PageHeading.jsx'

export interface InventarFormProps {
  title?: string
  subtitle?: string,
  photos: {path: string, url: string}[],
}

interface SectionLabelProps {
  n: number
  title: string
}

function SectionLabel({ n, title }: SectionLabelProps) {
  return (
    <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-body-sm font-medium text-white">
        {n}
      </span>
      <h2 className="m-0 text-body-sm font-medium uppercase tracking-wide text-ink-800">
        {title}
      </h2>
    </div>
  )
}


export default function Photos({
  title = 'Checklist invertoare - 6 luni',
  subtitle = 'Completează verificarea semestrială și trimite-o spre semnare.',
  photos,
}: InventarFormProps) {

  const validPhotos = Array.isArray(photos)
  ? photos.filter(
      (photo) =>
        photo &&
        typeof photo.path === 'string' &&
        typeof photo.url === 'string',
    )
  : []

return (
  <>
      <PageHeading title={title} subtitle={subtitle} />

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.15, ease: 'easeOut' }}>
        <Card className="px-7 py-6">          

          {validPhotos.length > 0 ? (
            <div className="mt-5 max-h-[70vh] space-y-5 overflow-y-auto pr-2">
              {validPhotos.map((image) => (
                <div
                  key={image.path}
                  className="overflow-hidden border border-line bg-surface-alt"
                >
                  <img
                    src={image.url}
                    alt="Fotografie existentă"
                    className="h-auto max-h-[65vh] w-full object-contain"
                  />
                  
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 text-body-sm text-ink-200">
              <ImageIcon size={14} />
              <span>Nicio imagine încărcată încă</span>
            </div>
          )}
        </Card>
      </motion.div>
    </>
  )
}
