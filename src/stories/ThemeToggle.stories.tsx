import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";

const meta: Meta = {
  title: "Core/ThemeToggle",
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

const ThemeToggleButton = () => {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button
        style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}>
        Light Mode
      </button>
      <button
        style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}>
        Dark Mode
      </button>
      <span>Current: {theme}</span>
    </div>
  );
};

export const ThemeToggle: Story = {
  render: () => <ThemeToggleButton />,
};
