import { useState, useEffect } from 'react';

export type DeviceType = 'touch' | 'mouse' | 'unknown';

/**
 * Hook to detect whether the user is primarily using touch or mouse input.
 * Updates dynamically if the user switches input methods.
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('unknown');

  useEffect(() => {
    // Initial detection based on device capabilities
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    // Set initial device type
    if (hasCoarsePointer && !hasFinePointer) {
      // Pure touch device (phone/tablet without mouse)
      setDeviceType('touch');
    } else if (hasFinePointer && !hasTouch) {
      // Pure mouse/trackpad device
      setDeviceType('mouse');
    } else if (hasFinePointer) {
      // Has fine pointer (likely desktop/laptop, even if touch-capable)
      setDeviceType('mouse');
    } else if (hasTouch) {
      // Has touch but no fine pointer
      setDeviceType('touch');
    } else {
      // Default to mouse for unknown
      setDeviceType('mouse');
    }

    // Listen for actual input events to refine detection
    let lastInputType: DeviceType = deviceType;

    const handleTouchStart = () => {
      if (lastInputType !== 'touch') {
        lastInputType = 'touch';
        setDeviceType('touch');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Only count as mouse if it's a real mouse movement (not touch-generated)
      // Touch events don't set movementX/Y, and sourceCapabilities can help too
      if (e.movementX !== 0 || e.movementY !== 0) {
        if (lastInputType !== 'mouse') {
          lastInputType = 'mouse';
          setDeviceType('mouse');
        }
      }
    };

    // Add listeners
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return deviceType;
}

/**
 * Returns true if the device is primarily touch-based
 */
export function useIsTouchDevice(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'touch';
}

/**
 * Returns true if the device is primarily mouse-based
 */
export function useIsMouseDevice(): boolean {
  const deviceType = useDeviceType();
  return deviceType === 'mouse' || deviceType === 'unknown';
}
