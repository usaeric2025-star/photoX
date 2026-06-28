import React from 'react';

export function LightboxStyles({ hasThumbnails }: { hasThumbnails: boolean }) {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      :root { --rlbx-z: 10000; }
      .rlbx-wrapper { opacity: 0; animation: rlbx-fade-in 0.2s ease-out forwards; }
      @keyframes rlbx-fade-in { to { opacity: 1; } }
      .rlbx-overlay {
        background-color: rgba(0, 0, 0, 0.9) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
      }
      .rlbx-image {
        border-radius: 4px !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
        transition: none !important;
      }
      .rlbx-nav { z-index: 10015 !important; }
      .rlbx-image-area { margin-bottom: ${hasThumbnails ? '96px' : '0px'} !important; }
      .rlbx-thumbnails {
        display: flex !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 10010 !important;
        background: rgba(0, 0, 0, 0.9) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
        height: 84px !important;
        padding: 0.5rem 0.875rem !important;
        box-sizing: border-box !important;
        align-items: center !important;
        gap: 0.375rem !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
      }
      .rlbx-thumb {
        flex-shrink: 0 !important;
        width: 3.5rem !important;
        height: 3.5rem !important;
        border-radius: 4px !important;
        overflow: hidden !important;
        border: 2px solid transparent !important;
        opacity: 0.5 !important;
        transition: all 0.15s ease-out !important;
        background: rgba(255, 255, 255, 0.06) !important;
        padding: 0 !important;
        cursor: pointer !important;
        transform: scale(0.92) !important;
      }
      .rlbx-thumb img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        display: block !important;
        pointer-events: none !important;
      }
      .rlbx-thumb:hover {
        opacity: 0.85 !important;
        transform: scale(1.02) !important;
      }
      .rlbx-thumb--active {
        border-color: #fff !important;
        opacity: 1 !important;
        transform: scale(1.08) !important;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5) !important;
      }
      .rlbx-slide {
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out !important;
      }
      .rlbx-slider {
        transition: transform 0.3s ease-in-out !important;
      }
    `}} />
  );
}
