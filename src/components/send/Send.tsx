import { useState } from 'react'
import { BrushCleaning } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { satsToBtc, btcToSats } from '@/lib/utils'
import { useJamDisplayContext } from '../layout/display-mode-context'
import { BitcoinAmountInput } from '../receive/BitcoinAmountInput'
import { JarIcon } from '../ui/JarIcon'
import { SelectableJar } from '../ui/SelectableJar'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip'
import JarSelectorModal from './JarSelectorModal'
import { SendOptions } from './SendOptions'

type DisplayMode = 'sats' | 'btc'

const Send = () => {
  const { t } = useTranslation()
  const { jars, totalBalance } = useJamDisplayContext()
  const firstAvailableJar = jars.find((jar) => jar.balance > 0) || jars[0]
  const [selectedJar, setSelectedJar] = useState(firstAvailableJar?.name)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [amountDisplayMode, setAmountDisplayMode] = useState<DisplayMode>('sats')
  const [showJarSelector, setShowJarSelector] = useState(false)

  const toggleDisplayMode = () => {
    setAmountDisplayMode((prev) => {
      const newMode = prev === 'sats' ? 'btc' : 'sats'

      if (amount && amount !== '0') {
        if (prev === 'sats' && newMode === 'btc') {
          const btcValue = satsToBtc(amount)
          setAmount(btcValue.toFixed(8))
        } else if (prev === 'btc' && newMode === 'sats') {
          const satsValue = btcToSats(amount)
          setAmount(satsValue.toString())
        }
      }

      return newMode
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('send.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('send.subtitle')}</p>
      </div>

      {/* Send from section */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('send.label_source_jar')}</label>
        <div className="mx-2 flex gap-20">
          {jars.map((jar) => (
            <SelectableJar
              key={jar.name}
              name={jar.name}
              color={jar.color}
              balance={jar.balance}
              totalBalance={totalBalance}
              isSelected={selectedJar === jar.name}
              disabled={jar.balance === 0}
              onClick={() => {
                if (jar.balance > 0) {
                  setSelectedJar(jar.name)
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Recipient section */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t('send.label_recipient')}</label>
        <div className="flex gap-2">
          <Input
            placeholder={t('send.placeholder_recipient')}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={() => setShowJarSelector(true)}>
            <div className="scale-35">
              <JarIcon />
            </div>
          </Button>
        </div>
      </div>

      {/* Amount section */}
      <div className="space-y-3">
        <BitcoinAmountInput
          label={t('send.label_amount_input')}
          placeholder={t('send.placeholder_amount_input')}
          amountDisplayMode={amountDisplayMode}
          toggleDisplayMode={toggleDisplayMode}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <Button
          onClick={() => {
            const jar = jars.find((jar) => selectedJar === jar.name)
            if (jar) {
              if (amountDisplayMode === 'btc') {
                const btcValue = satsToBtc(jar.balance.toString())
                setAmount(btcValue.toFixed(8))
              } else {
                setAmount(jar.balance.toString())
              }
            } else {
              setAmount('0')
            }
          }}
          className="w-full"
          variant="outline"
        >
          <BrushCleaning className="mr-2 h-4 w-4" />
          {t('send.button_sweep')}
        </Button>
      </div>

      {/* Sending options */}
      <Accordion type="single" collapsible>
        <AccordionItem value="sending-options">
          <Tooltip>
            <TooltipTrigger asChild>
              <AccordionTrigger>{t('send.sending_options')}</AccordionTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Not yet implemented</p>
            </TooltipContent>
          </Tooltip>
          <AccordionContent>
            <SendOptions />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Send button */}
      <Button className="w-full" size="lg">
        {t('send.button_send')}
      </Button>

      {/* Jar Selector Modal */}
      {showJarSelector && (
        <JarSelectorModal
          jars={jars}
          totalBalance={totalBalance}
          selectedSendingJar={selectedJar}
          onJarSelect={(address) => {
            setRecipient(address)
            setShowJarSelector(false)
          }}
          onClose={() => setShowJarSelector(false)}
        />
      )}
    </div>
  )
}

export default Send
