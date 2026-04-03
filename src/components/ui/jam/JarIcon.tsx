import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { AmountSats } from '@/types/global'

const CLOSED_JAR_OUTLINE_PATH =
  'M25.9759 14.0086V13.107H27.7519C28.0543 13.107 28.2991 12.8612 28.2991 12.5588V8.24275C28.2991 6.27179 27.0688 6 25.7392 6H4.26054C2.93101 6 1.70117 6.27179 1.70117 8.24275V12.5588C1.70117 12.8617 1.94651 13.107 2.24836 13.107H4.0238V14.0086C4.0238 14.9718 3.55144 15.4552 2.83576 16.188C1.63906 17.4134 0 19.091 0 24.0059V47.1149C0 51.9827 0.912663 55 5.45768 55H24.5439C29.0873 55 30 51.9833 30 47.1149V24.0059C30 19.0901 28.361 17.4124 27.1648 16.188C26.4491 15.4557 25.9762 14.9723 25.9762 14.008L25.9759 14.0086ZM2.79547 8.2432C2.79547 7.3763 2.90949 7.09686 4.25987 7.09686H25.7398C27.0912 7.09686 27.2053 7.37681 27.2053 8.2432V12.0111C19.0516 12.0085 10.869 12.0106 2.7951 12.0106L2.79547 8.2432ZM28.904 47.1167C28.904 52.8556 27.435 53.905 24.5422 53.905L5.45727 53.9055C2.56404 53.9055 1.09456 52.855 1.09456 47.1172L1.09405 24.0069C1.09405 19.5393 2.49277 18.1065 3.6172 16.9549C4.38836 16.1655 5.1173 15.4189 5.1173 14.0091V13.1075H24.8798V14.0091C24.8798 15.4201 25.6087 16.1657 26.3794 16.9549C27.5038 18.1053 28.9025 19.5383 28.9025 24.0069L28.9036 47.1172L28.904 47.1167Z'

const OPEN_JAR_OUTLINE_PATH =
  'M27.7519 7.10699H25.9759H4.0238H2.24836C1.94652 7.10699 1.70117 6.86171 1.70117 6.55881V2.24275C1.70117 0.271793 2.93102 0 4.26055 0H25.7392C27.0688 0 28.2991 0.271793 28.2991 2.24275V6.55881C28.2991 6.8612 28.0543 7.10699 27.7519 7.10699ZM4.25987 1.09686C2.90949 1.09686 2.79547 1.3763 2.79547 2.2432L2.7951 6.01059C5.27498 6.01059 7.7651 6.01039 10.2615 6.0102H10.262H10.2625C15.8934 6.00976 21.5563 6.00932 27.2053 6.0111V2.2432C27.2053 1.37681 27.0912 1.09686 25.7398 1.09686H4.25987ZM25.9759 13.5V12.5H26.5C26.7761 12.5 27 12.2761 27 12C27 11.7239 26.7761 11.5 26.5 11.5H25.9759V11C25.9759 10 25.5 9.375 24.5 9.375H5C4.0238 9.37498 4.0238 10.5002 4.0238 11.0001V11.5H3.5C3.22386 11.5 3 11.7239 3 12C3 12.2761 3.22386 12.5 3.5 12.5H4.0238V13.5H3.5C3.22386 13.5 3 13.7239 3 14C3 14.2761 3.22386 14.5 3.5 14.5H3.97644C3.8401 15.1597 3.41883 15.591 2.83624 16.1875L2.83576 16.188L2.83526 16.1885C1.63861 17.4138 0 19.0917 0 24.0059V47.1148C0 51.9827 0.912663 55 5.45768 55H24.5439C29.0873 55 30 51.9832 30 47.1148V24.0059C30 19.0901 28.361 17.4123 27.1648 16.188L27.1638 16.187C26.5815 15.5912 26.1601 15.16 26.0236 14.5H26.5C26.7761 14.5 27 14.2761 27 14C27 13.7239 26.7761 13.5 26.5 13.5H25.9759ZM24.8797 13.5V13.1075V12.5H5.11725V13.1075V13.5H24.8797ZM24.9114 14.5H5.08551C4.93748 15.603 4.29356 16.2625 3.61714 16.9549C2.49272 18.1064 1.09399 19.5393 1.09399 24.0069L1.0945 47.1172C1.0945 52.855 2.56398 53.9055 5.45721 53.9055L24.5421 53.905C27.4349 53.905 28.9039 52.8555 28.9039 47.1167L28.9035 47.1172L28.9025 24.0069C28.9025 19.5382 27.5037 18.1053 26.3793 16.9549L26.3777 16.9533C25.7023 16.2615 25.0592 15.603 24.9114 14.5ZM24.8797 10.5V11.5H5.11725V10.5H24.8797Z'

type JarFillLevel = 0 | 1 | 2 | 3

type JamFillRect = {
  x: string
  y: string
  height: string
  transform: string
}

const LEGACY_JAR_FILL_RECTS: Record<Exclude<JarFillLevel, 0>, JamFillRect[]> = {
  1: [
    { x: '26.9983', y: '47.1555', height: '5.45425', transform: 'rotate(45 26.9983 47.1555)' },
    { x: '27.001', y: '43.6182', height: '10.4318', transform: 'rotate(45 27.001 43.6182)' },
    { x: '24.2859', y: '42.7979', height: '11.616', transform: 'rotate(45 24.2859 42.7979)' },
    { x: '20.7573', y: '42.7905', height: '11.6001', transform: 'rotate(45 20.7573 42.7905)' },
    { x: '17.2285', y: '42.7837', height: '11.6088', transform: 'rotate(45 17.2285 42.7837)' },
    { x: '13.6736', y: '42.8027', height: '11.5931', transform: 'rotate(45 13.6736 42.8027)' },
    { x: '10.1365', y: '42.8052', height: '11.0668', transform: 'rotate(45 10.1365 42.8052)' },
    { x: '6.62524', y: '42.7808', height: '6.11823', transform: 'rotate(45 6.62524 42.7808)' },
  ],
  2: [
    { x: '26.9919', y: '47.1621', height: '5.44529', transform: 'rotate(45 26.9919 47.1621)' },
    { x: '26.9944', y: '43.625', height: '10.4224', transform: 'rotate(45 26.9944 43.625)' },
    { x: '26.9963', y: '40.0874', height: '15.449', transform: 'rotate(45 26.9963 40.0874)' },
    { x: '26.9983', y: '36.5498', height: '20.426', transform: 'rotate(45 26.9983 36.5498)' },
    { x: '25.7163', y: '34.2961', height: '23.6123', transform: 'rotate(45 25.7163 34.2961)' },
    { x: '22.178', y: '34.2983', height: '23.6203', transform: 'rotate(45 22.178 34.2983)' },
    { x: '18.6401', y: '34.3013', height: '23.1059', transform: 'rotate(45 18.6401 34.3013)' },
    { x: '15.094', y: '34.312', height: '18.0926', transform: 'rotate(45 15.094 34.312)' },
    { x: '11.5557', y: '34.3145', height: '13.0762', transform: 'rotate(45 11.5557 34.3145)' },
    { x: '8.02588', y: '34.3086', height: '8.08624', transform: 'rotate(45 8.02588 34.3086)' },
    { x: '4.49609', y: '34.3027', height: '3.09625', transform: 'rotate(45 4.49609 34.3027)' },
  ],
  3: [
    { x: '26.9932', y: '47.1609', height: '5.44679', transform: 'rotate(45 26.9932 47.1609)' },
    { x: '26.9915', y: '43.6279', height: '10.4182', transform: 'rotate(45 26.9915 43.6279)' },
    { x: '26.9956', y: '40.0879', height: '15.4481', transform: 'rotate(45 26.9956 40.0879)' },
    { x: '27', y: '36.5481', height: '20.4285', transform: 'rotate(45 27 36.5481)' },
    { x: '26.9915', y: '33.021', height: '25.4156', transform: 'rotate(45 26.9915 33.021)' },
    { x: '27.0012', y: '29.4751', height: '30.4414', transform: 'rotate(45 27.0012 29.4751)' },
    { x: '27.0012', y: '25.9399', height: '34.9517', transform: 'rotate(45 27.0012 25.9399)' },
    { x: '23.5908', y: '25.8149', height: '30.1135', transform: 'rotate(45 23.5908 25.8149)' },
    { x: '20.0496', y: '25.8203', height: '25.0995', transform: 'rotate(45 20.0496 25.8203)' },
    { x: '16.5393', y: '25.7949', height: '20.1474', transform: 'rotate(45 16.5393 25.7949)' },
    { x: '12.9824', y: '25.8164', height: '15.12', transform: 'rotate(45 12.9824 25.8164)' },
    { x: '9.45679', y: '25.8066', height: '10.1278', transform: 'rotate(45 9.45679 25.8066)' },
    { x: '5.91553', y: '25.8125', height: '5.11357', transform: 'rotate(45 5.91553 25.8125)' },
  ],
}

const calculateJarFillLevel = (jarBalance: number, totalBalance: number): JarFillLevel => {
  if (totalBalance === 0) return 0
  if (jarBalance > totalBalance / 2) return 3
  if (jarBalance > totalBalance / 4) return 2
  if (jarBalance > 0) return 1
  return 0
}

type LegacyJarSvgProps = {
  color: string
  fillLevel: JarFillLevel
  isOpen: boolean
  className?: string
}

function LegacyJarSvg({ color, fillLevel, isOpen, className }: LegacyJarSvgProps) {
  const fillRects = fillLevel === 0 ? [] : LEGACY_JAR_FILL_RECTS[fillLevel]

  return (
    <svg className={className} viewBox="0 0 30 55" style={{ ['--jamColor' as const]: color } as CSSProperties}>
      <path
        d={isOpen ? OPEN_JAR_OUTLINE_PATH : CLOSED_JAR_OUTLINE_PATH}
        fill="currentColor"
        fillRule={isOpen ? 'evenodd' : undefined}
        clipRule={isOpen ? 'evenodd' : undefined}
      />
      {fillRects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}-${rect.height}`}
          fill="var(--jamColor)"
          x={rect.x}
          y={rect.y}
          width="1"
          height={rect.height}
          rx="0.5"
          transform={rect.transform}
        />
      ))}
    </svg>
  )
}

interface JarIconProps {
  color: string
  totalBalance: AmountSats
  totalWalletBalance: AmountSats
  width?: number
  height?: number
  isSelected?: boolean
  disabled?: boolean
  className?: string
}

export function JarIcon({
  color = '#e2b86a',
  totalBalance = 0,
  totalWalletBalance = 0,
  width,
  height,
  isSelected = false,
  disabled,
  className,
}: JarIconProps) {
  const fillLevel = calculateJarFillLevel(totalBalance, totalWalletBalance)
  const sizeStyle: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  }

  return (
    <div
      className={cn(
        'group/jar-icon relative flex h-20 w-12 items-center justify-center transition-transform duration-200 ease-in-out',
        {
          grayscale: disabled,
        },
        className,
      )}
      style={sizeStyle}
    >
      <LegacyJarSvg
        color={color}
        fillLevel={fillLevel}
        isOpen={false}
        className={cn('absolute inset-0 h-full w-full transition-opacity duration-200 ease-in-out', {
          'opacity-100': !isSelected,
          'opacity-0': isSelected,
          'group-hover/jar-icon:opacity-0': !disabled && !isSelected,
        })}
      />
      <LegacyJarSvg
        color={color}
        fillLevel={fillLevel}
        isOpen={true}
        className={cn('absolute inset-0 h-full w-full transition-opacity duration-200 ease-in-out', {
          'opacity-0': !isSelected,
          'opacity-100': isSelected,
          'group-hover/jar-icon:opacity-100': !disabled && !isSelected,
        })}
      />
    </div>
  )
}
