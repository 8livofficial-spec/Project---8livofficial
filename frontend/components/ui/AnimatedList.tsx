'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type MouseEventHandler,
  type UIEvent
} from 'react';
import { motion, useInView } from 'motion/react';

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  index: number;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -30px 0px' });

  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.28, delay: Math.min(delay, 0.2), ease: [0.25, 1, 0.5, 1] }}
      className="mb-3 cursor-pointer will-change-transform"
    >
      {children}
    </motion.div>
  );
};

export interface AnimatedListProps {
  items?: string[];
  onItemSelect?: (item: string, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  selectedIndex?: number;
  renderItem?: (item: string, index: number, isSelected: boolean) => ReactNode;
  gradientColor?: string;
}

const AnimatedList: React.FC<AnimatedListProps> = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = 0,
  selectedIndex: propSelectedIndex,
  renderItem,
  gradientColor = '#FAFAF9'
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState<number>(initialSelectedIndex);
  const isControlled = propSelectedIndex !== undefined;
  const activeIndex = isControlled ? propSelectedIndex : internalIndex;

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  const handleItemClick = useCallback(
    (item: string, index: number) => {
      if (!isControlled) {
        setInternalIndex(index);
      }
      onItemSelect?.(item, index);
    },
    [isControlled, onItemSelect]
  );

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLDivElement;
    setTopGradientOpacity(Math.min(scrollTop / 40, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 40, 1));
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        const current = activeIndexRef.current;
        const next = Math.min(current + 1, items.length - 1);
        if (!isControlled) {
          setInternalIndex(next);
        }
        onItemSelect?.(items[next], next);
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        const current = activeIndexRef.current;
        const next = Math.max(current - 1, 0);
        if (!isControlled) {
          setInternalIndex(next);
        }
        onItemSelect?.(items[next], next);
      } else if (e.key === 'Enter') {
        const current = activeIndexRef.current;
        if (current >= 0 && current < items.length) {
          e.preventDefault();
          onItemSelect?.(items[current], current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, isControlled, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || activeIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
    if (selectedItem) {
      const extraMargin = 40;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: Math.max(0, itemTop - extraMargin), behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth'
        });
      }
    }
    setKeyboardNav(false);
  }, [activeIndex, keyboardNav]);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={listRef}
        className={`max-h-none overflow-visible lg:max-h-[540px] lg:overflow-y-auto px-1 py-1 sm:p-2 overscroll-contain transition-all ${
          displayScrollbar
            ? '[&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400'
            : 'scrollbar-hide'
        }`}
        onScroll={handleScroll}
        style={{
          scrollbarWidth: displayScrollbar ? 'thin' : 'none',
          scrollbarColor: '#CBD5E1 transparent'
        }}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            delay={index * 0.04}
            index={index}
            onClick={() => handleItemClick(item, index)}
          >
            {renderItem ? (
              renderItem(item, index, activeIndex === index)
            ) : (
              <div
                className={`p-4 bg-white border border-slate-200/80 rounded-2xl transition-all duration-200 ${
                  activeIndex === index
                    ? 'border-[#00A884] shadow-md ring-2 ring-[#00A884]/20'
                    : 'hover:border-slate-300 hover:shadow-xs'
                } ${itemClassName}`}
              >
                <p className="text-slate-900 font-medium m-0">{item}</p>
              </div>
            )}
          </AnimatedItem>
        ))}
      </div>

      {showGradients && (
        <>
          <div
            className="hidden lg:block absolute top-0 left-0 right-0 h-[36px] pointer-events-none transition-opacity duration-200 ease-out"
            style={{
              opacity: topGradientOpacity,
              background: `linear-gradient(to bottom, ${gradientColor}, transparent)`
            }}
          />
          <div
            className="hidden lg:block absolute bottom-0 left-0 right-0 h-[48px] pointer-events-none transition-opacity duration-200 ease-out"
            style={{
              opacity: bottomGradientOpacity,
              background: `linear-gradient(to top, ${gradientColor}, transparent)`
            }}
          />
        </>
      )}
    </div>
  );
};

export default AnimatedList;
