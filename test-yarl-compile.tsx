import React from 'react';
import Lightbox, { IconButton } from "yet-another-react-lightbox";
import { Sparkles } from "lucide-react";

export function Test() {
  return (
    <Lightbox 
      slides={[]} 
      open={true} 
      close={() => {}} 
      toolbar={{ 
        buttons: [
          <IconButton key="ai" label="AI Analyze" icon={Sparkles} onClick={() => {}} />,
          "zoom", "close"
        ]
      }}
    />
  );
}
