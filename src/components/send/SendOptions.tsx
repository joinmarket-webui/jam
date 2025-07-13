import { useState, useRef } from 'react'
import { Info, Square } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export const SendOptions = () => {
  const { t } = useTranslation()
  const [isCollaborative, setIsCollaborative] = useState(true)
  const [numCollaborators, setNumCollaborators] = useState(9)
  const [customCollaborators, setCustomCollaborators] = useState<number | null>(null)
  const [absoluteFeeLimit, setAbsoluteFeeLimit] = useState('6511')
  const [relativeFeeLimit, setRelativeFeeLimit] = useState('')
  const [miningFeeType, setMiningFeeType] = useState<'block' | 'sats'>('block')
  const [blockTarget, setBlockTarget] = useState('3')

  const inputRef = useRef<HTMLInputElement>(null)

  const collaboratorOptions = [8, 9, 10]

  return (
    <div className="space-y-6">
      {/* Toggle for collaborative transaction */}
      <div className="flex items-start gap-3">
        <div className="mt-1">
          <button
            onClick={() => setIsCollaborative(!isCollaborative)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isCollaborative ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                isCollaborative ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="flex-1">
          <div className="font-medium">{t('send.toggle_coinjoin')}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{t('send.toggle_coinjoin_subtitle')}</div>
        </div>
      </div>

      {/* Number of collaborators */}
      <div className="space-y-3">
        <Label className="font-medium">
          {t('send.label_num_collaborators', { numCollaborators: numCollaborators })}
        </Label>
        <div className="text-sm text-gray-600 dark:text-gray-400">{t('send.description_num_collaborators')}</div>

        <div className="grid w-full grid-cols-4 items-center gap-2">
          {collaboratorOptions.map((option) => (
            <Button
              key={option}
              variant={numCollaborators === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => setNumCollaborators(option)}
              className="w-full py-4.5"
            >
              {option}
            </Button>
          ))}
          <Input
            ref={inputRef}
            type="number"
            min={1}
            placeholder={t('send.input_num_collaborators_placeholder')}
            value={customCollaborators?.toString() || ''}
            onClick={() => {
              const num = customCollaborators || 0
              if (!isNaN(num) && num === numCollaborators) {
                inputRef.current?.select()
              }
            }}
            onChange={(e) => {
              setCustomCollaborators(parseInt(e.target.value))
              const num = parseInt(e.target.value)
              if (num <= 0 || isNaN(num)) {
                setCustomCollaborators(null)
                setNumCollaborators(8)
              } else {
                setNumCollaborators(num)
              }
            }}
            className={`w-full py-4.5 ${
              !collaboratorOptions.includes(numCollaborators) &&
              customCollaborators &&
              customCollaborators === numCollaborators
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : ''
            }`}
          />
        </div>
      </div>

      {/* Collaborator fees */}
      <div className="space-y-4">
        <div>
          <div className="font-medium">Collaborator fees: ...</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Depending on the amount, the number of collaborators and the{' '}
            <button className="text-blue-500 underline">preset limits</button>, you can see the maximum collaborator
            fees for the upcoming collaborative transaction.
          </div>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-sm">
            <Info />
            <span>
              This value <strong>does not include regular mining fees.</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('send.fee_breakdown.absolute_limit')}</Label>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">₿</span>
              <Input
                value={`0.00 00${absoluteFeeLimit}`}
                onChange={(e) => setAbsoluteFeeLimit(e.target.value)}
                className="pl-8"
                readOnly
              />
            </div>
            <div className="text-xs text-gray-500">{parseInt(absoluteFeeLimit).toLocaleString()} sats * 1</div>
          </div>

          <div className="space-y-2">
            <Label>{t('send.fee_breakdown.relative_limit')}</Label>
            <Input
              placeholder={t('send.fee_breakdown.placeholder_amount_missing_amount')}
              value={relativeFeeLimit}
              onChange={(e) => setRelativeFeeLimit(e.target.value)}
            />
            <div className="text-xs text-gray-500">0.03% * 1</div>
          </div>
        </div>
      </div>

      {/* Mining fee */}
      <div className="space-y-4">
        <Label className="font-medium">{t('send.label_tx_fees')}</Label>

        <div className="flex gap-2">
          <Button
            variant={miningFeeType === 'block' ? 'default' : 'outline'}
            onClick={() => setMiningFeeType('block')}
            className="flex-1"
          >
            {t('settings.fees.radio_tx_fees_blocks')}
          </Button>
          <Button
            variant={miningFeeType === 'sats' ? 'default' : 'outline'}
            onClick={() => setMiningFeeType('sats')}
            className="flex-1"
          >
            {t('settings.fees.radio_tx_fees_satspervbyte')}
          </Button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          {miningFeeType === 'block'
            ? t('settings.fees.description_tx_fees_blocks')
            : t('settings.fees.description_tx_fees_satspervbyte')}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Square className="absolute top-1/2 left-1 -translate-y-1/2 text-gray-500" />

            <Input value={blockTarget} onChange={(e) => setBlockTarget(e.target.value)} className="pl-8" />
          </div>
        </div>
      </div>
    </div>
  )
}
