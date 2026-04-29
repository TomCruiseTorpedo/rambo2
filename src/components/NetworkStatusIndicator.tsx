import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wifi, WifiOff } from 'lucide-react';
import { NetworkMonitor } from '@/utils/errorHandling';

export const NetworkStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(NetworkMonitor.getStatus());
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  const [showOnlineAlert, setShowOnlineAlert] = useState(false);

  useEffect(() => {
    // Initialize network monitor
    NetworkMonitor.init();

    const unsubscribe = NetworkMonitor.addListener((online) => {
      setIsOnline(online);
      
      if (!online) {
        setShowOfflineAlert(true);
        setShowOnlineAlert(false);
      } else {
        setShowOfflineAlert(false);
        setShowOnlineAlert(true);
        
        // Hide the "back online" message after 5 seconds
        setTimeout(() => {
          setShowOnlineAlert(false);
        }, 5000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!showOfflineAlert && !showOnlineAlert) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top">
      {showOfflineAlert && (
        <Alert variant="destructive" className="shadow-lg">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <strong>No Internet Connection</strong>
            <p className="text-sm mt-1">
              You're offline. Some features may not work until your connection is restored.
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {showOnlineAlert && (
        <Alert className="shadow-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Back Online</strong>
            <p className="text-sm mt-1">
              Your internet connection has been restored.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
