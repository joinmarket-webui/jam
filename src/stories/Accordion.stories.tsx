import type { Meta, StoryObj } from '@storybook/react-vite'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const meta: Meta<typeof Accordion> = {
  title: 'Core/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A vertically stacked set of interactive headings that each reveal a section of content.',
      },
    },
  },
}
export default meta

type Story = StoryObj<typeof Accordion>

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Example use case</AccordionTrigger>
        <AccordionContent>
          This is an accordion component that can be used to display content in a collapsible format.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Multiple: Story = {
  render: () => (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles that match the other components' aesthetic.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const DefaultOpen: Story = {
  render: () => (
    <Accordion type="single" defaultValue="item-2" className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger>First section</AccordionTrigger>
        <AccordionContent>This section is closed by default.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Second section</AccordionTrigger>
        <AccordionContent>This section is open by default because we set defaultValue="item-2".</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Third section</AccordionTrigger>
        <AccordionContent>This section is closed by default.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const CustomStyling: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1" className="mb-2 rounded-md border border-gray-200 px-4">
        <AccordionTrigger className="font-bold text-blue-500">Custom styled accordion</AccordionTrigger>
        <AccordionContent className="text-gray-600">
          This accordion has custom styling applied to demonstrate the flexibility of the component.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2" className="rounded-md border border-gray-200 px-4">
        <AccordionTrigger className="font-bold text-blue-500">Another custom section</AccordionTrigger>
        <AccordionContent className="text-gray-600">
          You can customize each accordion item independently.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}
