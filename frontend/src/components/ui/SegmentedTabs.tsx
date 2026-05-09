import type { ReactNode } from "react";
import TabButton from "./TabButton";
import { standingsTheme } from "./design";

export type SegmentedTabItem<T extends string | number> = {
  value: T;
  label: ReactNode;
  disabled?: boolean;
};

type SegmentedTabsProps<T extends string | number> = {
  items: SegmentedTabItem<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

export default function SegmentedTabs<T extends string | number>({
  items,
  value,
  onChange,
  className,
  buttonClassName,
  activeClassName,
  inactiveClassName,
}: SegmentedTabsProps<T>) {
  return (
    <div className={className ?? standingsTheme.segmentedTabs}>
      {items.map((item) => (
        <TabButton
          key={item.value}
          active={value === item.value}
          onClick={() => onChange(item.value)}
          disabled={item.disabled}
          className={buttonClassName ?? standingsTheme.segmentedTabButton}
          activeClassName={activeClassName}
          inactiveClassName={inactiveClassName}
        >
          {item.label}
        </TabButton>
      ))}
    </div>
  );
}
