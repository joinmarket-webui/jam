import type { JarIndex } from '@/types/global'

const JAR_BG_CLASSES: Record<JarIndex, string> = {
  0: 'bg-jar0',
  1: 'bg-jar1',
  2: 'bg-jar2',
  3: 'bg-jar3',
  4: 'bg-jar4',
}

export const getJarBgClass = (jarIndex?: JarIndex) =>
  jarIndex === undefined ? undefined : (JAR_BG_CLASSES[jarIndex] ?? 'bg-jar-unknown')
