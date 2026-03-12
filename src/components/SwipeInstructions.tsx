import React from 'react';
import { useDeviceType, type DeviceType } from '../hooks/useDeviceType';

interface SwipeInstructionsProps {
  deviceTypeOverride?: DeviceType;
}

export const SwipeInstructions: React.FC<SwipeInstructionsProps> = ({
  deviceTypeOverride,
}) => {
  const detectedDeviceType = useDeviceType();
  const deviceType = deviceTypeOverride ?? detectedDeviceType;

  const isTouchDevice = deviceType === 'touch';

  // Dynamic instruction text based on device type
  const disagreeText = isTouchDevice
    ? 'Swipe left to disagree'
    : 'Click Disagree or press ←';

  const agreeText = isTouchDevice
    ? 'Swipe right to agree'
    : 'Click Agree or press →';

  return (
    <div className="swipe-instructions">
      {/* Disagree (Left) */}
      <div className="swipe-instruction-item">
        <svg
          className="swipe-arrow swipe-arrow-left"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M12 4L6 10L12 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="swipe-label">{disagreeText}</span>
      </div>

      {/* Agree (Right) */}
      <div className="swipe-instruction-item">
        <span className="swipe-label">{agreeText}</span>
        <svg
          className="swipe-arrow swipe-arrow-right"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M8 4L14 10L8 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
