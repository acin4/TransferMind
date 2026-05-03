import type { ReactNode } from "react";
import TabButton from "./TabButton";

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
    <div className={className}>
      {items.map((item) => (
        <TabButton
          key={item.value}
          active={value === item.value}
          onClick={() => onChange(item.value)}
          disabled={item.disabled}
          className={buttonClassName}
          activeClassName={activeClassName}
          inactiveClassName={inactiveClassName}
        >
          {item.label}
        </TabButton>
      ))}
    </div>
  );
}
