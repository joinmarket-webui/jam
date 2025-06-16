import type { Meta, StoryObj } from "@storybook/react-vite";
import { Navbar } from "../components/Navbar";
import { Bitcoin } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import type { JarColor } from "@/components/layout/display-mode-context";

const meta: Meta<typeof Navbar> = {
  title: "Core/Navbar",
  component: Navbar,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Navbar>;

const mockFormatAmount = (amount: number) => `${amount} sats`;
const mockGetLogo = (size: "sm" | "lg") => (
  <Bitcoin size={size === "sm" ? 18 : 32} />
);
const mockJars = [
  { name: "Apricot", balance: 12345, color: "#e2b86a" as JarColor },
  { name: "Blueberry", balance: 67890, color: "#3b5ba9" as JarColor },
];

export const Default: Story = {
  args: {
    theme: "light",
    toggleTheme: () => alert("Theme toggled!"),
    toggleDisplayMode: () => alert("Display mode toggled!"),
    formatAmount: mockFormatAmount,
    getLogo: mockGetLogo,
    jars: mockJars,
  },
};
