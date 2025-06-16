import type { Meta, StoryObj } from "@storybook/react-vite";
import { Footer } from "../components/Footer";

const meta: Meta<typeof Footer> = {
  title: "Core/Footer",
  component: Footer,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Footer>;

export const Default: Story = {
  render: () => <Footer />,
};
