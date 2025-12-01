'use client';

import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  onClick,
  className,
  showBadge = true,
  size = 'md'
}) => {
  const { unreadCount, isConnected } = useNotifications();
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate bell when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative p-2 rounded-full hover:bg-gray-100 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} sin leer)` : ''}`}
    >
      <Bell
        className={cn(
          sizeClasses[size],
          'transition-transform duration-200',
          isAnimating && 'animate-bounce',
          !isConnected && 'text-gray-400'
        )}
      />

      {/* Connection indicator */}
      {!isConnected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}

      {/* Notification badge */}
      {showBadge && unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Pulse animation for new notifications */}
      {unreadCount > 0 && (
        <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" />
      )}
    </button>
  );
};

export default NotificationBell;