import { jarBadgeVariant } from '@/components/ui/badge-variants'
import { cn } from '@/lib/utils'

export interface CookingPotIconProps {
  sourceJarIndex?: number
  destinationJarIndex?: number
  className?: string
}

const STROKE_CLASSES: Record<string, string> = {
  jar0: 'stroke-jar0',
  jar1: 'stroke-jar1',
  jar2: 'stroke-jar2',
  jar3: 'stroke-jar3',
  jar4: 'stroke-jar4',
  jarUnknown: 'stroke-jar-unknown',
}

export const CookingPotIcon = ({ sourceJarIndex, destinationJarIndex, className }: CookingPotIconProps) => {
  const sourceVariant = jarBadgeVariant(sourceJarIndex)
  const destinationVariant = jarBadgeVariant(destinationJarIndex) ?? sourceVariant

  const sourceStrokeClass = (sourceVariant && STROKE_CLASSES[sourceVariant]) || 'stroke-jar-unknown'
  const destinationStrokeClass = (destinationVariant && STROKE_CLASSES[destinationVariant]) || sourceStrokeClass

  return (
    <div className={cn('relative flex flex-col items-center justify-center select-none', className)}>
      <style>{`
        @keyframes lidRattle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-2.5deg) translateY(-1px); }
          40% { transform: rotate(1deg); }
          60% { transform: rotate(-1.5deg) translateY(-0.5px); }
          80% { transform: rotate(0.5deg); }
        }
        @keyframes waveShift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        @keyframes steamRise {
          0% { transform: translateY(0) scaleY(0.9); opacity: 0.15; }
          50% { opacity: 0.75; }
          100% { transform: translateY(-12px) scaleY(1.1); opacity: 0; }
        }
        .anim-lid {
          animation: lidRattle 2.2s ease-in-out infinite;
          transform-origin: 35px 50px;
        }
        .anim-wave {
          animation: waveShift 2.8s ease-in-out infinite;
        }
        .anim-steam-1 { animation: steamRise 2.2s ease-in-out infinite; }
        .anim-steam-2 { animation: steamRise 2.6s ease-in-out 0.7s infinite; }
        .anim-steam-3 { animation: steamRise 2.4s ease-in-out 1.2s infinite; }
      `}</style>

      <div className="relative z-10 flex size-44 items-center justify-center md:size-48">
        <svg viewBox="0 0 200 160" className="size-full select-none" aria-hidden="true">
          <defs>
            <pattern
              id="potDiagonalHatch"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="10" className={sourceStrokeClass} strokeWidth="2.5" />
              <line x1="5" y1="0" x2="5" y2="10" className={destinationStrokeClass} strokeWidth="2.5" />
            </pattern>

            <clipPath id="potBodyClip">
              <path d="M 35 50 V 122 C 35 132 43 140 53 140 H 147 C 157 140 165 132 165 122 V 50 Z" />
            </clipPath>
          </defs>

          <g className="text-foreground">
            <g className="text-foreground/60">
              <path
                d="M 125 35 Q 118 24 126 14 T 120 2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="anim-steam-1"
              />
              <path
                d="M 148 30 Q 142 20 150 10 T 144 -2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="anim-steam-2"
              />
              <path
                d="M 102 42 Q 96 30 104 18 T 98 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="anim-steam-3"
              />
            </g>

            <path
              d="M 35 60 H 22 C 14 60 14 80 22 80 H 35"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <path
              d="M 165 60 H 178 C 186 60 186 80 178 80 H 165"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <g clipPath="url(#potBodyClip)">
              <g className="anim-wave">
                <path
                  d="M 25 78 C 55 58 75 70 100 88 C 120 102 145 106 175 96 L 175 150 L 25 150 Z"
                  fill="url(#potDiagonalHatch)"
                />
              </g>
            </g>

            <path
              d="M 35 50 V 122 C 35 132 43 140 53 140 H 147 C 157 140 165 132 165 122 V 50 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <g className="anim-lid">
              <path
                d="M 87 27 C 87 20 107 20 107 27"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              <path
                d="M 35 50 C 31 40 38 34 44 34 L 158 20 C 164 19 168 24 165 30 L 35 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </svg>
      </div>
    </div>
  )
}
