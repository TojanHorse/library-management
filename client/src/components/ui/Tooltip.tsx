import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({ 
  children, 
  content, 
  position = 'top', 
  delay = 300,
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      updatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    let x = triggerRect.left + scrollX;
    let y = triggerRect.top + scrollY;

    switch (position) {
      case 'top':
        x += triggerRect.width / 2;
        y -= 8;
        break;
      case 'bottom':
        x += triggerRect.width / 2;
        y += triggerRect.height + 8;
        break;
      case 'left':
        x -= 8;
        y += triggerRect.height / 2;
        break;
      case 'right':
        x += triggerRect.width + 8;
        y += triggerRect.height / 2;
        break;
    }

    setTooltipPosition({ x, y });
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, position]);

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible]);

  const getTooltipClasses = () => {
    const baseClasses = `
      fixed z-50 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm rounded-lg shadow-lg
      pointer-events-none transition-opacity duration-200 max-w-xs
    `;
    
    const positionClasses = {
      top: 'transform -translate-x-1/2 -translate-y-full',
      bottom: 'transform -translate-x-1/2',
      left: 'transform -translate-x-full -translate-y-1/2',
      right: 'transform -translate-y-1/2'
    };

    return `${baseClasses} ${positionClasses[position]} ${isVisible ? 'opacity-100' : 'opacity-0'} ${className}`;
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45';
    
    const arrowPositions = {
      top: 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2',
      bottom: 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      left: 'right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2',
      right: 'left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2'
    };

    return `${baseClasses} ${arrowPositions[position]}`;
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={getTooltipClasses()}
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <div className={getArrowClasses()}></div>
          {content}
        </div>
      )}
    </>
  );
}
