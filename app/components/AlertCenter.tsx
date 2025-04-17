'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  additionalData?: string;
  isRead: boolean;
  createdAt: string;
}

export default function AlertCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAlerts();
    
    // Set up polling for alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    
    // Check for mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Add click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/alerts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const data = await response.json();
      setAlerts(data.alerts);
      
      // Count unread alerts
      const unread = data.alerts.filter((alert: Alert) => !alert.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/read`, {
        method: 'PUT',
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark alert as read');
      }
      
      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, isRead: true } : alert
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Failed to mark alert as read');
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to dismiss alert');
      }
      
      // Update local state
      const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
      setAlerts(updatedAlerts);
      
      // Update unread count if needed
      const alertToRemove = alerts.find(alert => alert.id === alertId);
      if (alertToRemove && !alertToRemove.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast.error('Failed to dismiss alert');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
        aria-label="Open alerts"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className={`absolute ${isMobile ? 'top-full left-0 mt-2' : 'top-0 left-full ml-2'} w-72 sm:w-80 bg-white rounded-lg shadow-xl z-50 overflow-hidden`}>
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-medium">Notifikasi</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p>Loading alerts...</p>
              </div>
            ) : alerts.length > 0 ? (
              <div className="divide-y">
                {alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    className={`p-3 transition-colors ${!alert.isRead ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                    onClick={() => markAsRead(alert.id)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm">
                        {alert.title}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-1">
                      {alert.message}
                    </p>
                    
                    {alert.type === 'UNUSUAL_SPENDING' && alert.additionalData && (
                      <div className="mt-1 text-xs bg-gray-100 p-2 rounded">
                        <RecommendationDisplay data={alert.additionalData} />
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <p>🎉 Tidak ada notifikasi saat ini!</p>
              </div>
            )}
          </div>
          
          {alerts.length > 0 && (
            <div className="p-2 border-t text-center">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationDisplay({ data }: { data: string }) {
  try {
    const parsed = JSON.parse(data);
    return (
      <div>
        <p><strong>Rekomendasi:</strong> {parsed.recommendation}</p>
      </div>
    );
  } catch {
    return null;
  }
} 